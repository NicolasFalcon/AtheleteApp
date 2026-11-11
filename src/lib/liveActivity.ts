import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

// The workout Live Activity (modules/live-activity · ActivityKit). Every call
// is safe: without the native module (Android, an old build), with Live
// Activities off in Ajustes or on an error, nothing happens. Calls run one
// after another so an update never overtakes the start.

export type LiveActivityPhase = 'rest' | 'exercise' | 'done';

// Texts of the activity's buttons and hints, in the athlete's language.
export type LiveActivityLabels = {
  skip: string;
  setDone: string;
  // The link that opens the app on the set (no weight to log from here).
  chooseInApp: string;
  // The link of "Sesión completa".
  openApp: string;
  doneHint: string;
  pausedHint: string;
};

// What the button of the activity does (iOS 17+; before, none):
//   skipRest      "Saltar" during a rest;
//   completeSet   "Serie hecha ✓" on the set in course;
//   chooseInApp   no weight to log from here: a link that opens the app;
//   openApp       "Sesión completa": a link that opens the app;
//   none          paused.
export type LiveActivityButton = 'none' | 'skipRest' | 'completeSet' | 'chooseInApp' | 'openApp';

export type LiveActivityState = {
  phase: LiveActivityPhase;
  // Epoch ms of the end of the rest (the system counts down to it).
  restEndsAt: number | null;
  paused: boolean;
  pausedRemainingSec: number | null;
  exerciseName: string;
  scheme: string;
  progress: string;
  // Everything the activity writes is composed here (ES / EN) and shown as is.
  headline: string;
  // "Siguiente: " before the exercise during a rest.
  prefix: string;
  // The compact Dynamic Island text outside a rest ("Serie 2").
  compact: string;
  action: LiveActivityButton;
  // Why there is no "Serie hecha" ("Elige tu peso en la app").
  hint: string;
  // The set the buttons act on (the cursor of the runner).
  position: number;
  setIndex: number;
  labels: LiveActivityLabels;
  // The set that follows (the one the cursor points at; during a rest, the
  // one coming after it). When the rest ends the activity turns stale (its
  // staleDate is the end of the rest) and the widget draws the set in course
  // from these, with no update from the app: "Ahora", "Serie 2 de 3 · 10 reps
  // × 40 kg", "Serie 2", and the button (`setAction`: completeSet when it can
  // be logged without opening the app, chooseInApp when it cannot, none).
  nowHeadline: string;
  setScheme: string;
  setCompact: string;
  setAction: LiveActivityButton;
};

export type LiveActivityStart = { routineName: string; sessionId: string; workoutId: string };

type NativeLiveActivity = {
  areEnabled(): boolean;
  start(start: LiveActivityStart, state: LiveActivityState): Promise<string | null>;
  update(id: string, state: LiveActivityState, endState: LiveActivityState | null): Promise<void>;
  end(id: string): Promise<void>;
  endAll(): Promise<void>;
  pendingActions(): Promise<LiveActivityButtonAction[]>;
  ackAction(id: string): Promise<void>;
  addListener(
    event: 'onAction',
    listener: (action: LiveActivityButtonAction) => void,
  ): { remove: () => void };
};

// A tap on a button of the activity (iOS 17+), as the native side hands it
// over: kept in a queue until the runner closes it with ackLiveActivityAction.
export type LiveActivityButtonAction = {
  id: string;
  kind: 'completeSet' | 'skipRest';
  sessionId: string;
  position: number;
  setIndex: number;
  // Epoch ms of the tap.
  at: number;
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

// `endState`: what the activity takes by itself when the running rest reaches
// zero (the native rest cues apply it, with the app in the background).
export function updateLiveActivity(
  id: string,
  state: LiveActivityState,
  endState: LiveActivityState | null = null,
): Promise<void> {
  if (!native) {
    return Promise.resolve();
  }
  log(`update ${id} ${state.phase}${state.paused ? ' (pausa)' : ''}`);
  return serial(() => native.update(id, state, endState), undefined);
}

// ── Buttons of the activity ────────────────────────────────────────────────
// Taps arrive as events while JS runs; the ones that came while it did not
// (a killed app woken by the tap) wait in the native queue.
export function subscribeLiveActivityActions(
  listener: (action: LiveActivityButtonAction) => void,
): () => void {
  if (!native || typeof native.addListener !== 'function') {
    return () => undefined;
  }
  try {
    const subscription = native.addListener('onAction', listener);
    return () => subscription.remove();
  } catch {
    return () => undefined;
  }
}

export async function pendingLiveActivityActions(): Promise<LiveActivityButtonAction[]> {
  if (!native || typeof native.pendingActions !== 'function') {
    return [];
  }
  try {
    const actions = await native.pendingActions();
    return Array.isArray(actions) ? [...actions].sort((a, b) => a.at - b.at) : [];
  } catch {
    return [];
  }
}

// Closes an action (applied or ignored): it leaves the queue for good.
export async function ackLiveActivityAction(id: string): Promise<void> {
  if (!native || typeof native.ackAction !== 'function') {
    return;
  }
  try {
    await native.ackAction(id);
  } catch {
    // The queue drops it on its own once it is old.
  }
}

export function endLiveActivity(id: string): Promise<void> {
  if (!native) {
    return Promise.resolve();
  }
  log(`end ${id}`);
  return serial(() => native.end(id), undefined).then(() => log(`ended ${id}`));
}
