import { ROUTE_POSTS_ENABLED } from '@app/features/social/postModel';
import { usesFixtures } from '@app/services/social/socialSource';

// Whether `route` posts are drawn: only in the dev fixtures until the backend
// and Ruta exist (TODO(ruta), Fase 5). In the real app they are not shown.
export function routePostsEnabled(): boolean {
  return ROUTE_POSTS_ENABLED || usesFixtures();
}
