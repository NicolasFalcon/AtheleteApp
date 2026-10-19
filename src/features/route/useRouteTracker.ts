import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { LocationSource } from '@app/features/route/locationSource';
import { locationStore } from '@app/features/route/locationStore';
import {
  initialTracker,
  trackerReducer,
  type TrackerState,
} from '@app/features/route/routeTracker';
import type { LatLng, RouteSport } from '@app/features/route/routeTypes';

// Connects the pure tracker to a LocationSource: fixes while recording and a
// 500 ms tick for the clock. The screens only see state and four actions.
// The source (expo-location) can change without touching this hook.
export function useRouteTracker(options: {
  source: LocationSource;
  sport: RouteSport;
  plan: LatLng[] | null;
  // A tracker state to start from (defaults to the sport's initial one).
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
    const stop = source.watch(
      fix => {
        dispatch({ type: 'fix', fix });
        // Coming back to Ruta after the outing starts from here (B-13).
        locationStore.record(fix);
      },
      event => {
        if (event.type === 'alive') {
          dispatch({ type: 'alive', t: event.t });
        } else {
          dispatch({ type: 'revoked', t: sourceRef.current.now() });
        }
      },
    );
    const tick = setInterval(() => dispatch({ type: 'tick', t: source.now() }), 500);
    return () => {
      stop();
      clearInterval(tick);
    };
  }, [recording, source]);

  const start = useCallback(() => dispatch({ type: 'start', t: sourceRef.current.now() }), []);
  const pause = useCallback(() => {
    dispatch({ type: 'pause', t: sourceRef.current.now() });
  }, []);
  const resume = useCallback(() => {
    dispatch({ type: 'resume', t: sourceRef.current.now() });
  }, []);
  const finish = useCallback(
    () => dispatch({ type: 'finish', t: sourceRef.current.now() }),
    [],
  );

  return { state, start, pause, resume, finish };
}
