import {
  INITIAL_DEVIATION,
  activeMs,
  elevationGain,
  haversine,
  nearestOnRoute,
  paceSecPerKm,
  speedKmh,
  updateDeviation,
  type DeviationState,
  type PauseInterval,
} from '@app/features/route/routeGeo';
import type { LatLng, RoutePoint, RouteSport } from '@app/features/route/routeTypes';

// Pure state machine of an activity in progress. It knows nothing about GPS or
// timers: `useRouteTracker` feeds it fixes and ticks from a `LocationSource`
// (RealLocationSource over expo-location).

export type TrackerStatus = 'ready' | 'recording' | 'paused' | 'finished';

export type TrackerState = {
  status: TrackerStatus;
  sport: RouteSport;
  startedAt: number | null;
  endedAt: number | null;
  pauses: PauseInterval[];
  points: RoutePoint[]; // accepted fixes, in order
  distanceM: number;
  lastFixAt: number | null;
  now: number;
  // The planned route being followed (null = free run).
  plan: LatLng[] | null;
  deviation: DeviationState;
  // Metres from the current position to the plan (null without plan or fix).
  planDistanceM: number | null;
  // The person took the location permission away mid-route (the recording is
  // paused and keeps what it has). The pause is always manual (B-07): there
  // is no auto-pause.
  permissionRevoked: boolean;
  // Consecutive fixes dropped as impossible jumps.
  jumpStreak: number;
  // Metres of the planned route covered so far (never goes back).
  planAlongM: number;
};

export type TrackerAction =
  | { type: 'start'; t: number }
  | { type: 'fix'; fix: RoutePoint }
  | { type: 'tick'; t: number }
  | { type: 'pause'; t: number }
  | { type: 'resume'; t: number }
  | { type: 'finish'; t: number }
  // The platform has a recent fix but sent none (standing still).
  | { type: 'alive'; t: number }
  | { type: 'revoked'; t: number };

// ── Fix filters ─────────────────────────────────────────────────────────────
// A fix less accurate than this is ignored.
export const MAX_ACCURACY_M = 50;
// A fix too close to the last accepted point is jitter: it adds no distance
// and the anchor stays, so a real displacement keeps accumulating until it
// passes the threshold (nothing is lost on a straight line).
// Moving, steps shorter than the GPS noise add its zigzag to the distance
// (+5–15 % walking with ~5 m of noise): a step must reach
// max(MOVING_ACCURACY_FACTOR × accuracy, MIN_STEP_M).
export const MIN_STEP_M = 8;
export const MOVING_ACCURACY_FACTOR = 1.5;
// Standing still (implied speed below STATIONARY_SPEED_MS), the GPS wanders
// well beyond its own accuracy over a few minutes: a step must reach
// max(STILL_ACCURACY_FACTOR × accuracy, DRIFT_FLOOR_M).
export const DRIFT_FLOOR_M = 12;
export const STILL_ACCURACY_FACTOR = 2.5;
export const STATIONARY_SPEED_MS = 0.8;
// The server rejects a whole activity whose speed between two points is above
// 12 m/s (running) or 25 m/s (cycling). The client drops such fixes first, with
// 5 % of margin against rounding of times on the server.
export const SERVER_MAX_SPEED_MS: Record<RouteSport, number> = { running: 12, cycling: 25 };
export const SPEED_MARGIN = 0.95;
// If the very first accepted point was a bad fix every later one looks like a
// jump: after this many in a row the first point is replaced.
export const REANCHOR_AFTER_JUMPS = 5;
// No fix for this long while recording = "sin señal GPS".
export const SIGNAL_LOST_MS = 10_000;

// "Ritmo actual" (B-08): the pace of the last CURRENT_WINDOW_SEC seconds or
// CURRENT_WINDOW_M metres, whichever is reached first; below the minimums it
// is not shown yet.
export const CURRENT_WINDOW_SEC = 30;
export const CURRENT_WINDOW_M = 150;
export const CURRENT_MIN_M = 15;
export const CURRENT_MIN_SEC = 5;
// Without a new accepted point for longer than this the person is standing
// still: the window runs to "now" and the pace slows down. Below it, it ends
// at the last point (at walking speed a fix every other one can be held back
// as drift until the next one, which is normal).
export const CURRENT_STALE_MS = 10_000;

export function initialTracker(sport: RouteSport, plan: LatLng[] | null = null): TrackerState {
  return {
    status: 'ready',
    sport,
    startedAt: null,
    endedAt: null,
    pauses: [],
    points: [],
    distanceM: 0,
    lastFixAt: null,
    now: 0,
    plan,
    deviation: INITIAL_DEVIATION,
    planDistanceM: null,
    permissionRevoked: false,
    jumpStreak: 0,
    planAlongM: 0,
  };
}

type FixVerdict =
  | { kind: 'reject' }
  | { kind: 'jump' }
  | { kind: 'jitter' }
  | { kind: 'reanchor' }
  | { kind: 'accept'; step: number };

// The client-side filters, against the last accepted point.
function judgeFix(state: TrackerState, fix: RoutePoint, t: number): FixVerdict {
  if (fix.accuracy !== undefined && fix.accuracy > MAX_ACCURACY_M) {
    return { kind: 'reject' };
  }
  const last = state.points[state.points.length - 1];
  if (!last) {
    return { kind: 'accept', step: 0 };
  }
  const dt = (t - (last.t ?? t)) / 1000;
  if (dt <= 0) {
    return { kind: 'reject' };
  }
  const step = haversine(last, fix);
  const speed = step / dt;
  if (speed > SERVER_MAX_SPEED_MS[state.sport] * SPEED_MARGIN) {
    return state.points.length === 1 && state.jumpStreak + 1 >= REANCHOR_AFTER_JUMPS
      ? { kind: 'reanchor' }
      : { kind: 'jump' };
  }
  const accuracy = fix.accuracy ?? 0;
  const threshold =
    speed < STATIONARY_SPEED_MS
      ? Math.max(STILL_ACCURACY_FACTOR * accuracy, DRIFT_FLOOR_M)
      : Math.max(MOVING_ACCURACY_FACTOR * accuracy, MIN_STEP_M);
  return step < threshold ? { kind: 'jitter' } : { kind: 'accept', step };
}

// How far from the route a fix may be and still count as progress along it.
const PROGRESS_CORRIDOR_M = 100;

function withPlan(state: TrackerState, fix: RoutePoint, t: number) {
  let deviation = state.deviation;
  let planDistanceM: number | null = null;
  let planAlongM = state.planAlongM;
  if (state.plan && state.plan.length > 1) {
    const hit = nearestOnRoute(fix, state.plan);
    if (hit) {
      planDistanceM = hit.distanceM;
      deviation = updateDeviation(state.deviation, state.sport, t, hit.distanceM);
    }
    // Progress is measured on the stretch around where the person already is.
    const ahead = nearestOnRoute(fix, state.plan, {
      fromM: state.planAlongM - 100,
      toM: state.planAlongM + 800,
    });
    if (ahead && ahead.distanceM <= PROGRESS_CORRIDOR_M) {
      planAlongM = Math.max(planAlongM, ahead.along);
    }
  }
  return { deviation, planDistanceM, planAlongM };
}

function acceptFix(state: TrackerState, fix: RoutePoint, t: number, step: number): TrackerState {
  return {
    ...state,
    points: [...state.points, { ...fix, t }],
    distanceM: state.distanceM + step,
    lastFixAt: t,
    now: Math.max(state.now, t),
    jumpStreak: 0,
    ...withPlan(state, fix, t),
  };
}

export function trackerReducer(state: TrackerState, action: TrackerAction): TrackerState {
  switch (action.type) {
    case 'start':
      return state.status === 'ready'
        ? {
            ...state,
            status: 'recording',
            startedAt: action.t,
            now: action.t,
            lastFixAt: action.t,
          }
        : state;

    case 'alive':
      return state.status === 'recording' && action.t > (state.lastFixAt ?? 0)
        ? { ...state, lastFixAt: action.t, now: Math.max(state.now, action.t) }
        : state;

    case 'revoked': {
      const paused = trackerReducer(state, { type: 'pause', t: action.t });
      return { ...paused, permissionRevoked: true };
    }

    case 'tick':
      return state.status === 'recording' || state.status === 'paused'
        ? { ...state, now: action.t }
        : state;

    case 'pause':
      return state.status === 'recording'
        ? {
            ...state,
            status: 'paused',
            now: action.t,
            pauses: [...state.pauses, { from: action.t, to: null }],
          }
        : state;

    case 'resume':
      return state.status === 'paused'
        ? {
            ...state,
            status: 'recording',
            now: action.t,
            // The signal clock restarts: the pause is not a GPS gap.
            lastFixAt: action.t,
            permissionRevoked: false,
            pauses: state.pauses.map(p => (p.to === null ? { ...p, to: action.t } : p)),
          }
        : state;

    case 'finish':
      return state.status === 'recording' || state.status === 'paused'
        ? {
            ...state,
            status: 'finished',
            now: action.t,
            endedAt: action.t,
            pauses: state.pauses.map(p => (p.to === null ? { ...p, to: action.t } : p)),
          }
        : state;

    case 'fix': {
      const { fix } = action;
      const t = fix.t ?? state.now;
      // A pause (always manual) does not move.
      if (state.status !== 'recording') {
        return state;
      }
      const verdict = judgeFix(state, fix, t);
      switch (verdict.kind) {
        case 'reject':
          return state;
        case 'jump':
          return { ...state, jumpStreak: state.jumpStreak + 1 };
        case 'jitter':
          return { ...state, now: Math.max(state.now, t), lastFixAt: Math.max(state.lastFixAt ?? 0, t) };
        case 'reanchor':
          return acceptFix({ ...state, points: [], distanceM: 0 }, fix, t, 0);
        case 'accept':
          return acceptFix(state, fix, t, verdict.step);
      }
    }
  }
  return state;
}

// A recording found on disk after the app was closed: it comes back paused at
// the last instant that was saved (the time since then is not counted), and
// the person chooses to continue, save or discard.
// A recording saved by an older version may still carry the auto-pause
// fields: they are dropped (the pause is manual).
export function restoreTracker(saved: TrackerState): TrackerState {
  const state = { ...saved } as TrackerState & Record<string, unknown>;
  ['autoPause', 'autoPaused', 'lastMoveAt', 'resumeCandidate'].forEach(key => {
    delete state[key];
  });
  return state.status === 'recording' ? trackerReducer(state, { type: 'pause', t: state.now }) : state;
}

// ── Derived values ──────────────────────────────────────────────────────────
export function trackerActiveSec(state: TrackerState): number {
  if (state.startedAt === null) {
    return 0;
  }
  const end = state.endedAt ?? state.now;
  return activeMs(state.startedAt, end, state.pauses) / 1000;
}

export function trackerSignalLost(state: TrackerState): boolean {
  return (
    state.status === 'recording' &&
    state.lastFixAt !== null &&
    state.now - state.lastFixAt >= SIGNAL_LOST_MS
  );
}

// Average pace / speed of the whole activity, pauses excluded: the summary,
// the pause view and the result.
export function trackerPace(state: TrackerState): number | null {
  return paceSecPerKm(state.distanceM, trackerActiveSec(state));
}

export function trackerSpeed(state: TrackerState): number | null {
  return speedKmh(state.distanceM, trackerActiveSec(state));
}

// Metres and active seconds of the recent stretch: back from the latest point
// until CURRENT_WINDOW_SEC seconds or CURRENT_WINDOW_M metres are covered. The
// time runs to `now` once the person has stood still for CURRENT_STALE_MS
// (it slows down) and leaves the pauses out. null when there is not enough.
export function trackerCurrentWindow(state: TrackerState): { m: number; sec: number } | null {
  const points = state.points;
  const last = points[points.length - 1];
  if (!last || last.t === undefined || state.startedAt === null) {
    return null;
  }
  const end =
    state.status === 'recording' && state.now - last.t > CURRENT_STALE_MS ? state.now : last.t;
  let metres = 0;
  let from = last.t;
  for (let index = points.length - 1; index > 0; index -= 1) {
    const a = points[index - 1];
    const b = points[index];
    if (a.t === undefined) {
      break;
    }
    metres += haversine(a, b);
    from = a.t;
    if (metres >= CURRENT_WINDOW_M || activeMs(from, end, state.pauses) / 1000 >= CURRENT_WINDOW_SEC) {
      break;
    }
  }
  const sec = activeMs(from, end, state.pauses) / 1000;
  return metres >= CURRENT_MIN_M && sec >= CURRENT_MIN_SEC ? { m: metres, sec } : null;
}

// "Ritmo actual" / "Velocidad actual" while recording (B-08).
export function trackerCurrentPace(state: TrackerState): number | null {
  const window = trackerCurrentWindow(state);
  return window ? paceSecPerKm(window.m, window.sec) : null;
}

export function trackerCurrentSpeed(state: TrackerState): number | null {
  const window = trackerCurrentWindow(state);
  return window ? speedKmh(window.m, window.sec) : null;
}

export function trackerElevation(state: TrackerState): number {
  return elevationGain(state.points);
}

// Metres still to go on the planned route (null without a plan).
export function trackerPlanRemainingM(state: TrackerState, planTotalM: number): number | null {
  return state.plan && state.plan.length > 1 ? Math.max(0, planTotalM - state.planAlongM) : null;
}

// Seconds the current pause has lasted.
export function trackerPausedSec(state: TrackerState): number {
  const open = state.pauses.find(p => p.to === null);
  return open ? Math.max(0, (state.now - open.from) / 1000) : 0;
}
