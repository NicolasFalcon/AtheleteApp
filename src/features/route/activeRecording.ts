import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TrackerState } from '@app/features/route/routeTracker';
import type { PlannedRoute, RouteVisibility } from '@app/features/route/routeTypes';

// The recording in progress, kept on the phone so that a closed app (system,
// crash, battery) does not lose the outing. Written from the recording screen
// at most every few seconds and on every pause / resume / background; read
// when the app opens (RouteRecoveryGate).

export type ActiveRecording = {
  version: 1;
  userId: string;
  // Idempotency key of the save, fixed when the outing starts.
  clientId: string;
  savedAt: number;
  visibility: RouteVisibility;
  hideEndpoints: boolean;
  plan: PlannedRoute | null;
  state: TrackerState;
};

export type KeyValueStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
  removeItem(key: string): Promise<unknown>;
};

export const recordingKey = (userId: string) => `athelete.route.recording.v1:${userId}`;

// What a stored string must look like to be trusted; anything else is ignored.
export function parseRecording(raw: string | null, userId: string): ActiveRecording | null {
  if (!raw) {
    return null;
  }
  try {
    const value = JSON.parse(raw) as Partial<ActiveRecording> | null;
    const state = value?.state;
    if (
      !value ||
      value.version !== 1 ||
      value.userId !== userId ||
      typeof value.clientId !== 'string' ||
      !state ||
      (state.status !== 'recording' && state.status !== 'paused') ||
      !Array.isArray(state.points) ||
      !Array.isArray(state.pauses)
    ) {
      return null;
    }
    return value as ActiveRecording;
  } catch {
    return null;
  }
}

export async function loadRecording(
  userId: string,
  store: KeyValueStore = AsyncStorage,
): Promise<ActiveRecording | null> {
  try {
    return parseRecording(await store.getItem(recordingKey(userId)), userId);
  } catch {
    return null;
  }
}

export async function saveRecording(
  recording: ActiveRecording,
  store: KeyValueStore = AsyncStorage,
): Promise<void> {
  try {
    await store.setItem(recordingKey(recording.userId), JSON.stringify(recording));
  } catch {
    // Without storage the recording only lives in memory.
  }
}

export async function clearRecording(
  userId: string,
  store: KeyValueStore = AsyncStorage,
): Promise<void> {
  try {
    await store.removeItem(recordingKey(userId));
  } catch {
    // Nothing to clean.
  }
}

export const PERSIST_INTERVAL_MS = 5000;

type Meta = Omit<ActiveRecording, 'version' | 'savedAt' | 'state'>;

// Throttled writer. `update` is called on every state change: a change of
// status (pause, resume, auto-pause…) is written at once, point-by-point
// changes at most every PERSIST_INTERVAL_MS (the last one always gets written,
// trailing). `flush` writes the latest state now (app going to background).
export function createRecordingPersister(
  meta: Meta,
  options: {
    write?: (recording: ActiveRecording) => Promise<void>;
    now?: () => number;
    intervalMs?: number;
  } = {},
) {
  const write = options.write ?? saveRecording;
  const now = options.now ?? Date.now;
  const interval = options.intervalMs ?? PERSIST_INTERVAL_MS;
  let latest: TrackerState | null = null;
  let lastWrittenStatus: string | null = null;
  let lastWrittenPauses = -1;
  let lastWriteAt = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;

  const clearTimer = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const writeNow = () => {
    clearTimer();
    if (closed || !latest || (latest.status !== 'recording' && latest.status !== 'paused')) {
      return Promise.resolve();
    }
    lastWriteAt = now();
    lastWrittenStatus = latest.status;
    lastWrittenPauses = latest.pauses.length;
    return write({ ...meta, version: 1, savedAt: lastWriteAt, state: latest });
  };

  return {
    update(state: TrackerState) {
      latest = state;
      if (closed) {
        return;
      }
      const changed = state.status !== lastWrittenStatus || state.pauses.length !== lastWrittenPauses;
      if (changed) {
        writeNow().catch(() => undefined);
        return;
      }
      if (timer) {
        return;
      }
      const wait = Math.max(0, lastWriteAt + interval - now());
      timer = setTimeout(() => {
        writeNow().catch(() => undefined);
      }, wait);
    },
    flush() {
      return writeNow();
    },
    // After the outing ends or is discarded: nothing else may be written.
    close() {
      closed = true;
      clearTimer();
    },
  };
}
