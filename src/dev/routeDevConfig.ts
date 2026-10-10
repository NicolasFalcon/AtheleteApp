import type { LocationPermission } from '@app/features/route/locationSource';
import type { RouteSport } from '@app/features/route/routeTypes';

// Development switches for the simulated location source and the Ruta states
// (permission denied, no GPS signal, map offline). Set by the dev deep links
// (athelete://dev/route?screen=…); never read in production flows.
export type RouteDevConfig = {
  permission: LocationPermission;
  // No fix ever arrives ("sin señal GPS").
  noSignal: boolean;
  mapOffline: boolean;
  // Virtual seconds per real second.
  speedup: number;
  // Metres of the track already covered when the live screen opens, and the
  // elapsed seconds that go with them (a pre-played activity).
  startM: number;
  elapsedSec: number;
  detour: { startM: number; lengthM: number; offsetM: number } | null;
  startPaused: boolean;
  // Open the live screen already in the "Desviado de ruta" state.
  sport?: RouteSport;
};

export const DEFAULT_DEV_CONFIG: RouteDevConfig = {
  permission: 'granted',
  noSignal: false,
  mapOffline: false,
  speedup: 4,
  startM: 0,
  elapsedSec: 0,
  detour: null,
  startPaused: false,
};

let config: RouteDevConfig = DEFAULT_DEV_CONFIG;

export function getRouteDevConfig(): RouteDevConfig {
  return __DEV__ ? config : DEFAULT_DEV_CONFIG;
}

export function setRouteDevConfig(next: Partial<RouteDevConfig>) {
  if (__DEV__) {
    config = { ...DEFAULT_DEV_CONFIG, ...next };
  }
}
