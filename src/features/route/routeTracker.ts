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
// (simulated in 5a, expo-location in 5c/5d).

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
};

export type TrackerAction =
  | { type: 'start'; t: number }
  | { type: 'fix'; fix: RoutePoint }
  | { type: 'tick'; t: number }
  | { type: 'pause'; t: number }
  | { type: 'resume'; t: number }
  | { type: 'finish'; t: number };

// A fix less accurate than this is ignored; one closer than MIN_STEP_M to the
// last is jitter and adds no distance.
export const MAX_ACCURACY_M = 50;
export const MIN_STEP_M = 2;
// No fix for this long while recording = "sin señal GPS".
export const SIGNAL_LOST_MS = 10_000;

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
  };
}

export function trackerReducer(state: TrackerState, action: TrackerAction): TrackerState {
  switch (action.type) {
    case 'start':
      return state.status === 'ready'
        ? { ...state, status: 'recording', startedAt: action.t, now: action.t, lastFixAt: action.t }
        : state;

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
      // Fixes only count while recording (a paused activity does not move).
      if (state.status !== 'recording') {
        return state;
      }
      const { fix } = action;
      if (fix.accuracy !== undefined && fix.accuracy > MAX_ACCURACY_M) {
        return state;
      }
      const t = fix.t ?? state.now;
      const last = state.points[state.points.length - 1];
      const step = last ? haversine(last, fix) : 0;
      if (last && step < MIN_STEP_M) {
        return { ...state, now: Math.max(state.now, t), lastFixAt: t };
      }

      let deviation = state.deviation;
      let planDistanceM: number | null = null;
      if (state.plan && state.plan.length > 1) {
        const hit = nearestOnRoute(fix, state.plan);
        if (hit) {
          planDistanceM = hit.distanceM;
          deviation = updateDeviation(state.deviation, state.sport, t, hit.distanceM);
        }
      }
      return {
        ...state,
        points: [...state.points, { ...fix, t }],
        distanceM: state.distanceM + step,
        lastFixAt: t,
        now: Math.max(state.now, t),
        deviation,
        planDistanceM,
      };
    }
  }
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

// Seconds the current pause has lasted.
export function trackerPausedSec(state: TrackerState): number {
  const open = state.pauses.find(p => p.to === null);
  return open ? Math.max(0, (state.now - open.from) / 1000) : 0;
}
