import { isRouteSampleActive } from '@app/dev/routeDevConfig';
import { sampleRouteService } from '@app/dev/routeFixtures';
import type { RouteService } from '@app/services/route/routeService';
import { supabaseRouteService } from '@app/services/route/supabaseRouteService';

// The one place that picks the RouteService: Supabase in the real app; the
// sample one only after a dev deep link (athelete://dev/route) loaded a
// scenario (`isRouteSampleActive`, false in release builds).
export function getRouteService(): RouteService {
  return isRouteSampleActive() ? sampleRouteService : supabaseRouteService;
}

export function useRouteService(): RouteService {
  return getRouteService();
}
