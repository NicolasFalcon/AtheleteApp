// Types of Ruta (Running y Ciclismo). Pure data: nothing here talks to the
// backend. TODO(route-wire): the server shapes of `route_activities` and
// `planned_routes` replace these once they exist (see docs/migration/ROUTE_PLAN.md).

export type RouteSport = 'running' | 'cycling';

export type LatLng = { lat: number; lon: number };

// One GPS fix. `t` = epoch ms (the clock of the location source).
export type RoutePoint = LatLng & { ele?: number; t?: number; accuracy?: number };

export type RouteVisibility = 'me' | 'friends' | 'public';

export type RouteSplit = { label: string; value: string; fill: number; best?: boolean };

export type RouteKind = 'loop' | 'out_and_back' | 'point_to_point';
export type RouteElevationPref = 'low' | 'balanced' | 'any';
export type RouteSurfacePref = 'any' | 'asphalt' | 'trail';

// A planned route (Tus rutas). Always private.
export type PlannedRoute = {
  id: string;
  name: string;
  sport: RouteSport;
  points: LatLng[];
  distanceM: number;
  elevationGainM: number;
  kind: RouteKind;
  surface: 'mixed' | 'asphalt' | 'trail';
  origin: 'ellie' | 'manual';
};

// A finished activity.
export type RouteActivity = {
  id: string;
  sport: RouteSport;
  title: string;
  startedAt: number;
  movingSec: number;
  distanceM: number;
  elevationGainM: number;
  avgHr: number | null;
  calories: number | null;
  points: RoutePoint[]; // the full track (the owner's view)
  splits: RouteSplit[];
  plannedRouteId: string | null;
  newBest: { title: string; unit: string; detail: string } | null;
  ellieLine: string | null;
  visibility: RouteVisibility;
  hideEndpoints: boolean;
};

export type RouteGenerationParams = {
  sport: RouteSport;
  origin: LatLng;
  targetKm: number;
  kind: RouteKind;
  elevation: RouteElevationPref;
  surface: RouteSurfacePref;
  // "Otra opción": a different result for the same configuration.
  seed: number;
};
