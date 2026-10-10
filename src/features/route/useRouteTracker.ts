import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { LocationSource, SimulatedLocationSource } from '@app/features/route/locationSource';
import {
  initialTracker,
  trackerReducer,
  type TrackerState,
} from '@app/features/route/routeTracker';
import type { LatLng, RouteSport } from '@app/features/route/routeTypes';

// Connects the pure tracker to a LocationSource: fixes while recording and a
// 500 ms tick for the clock. The screens only see state and four actions.
// 5c/5d change the source (expo-location), not this hook or the screens.
export function useRouteTracker(options: {
  source: LocationSource;
  sport: RouteSport;
  plan: LatLng[] | null;
  // A pre-played state (development scenarios).
  initial?: TrackerState;
}) {
  const { source, sport, plan, initial } = options;
  const [state, dispatch] = useReducer(
    trackerReducer,
    initial ?? initialTracker(sport, plan),
  );
  const recording = state.status === 'recording' || state.status === 'paused';
  const sourceRef = useRef(source);
  sourceRef.current = source;

  useEffect(() => {
    if (!recording) {
      return undefined;
    }
    const stop = source.watch(fix => dispatch({ type: 'fix', fix }));
    const tick = setInterval(() => dispatch({ type: 'tick', t: source.now() }), 500);
    return () => {
      stop();
      clearInterval(tick);
    };
  }, [recording, source]);

  const start = useCallback(() => dispatch({ type: 'start', t: sourceRef.current.now() }), []);
  const pause = useCallback(() => {
    sourceRef.current.setMoving?.(false);
    dispatch({ type: 'pause', t: sourceRef.current.now() });
  }, []);
  const resume = useCallback(() => {
    sourceRef.current.setMoving?.(true);
    dispatch({ type: 'resume', t: sourceRef.current.now() });
  }, []);
  const finish = useCallback(
    () => dispatch({ type: 'finish', t: sourceRef.current.now() }),
    [],
  );

  return { state, start, pause, resume, finish };
}

// A tracker already part-way through an outing, for the dev scenarios
// (athelete://dev/route?screen=activeRun, pause, offRoute…). Replays the
// source's track up to `startM` over `elapsedSec`, ending `quietSec` before
// "now" (a stretch without fixes = "sin señal GPS").
export function preplayTracker(options: {
  source: SimulatedLocationSource;
  sport: RouteSport;
  plan: LatLng[] | null;
  startM: number;
  elapsedSec: number;
  paused: boolean;
  quietSec?: number;
}): TrackerState {
  const { source, sport, plan, startM, elapsedSec, paused, quietSec = 0 } = options;
  const now = source.now();
  const t0 = now - elapsedSec * 1000;
  const tEnd = now - quietSec * 1000;
  let state = trackerReducer(initialTracker(sport, plan), { type: 'start', t: t0 });
  const steps = Math.max(1, Math.round(startM / 10));
  for (let i = 0; i <= steps; i += 1) {
    const fraction = i / steps;
    const point = source.position(startM * fraction);
    const ele = 18 + 6 * Math.sin(fraction * 9);
    state = trackerReducer(state, {
      type: 'fix',
      fix: { ...point, ele, t: t0 + fraction * (tEnd - t0), accuracy: 4 },
    });
  }
  state = trackerReducer(state, { type: 'tick', t: now });
  return paused ? trackerReducer(state, { type: 'pause', t: now }) : state;
}
