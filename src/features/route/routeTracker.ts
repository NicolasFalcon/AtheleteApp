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
  // paused and keeps what it has).
  permissionRevoked: boolean;
  // Auto-pause: the preference, whether the current pause is automatic, when
  // the last accepted movement happened and the first fix that looks like the
  // person is moving again.
  autoPause: boolean;
  autoPaused: boolean;
  lastMoveAt: number | null;
  resumeCandidate: RoutePoint | null;
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
// A fix less accurate than this is ignored; one closer than MIN_STEP_M to the
// last is jitter and adds no distance.
export const MAX_ACCURACY_M = 50;
export const MIN_STEP_M = 2;
// Standing still, the GPS drifts by about its own accuracy: a step must exceed
// max(accuracy, DRIFT_FLOOR_M) to count while the implied speed is below
// STATIONARY_SPEED_MS (walking pace and up uses MIN_STEP_M only).
export const DRIFT_FLOOR_M = 5;
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

// Auto-pause (the "Pausa automática" preference). With the 5 m distance filter
// of the location updates, standing still means no new accepted point:
//  - running: 8 s without 5 m of movement (≈ slower than 0,6 m/s, below any
//    walking pace) → pause; cycling: 6 s (traffic lights are quick to react to).
//  - the pause starts at the last movement, so the stop is not counted.
//  - resume: two consecutive moving fixes ≥ 10 m from where it stopped at
//    ≥ 1,0 m/s (running) / 1,8 m/s (cycling); this ignores GPS drift.
export const AUTO_PAUSE_HOLD_MS: Record<RouteSport, number> = { running: 8000, cycling: 6000 };
export const AUTO_RESUME_SPEED_MS: Record<RouteSport, number> = { running: 1.0, cycling: 1.8 };
export const AUTO_RESUME_MIN_M = 10;

export function initialTracker(
  sport: RouteSport,
  plan: LatLng[] | null = null,
  autoPause = false,
): TrackerState {
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
    autoPause,
    autoPaused: false,
    lastMoveAt: null,
    resumeCandidate: null,
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
  const threshold = speed < STATIONARY_SPEED_MS ? Math.max(fix.accuracy ?? 0, DRIFT_FLOOR_M) : MIN_STEP_M;
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
    lastMoveAt: t,
    now: Math.max(state.now, t),
    jumpStreak: 0,
    ...withPlan(state, fix, t),
  };
}

// Pauses by itself when the person has stopped (see AUTO_PAUSE_HOLD_MS).
function maybeAutoPause(state: TrackerState, t: number): TrackerState {
  if (
    !state.autoPause ||
    state.status !== 'recording' ||
    state.points.length === 0 ||
    state.lastMoveAt === null ||
    state.lastFixAt === null ||
    // Without signal the person did not necessarily stop.
    t - state.lastFixAt >= SIGNAL_LOST_MS ||
    t - state.lastMoveAt < AUTO_PAUSE_HOLD_MS[state.sport]
  ) {
    return state;
  }
  return {
    ...state,
    status: 'paused',
    autoPaused: true,
    resumeCandidate: null,
    now: Math.max(state.now, t),
    pauses: [...state.pauses, { from: state.lastMoveAt, to: null }],
  };
}

// A fix while auto-paused: it resumes only on real movement.
function resumeFromAutoPause(state: TrackerState, fix: RoutePoint, t: number): TrackerState {
  const verdict = judgeFix(state, fix, t);
  if (verdict.kind === 'reject' || verdict.kind === 'jump' || verdict.kind === 'reanchor') {
    return state;
  }
  const last = state.points[state.points.length - 1];
  const moved = last ? haversine(last, fix) : 0;
  const candidate = state.resumeCandidate;
  if (!candidate) {
    return moved >= Math.max(fix.accuracy ?? 0, DRIFT_FLOOR_M)
      ? { ...state, resumeCandidate: { ...fix, t }, lastFixAt: t, now: Math.max(state.now, t) }
      : { ...state, lastFixAt: t, now: Math.max(state.now, t) };
  }
  const dt = (t - (candidate.t ?? t)) / 1000;
  const speed = dt > 0 ? haversine(candidate, fix) / dt : 0;
  if (moved >= AUTO_RESUME_MIN_M && speed >= AUTO_RESUME_SPEED_MS[state.sport]) {
    const from = candidate.t ?? t;
    let next: TrackerState = {
      ...state,
      status: 'recording',
      autoPaused: false,
      resumeCandidate: null,
      pauses: state.pauses.map(p => (p.to === null ? { ...p, to: from } : p)),
    };
    next = acceptFix(next, candidate, from, haversine(last, candidate));
    return acceptFix(next, fix, t, haversine(candidate, fix));
  }
  return { ...state, resumeCandidate: { ...fix, t }, lastFixAt: t, now: Math.max(state.now, t) };
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
            lastMoveAt: action.t,
          }
        : state;

    case 'alive':
      return state.status === 'recording' && action.t > (state.lastFixAt ?? 0)
        ? maybeAutoPause({ ...state, lastFixAt: action.t, now: Math.max(state.now, action.t) }, action.t)
        : state;

    case 'revoked': {
      const paused = trackerReducer(state, { type: 'pause', t: action.t });
      return { ...paused, permissionRevoked: true };
    }

    case 'tick':
      if (state.status === 'recording') {
        return maybeAutoPause({ ...state, now: action.t }, action.t);
      }
      return state.status === 'paused' ? { ...state, now: action.t } : state;

    case 'pause':
      return state.status === 'recording'
        ? {
            ...state,
            status: 'paused',
            autoPaused: false,
            now: action.t,
            pauses: [...state.pauses, { from: action.t, to: null }],
          }
        : state;

    case 'resume':
      return state.status === 'paused'
        ? {
            ...state,
            status: 'recording',
            autoPaused: false,
            resumeCandidate: null,
            now: action.t,
            // The signal clock restarts: the pause is not a GPS gap.
            lastFixAt: action.t,
            lastMoveAt: action.t,
            permissionRevoked: false,
            pauses: state.pauses.map(p => (p.to === null ? { ...p, to: action.t } : p)),
          }
        : state;

    case 'finish':
      return state.status === 'recording' || state.status === 'paused'
        ? {
            ...state,
            status: 'finished',
            autoPaused: false,
            now: action.t,
            endedAt: action.t,
            pauses: state.pauses.map(p => (p.to === null ? { ...p, to: action.t } : p)),
          }
        : state;

    case 'fix': {
      const { fix } = action;
      const t = fix.t ?? state.now;
      // A manual pause does not move; an automatic one watches for movement.
      if (state.status === 'paused' && state.autoPaused) {
        return resumeFromAutoPause(state, fix, t);
      }
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
          return maybeAutoPause(
            { ...state, now: Math.max(state.now, t), lastFixAt: Math.max(state.lastFixAt ?? 0, t) },
            Math.max(state.now, t),
          );
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
export function restoreTracker(saved: TrackerState): TrackerState {
  if (saved.status === 'recording') {
    return trackerReducer(saved, { type: 'pause', t: saved.now });
  }
  return saved.status === 'paused' ? { ...saved, autoPaused: false, resumeCandidate: null } : saved;
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

export function trackerPace(state: TrackerState): number | null {
  return paceSecPerKm(state.distanceM, trackerActiveSec(state));
}

export function trackerSpeed(state: TrackerState): number | null {
  return speedKmh(state.distanceM, trackerActiveSec(state));
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
