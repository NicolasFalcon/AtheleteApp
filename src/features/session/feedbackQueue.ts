import { useEffect } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { nextBackoffMs } from '@app/features/session/sessionOutbox';
import { useAuth } from '@app/hooks/useAuth';
import {
  FeedbackError,
  logSessionFeedback,
  rateSession,
  type SessionFeedbackWrite,
} from '@app/services/supabase/sessionFeedback';

// Session feedback waiting for the server (sfb-1). Every answer is written
// here first and sent at once, so closing the app never loses it. It stays
// queued without connection, with an expired session token, or while the
// session is not on the server yet (`session_not_found`), and is sent again
// when the app starts, comes back to the foreground or on a backoff timer.
// Answers carry a client id (the server keeps one row per id); the rating of
// a session replaces its earlier one in the queue (rate_session overwrites).
// Items older than a week are dropped (e.g. a discarded session).

export type QueuedFeedback =
  | { type: 'feedback'; queuedAt: string; write: SessionFeedbackWrite }
  | { type: 'rating'; queuedAt: string; sessionId: string; rating: number; note: string | null };

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const keyOf = (userId: string) => `@athelete/session-feedback-v1:${userId}`;
const idOf = (item: QueuedFeedback) =>
  item.type === 'feedback' ? `f:${item.write.clientId}` : `r:${item.sessionId}`;

export function isRetryableFeedback(error: unknown): boolean {
  return (
    error instanceof FeedbackError &&
    (error.code === 'offline' || error.code === 'unauthorized' || error.code === 'session_not_found')
  );
}

async function read(userId: string): Promise<QueuedFeedback[]> {
  try {
    const raw = await AsyncStorage.getItem(keyOf(userId));
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as QueuedFeedback[]) : [];
  } catch {
    return [];
  }
}

async function write(userId: string, items: QueuedFeedback[]): Promise<void> {
  await AsyncStorage.setItem(keyOf(userId), JSON.stringify(items));
}

// Reads and writes of the queue never overlap.
let chain: Promise<unknown> = Promise.resolve();
function serial<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task, task);
  chain = run.catch(() => undefined);
  return run;
}

async function send(item: QueuedFeedback): Promise<void> {
  if (item.type === 'feedback') {
    await logSessionFeedback(item.write);
  } else {
    await rateSession({ sessionId: item.sessionId, rating: item.rating, note: item.note });
  }
}

let flushing: Promise<{ stoppedByNetwork: boolean }> | null = null;

// Sends the queue in order. Retryable failures keep the item (and stop at a
// network failure); any other answer from the server drops it.
export function flushFeedbackQueue(userId: string): Promise<{ stoppedByNetwork: boolean }> {
  if (flushing) {
    return flushing;
  }
  flushing = (async () => {
    const now = Date.now();
    let stoppedByNetwork = false;
    for (const item of await serial(() => read(userId))) {
      if (now - Date.parse(item.queuedAt) > MAX_AGE_MS) {
        await serial(async () => write(userId, (await read(userId)).filter(other => idOf(other) !== idOf(item))));
        continue;
      }
      try {
        await send(item);
      } catch (error) {
        if (isRetryableFeedback(error)) {
          stoppedByNetwork = true;
          if (error instanceof FeedbackError && error.code !== 'session_not_found') {
            break;
          }
          continue;
        }
        console.warn('[feedback] Descartado por el servidor:', error);
      }
      // Sent, or refused for good: out of the queue (unless replaced since).
      await serial(async () =>
        write(
          userId,
          (await read(userId)).filter(other => idOf(other) !== idOf(item) || other.queuedAt !== item.queuedAt),
        ),
      );
    }
    return { stoppedByNetwork };
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

export function enqueueFeedback(userId: string, item: QueuedFeedback): Promise<void> {
  return serial(async () => {
    const items = (await read(userId)).filter(other => idOf(other) !== idOf(item));
    await write(userId, [...items, item]);
  }).then(() => {
    // After a replay already running (it read the queue before this item).
    (flushing ?? Promise.resolve())
      .catch(() => undefined)
      .then(() => flushFeedbackQueue(userId))
      .catch(() => undefined);
  });
}

// A session left without saving: its answers have nowhere to go.
export function purgeSessionFeedback(userId: string, sessionId: string): Promise<void> {
  return serial(async () => {
    const items = await read(userId);
    await write(
      userId,
      items.filter(item => (item.type === 'feedback' ? item.write.sessionId : item.sessionId) !== sessionId),
    );
  });
}

export function feedbackClientId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, token => {
    const random = Math.floor(Math.random() * 16);
    const value = token === 'x' ? random : 8 + (random % 4);
    return value.toString(16);
  });
}

// Global replay: with a session at launch, back in the foreground and on a
// backoff timer while something stays queued (same approach as the session
// outbox; NetInfo is not installed).
export function useSessionFeedbackSync(): void {
  const { session } = useAuth();
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) {
      return undefined;
    }
    let cancelled = false;
    let failures = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const sync = async () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      const run = await flushFeedbackQueue(userId).catch(() => ({ stoppedByNetwork: true }));
      if (cancelled) {
        return;
      }
      if (run.stoppedByNetwork) {
        failures += 1;
        timer = setTimeout(sync, nextBackoffMs(failures));
      } else {
        failures = 0;
      }
    };

    sync();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        failures = 0;
        sync();
      }
    });
    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
      subscription.remove();
    };
  }, [userId]);
}
