import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

// The workout Live Activity (modules/live-activity · ActivityKit). Every call
// is safe: without the native module (Android, an old build), with Live
// Activities off in Ajustes or on an error, nothing happens. Calls run one
// after another so an update never overtakes the start.

export type LiveActivityPhase = 'rest' | 'exercise' | 'done';

export type LiveActivityState = {
  phase: LiveActivityPhase;
  // Epoch ms of the end of the rest (the system counts down to it).
  restEndsAt: number | null;
  paused: boolean;
  pausedRemainingSec: number | null;
  exerciseName: string;
  scheme: string;
  progress: string;
};

export type LiveActivityStart = { routineName: string; sessionId: string; workoutId: string };

type NativeLiveActivity = {
  areEnabled(): boolean;
  start(start: LiveActivityStart, state: LiveActivityState): Promise<string | null>;
  update(id: string, state: LiveActivityState): Promise<void>;
  end(id: string): Promise<void>;
  endAll(): Promise<void>;
};

const native =
  Platform.OS === 'ios' ? requireOptionalNativeModule<NativeLiveActivity>('LiveActivity') : null;

function log(message: string): void {
  if (__DEV__) {
    console.log(`[LA] ${message}`);
  }
}

let chain: Promise<unknown> = Promise.resolve();
function serial<T>(task: () => Promise<T>, fallback: T): Promise<T> {
  const run = chain.then(task, task).catch(() => fallback);
  chain = run;
  return run;
}

export function liveActivitiesEnabled(): boolean {
  try {
    return Boolean(native?.areEnabled());
  } catch {
    return false;
  }
}

// The session whose screen is open (null: none). With none, any activity
// still on screen is an orphan.
let liveSession: string | null = null;
export function setLiveSession(sessionId: string | null): void {
  liveSession = sessionId;
}
export function clearLiveSession(sessionId: string): void {
  if (liveSession === sessionId) {
    liveSession = null;
  }
}
export function hasLiveSession(): boolean {
  return liveSession !== null;
}

export function endAllLiveActivities(): Promise<void> {
  if (!native) {
    return Promise.resolve();
  }
  log('endAll');
  return serial(() => native.endAll(), undefined);
}

// Once per launch, before anything starts: activities left by a killed app.
let cleaned: Promise<void> | null = null;
export function endOrphanLiveActivities(): Promise<void> {
  if (!cleaned) {
    cleaned = endAllLiveActivities();
  }
  return cleaned;
}

export async function startLiveActivity(
  start: LiveActivityStart,
  state: LiveActivityState,
): Promise<string | null> {
  if (!native) {
    return null;
  }
  await endOrphanLiveActivities();
  const id = await serial(
    () => (liveActivitiesEnabled() ? native.start(start, state) : Promise.resolve(null)),
    null,
  );
  log(`start session=${start.sessionId} → ${id ?? 'sin actividad'}`);
  return id;
}

export function updateLiveActivity(id: string, state: LiveActivityState): Promise<void> {
  if (!native) {
    return Promise.resolve();
  }
  log(`update ${id} ${state.phase}${state.paused ? ' (pausa)' : ''}`);
  return serial(() => native.update(id, state), undefined);
}

export function endLiveActivity(id: string): Promise<void> {
  if (!native) {
    return Promise.resolve();
  }
  log(`end ${id}`);
  return serial(() => native.end(id), undefined).then(() => log(`ended ${id}`));
}
