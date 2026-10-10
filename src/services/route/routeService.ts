import type {
  PlannedRoute,
  RouteActivity,
  RouteGenerationParams,
} from '@app/features/route/routeTypes';

// What Ruta needs from the backend. In 5a only the sample implementation
// exists (`src/dev/routeFixtures.ts`); nothing here is wired.
// TODO(route-wire): every method below is a backend call (see the list in
// MIGRATION_PROGRESS, "TODO(route-wire) por lo que necesita el backend").
export interface RouteService {
  // Tus rutas (private planned routes).
  getSavedRoutes(): Promise<PlannedRoute[]>; // TODO(route-wire): planned_routes
  saveRoute(route: PlannedRoute): Promise<PlannedRoute>; // TODO(route-wire): planned_routes
  renameRoute(id: string, name: string): Promise<void>; // TODO(route-wire): planned_routes
  deleteRoute(id: string): Promise<void>; // TODO(route-wire): planned_routes

  // "Generar ruta" con ELLIE: one route per call; `seed` = "Otra opción".
  generateRoute(params: RouteGenerationParams): Promise<PlannedRoute>; // TODO(route-wire): generate-route

  // Activities.
  saveActivity(activity: RouteActivity): Promise<RouteActivity>; // TODO(route-wire): route_activities
  getActivity(id: string): Promise<RouteActivity | null>; // TODO(route-wire): get_route_for_viewer (trim for others)
  getTodayActivity(): Promise<RouteActivity | null>; // TODO(route-wire): Inicio · "Ruta completada hoy"
  getRecentActivities(limit: number): Promise<RouteActivity[]>; // TODO(route-wire): Perfil · Actividad reciente
  getOutdoorMonth(): Promise<OutdoorMonth>; // TODO(route-wire): Progreso · Al aire libre

  // Share (TODO(route-wire)): post of type `route` (BT-56) and the 9:16 piece.
  shareToCommunity(activityId: string): Promise<{ postId: string }>; // TODO(route-wire): create_post('route')
}

export type OutdoorMonth = {
  runKm: number;
  runDeltaKm: number; // against the previous month
  bikeKm: number;
};
