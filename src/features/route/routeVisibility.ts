import type { RouteVisibility } from '@app/features/route/routeTypes';

// Who sees a route, as the app offers it. There is no public audience for now
// (Lote 3): an old "public" route reads and is shown as Amigos (the server
// treats it so and still accepts the value).
export const ROUTE_VISIBILITY_OPTIONS: readonly RouteVisibility[] = ['me', 'friends'];

export function shownVisibility(visibility: RouteVisibility): RouteVisibility {
  return visibility === 'public' ? 'friends' : visibility;
}

export function visibilityTitle(visibility: RouteVisibility): string {
  return shownVisibility(visibility) === 'me' ? 'Solo yo' : 'Amigos';
}
