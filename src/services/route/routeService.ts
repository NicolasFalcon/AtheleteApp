import type {
  PlannedRoute,
  RouteActivity,
  RouteGenerationParams,
  RouteVisibility,
} from '@app/features/route/routeTypes';
import type { DistanceKey } from '@app/features/route/routeMappers';
import type { RoutePersonalBest } from '@app/features/route/routeRecords';

// What Ruta needs from the backend. Two implementations: the Supabase one
// (`supabaseRouteService`, the real app) and the sample one
// (`src/dev/routeFixtures.ts`, reachable only from the dev deep links).
// Contracts: docs/backend/ROUTE_RPC_SHAPES.md.
export interface RouteService {
  // Tus rutas (private planned routes).
  getSavedRoutes(): Promise<PlannedRoute[]>;
  saveRoute(route: PlannedRoute): Promise<PlannedRoute>;
  renameRoute(id: string, name: string): Promise<void>;
  deleteRoute(id: string): Promise<void>;

  // "Generar ruta" con ELLIE: one route per call; `seed` = "Otra opción".
  // Fails with a `RouteServiceError` whose code is a `GenerateRouteError`.
  generateRoute(params: RouteGenerationParams): Promise<PlannedRoute>;

  // Activities. `saveActivity` is idempotent by client_id; with no network it
  // is kept in a local queue and comes back with `pending: true`. A rejection
  // of the server (impossible speed…) throws a `RouteServiceError`.
  saveActivity(activity: RouteActivity): Promise<RouteActivity>;
  // The owner gets everything; others the trimmed track. null: not found or
  // not allowed.
  getActivity(id: string): Promise<RouteActivity | null>;
  getTodayActivity(): Promise<RouteActivity | null>;
  // `userId` omitted = mine (Perfil de otro usuario: the others' view).
  getRecentActivities(limit: number, userId?: string): Promise<RouteActivity[]>;
  getOutdoorMonth(userId?: string): Promise<OutdoorMonth>;
  updatePrivacy(
    activityId: string,
    visibility: RouteVisibility,
    hideEndpoints: boolean,
  ): Promise<void>;
  deleteActivity(activityId: string): Promise<void>;

  // Records (route_personal_bests).
  getPersonalBests(): Promise<RoutePersonalBest[]>;
  setPersonalBest(input: {
    sport: 'running' | 'cycling';
    distanceKey: DistanceKey;
    timeSec: number;
    achievedAt: string;
  }): Promise<void>;

  // create_post('route', activity_id). `created: false` = it was already shared.
  shareToCommunity(activityId: string): Promise<{ postId: string; created: boolean }>;

  // Activities waiting for network. Sends what is due; returns how many went up.
  flushPending(): Promise<number>;
}

export type OutdoorMonth = {
  runKm: number;
  runDeltaKm: number; // against the previous month
  bikeKm: number;
};

// An error with a code the screens map to a message.
export class RouteServiceError extends Error {
  readonly code: string;

  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = 'RouteServiceError';
    this.code = code;
  }
}
