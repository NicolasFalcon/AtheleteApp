import { useSyncExternalStore } from 'react';
import type {
  LatLng,
  PlannedRoute,
  RouteActivity,
  RouteElevationPref,
  RouteKind,
  RouteSport,
  RouteSurfacePref,
  RouteVisibility,
} from '@app/features/route/routeTypes';

// Session state shared by the Ruta screens (sport, plan being built, privacy,
// the activity just finished). In memory: nothing here is persisted or sent.
// TODO(route-wire): privacy defaults come from the profile on the server.

export type RouteMode = 'now' | 'plan';

export type RouteConfig = {
  km: number;
  kind: RouteKind;
  elevation: RouteElevationPref;
  surface: RouteSurfacePref;
};

export type RouteSession = {
  sport: RouteSport;
  mode: RouteMode;
  config: RouteConfig;
  // The route chosen to follow (shown in "GPS listo con ruta planeada").
  plan: PlannedRoute | null;
  // Result of "Generar ruta" (Opción N) and the draft being previewed/edited.
  generated: PlannedRoute | null;
  generationSeed: number;
  draft: PlannedRoute | null;
  // Hand-drawn points (Crear a mano).
  manualPoints: LatLng[];
  manualSelected: number | null;
  manualEditing: boolean;
  // Privacy of this and the next outings.
  visibility: RouteVisibility;
  hideEndpoints: boolean;
  autoPause: boolean;
  // The activity just finished and whether it was posted to Comunidad.
  finished: RouteActivity | null;
  posted: boolean;
};

export const DEFAULT_CONFIG: Record<RouteSport, RouteConfig> = {
  running: { km: 5, kind: 'loop', elevation: 'low', surface: 'any' },
  cycling: { km: 40, kind: 'loop', elevation: 'balanced', surface: 'any' },
};

export const INITIAL_SESSION: RouteSession = {
  sport: 'running',
  mode: 'now',
  config: DEFAULT_CONFIG.running,
  plan: null,
  generated: null,
  generationSeed: 0,
  draft: null,
  manualPoints: [],
  manualSelected: null,
  manualEditing: false,
  visibility: 'friends',
  hideEndpoints: true,
  autoPause: true,
  finished: null,
  posted: false,
};

let session: RouteSession = INITIAL_SESSION;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach(listener => listener());
}

export const routeStore = {
  get: () => session,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  patch(next: Partial<RouteSession>) {
    session = { ...session, ...next };
    emit();
  },
  setSport(sport: RouteSport) {
    session = { ...session, sport, config: DEFAULT_CONFIG[sport] };
    emit();
  },
  reset(next: Partial<RouteSession> = {}) {
    session = { ...INITIAL_SESSION, ...next };
    emit();
  },
};

export function useRouteSession(): RouteSession {
  return useSyncExternalStore(routeStore.subscribe, routeStore.get, routeStore.get);
}
