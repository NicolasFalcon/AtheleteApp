import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PlayError,
  submitPlayRound,
  type PlayAnswerPayload,
  type PlayResult,
} from '@app/services/supabase/play';

// Finished Play rounds waiting for the server (§28.6.1 · sin conexión). A
// round is written here before it is sent, so closing the app never loses
// it; it leaves the queue when the server answers (or rejects it for a reason
// other than the network). Submitting is idempotent by round id, so sending
// the same round twice is safe. `p_finished_at` is the device time when the
// round ended: the server counts it for that day.

export type QueuedRound = {
  roundId: string;
  answers: PlayAnswerPayload[];
  finishedAt: string;
  tz: string;
  queuedAt: string;
};

const keyOf = (userId: string) => `@athelete/play-queue:${userId}`;

// No connection, or the session needs a refresh: the round waits in the queue.
export function isRetryable(error: PlayError): boolean {
  return error.code === 'offline' || error.code === 'unauthorized';
}

type Listener = (roundId: string, outcome: { result: PlayResult } | { error: PlayError }) => void;
const listeners = new Set<Listener>();

export function onQueuedOutcome(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function read(userId: string): Promise<QueuedRound[]> {
  try {
    const raw = await AsyncStorage.getItem(keyOf(userId));
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as QueuedRound[]) : [];
  } catch {
    return [];
  }
}

async function write(userId: string, items: QueuedRound[]): Promise<void> {
  await AsyncStorage.setItem(keyOf(userId), JSON.stringify(items));
}

// Writes are chained so two screens never overwrite each other's queue.
let chain: Promise<unknown> = Promise.resolve();
function serial<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task, task);
  chain = run.catch(() => undefined);
  return run;
}

export function enqueueRound(userId: string, item: QueuedRound): Promise<void> {
  return serial(async () => {
    const items = await read(userId);
    if (!items.some(existing => existing.roundId === item.roundId)) {
      await write(userId, [...items, item]);
    }
  });
}

function removeRound(userId: string, roundId: string): Promise<void> {
  return serial(async () => {
    const items = await read(userId);
    await write(userId, items.filter(item => item.roundId !== roundId));
  });
}

// Sends one round and keeps the queue in step: out on an answer or a
// rejection, kept when the network failed.
export async function sendRound(userId: string, item: QueuedRound): Promise<PlayResult> {
  try {
    const result = await submitPlayRound(item);
    await removeRound(userId, item.roundId);
    listeners.forEach(listener => listener(item.roundId, { result }));
    return result;
  } catch (error) {
    const failure = error instanceof PlayError ? error : new PlayError('unknown', String(error));
    if (!isRetryable(failure)) {
      await removeRound(userId, item.roundId);
      listeners.forEach(listener => listener(item.roundId, { error: failure }));
    }
    throw failure;
  }
}

let flushing: Promise<{ sent: number; stoppedByNetwork: boolean }> | null = null;

// Replays the queue in order; stops at the first network failure. Only one
// replay runs at a time.
export function flushPlayQueue(userId: string): Promise<{ sent: number; stoppedByNetwork: boolean }> {
  if (flushing) {
    return flushing;
  }
  flushing = (async () => {
    let sent = 0;
    for (const item of await read(userId)) {
      try {
        await sendRound(userId, item);
        sent += 1;
      } catch (error) {
        if (error instanceof PlayError && isRetryable(error)) {
          return { sent, stoppedByNetwork: true };
        }
      }
    }
    return { sent, stoppedByNetwork: false };
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}
