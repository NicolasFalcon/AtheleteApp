import { sampleRouteService } from '@app/dev/routeFixtures';
import type { RouteService } from '@app/services/route/routeService';

// The one place that picks the RouteService.
// 5a: the sample implementation (no backend). It is only reachable from the
// dev deep links (athelete://dev/route) and the Ruta screens behind them.
// TODO(route-wire): return the Supabase-backed service when the Ruta tables
// and endpoints exist (see docs/migration/ROUTE_5A_CHECKPOINT.md).
export function useRouteService(): RouteService {
  return sampleRouteService;
}
