import { ROUTE_POSTS_ENABLED } from '@app/features/social/postModel';
import { usesFixtures } from '@app/services/social/socialSource';

// Whether `route` posts are drawn: always since Ruta 5c.
export function routePostsEnabled(): boolean {
  return ROUTE_POSTS_ENABLED || usesFixtures();
}
