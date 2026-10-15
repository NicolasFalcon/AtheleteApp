import type { RouteService } from '@app/services/route/routeService';
import { supabaseRouteService } from '@app/services/route/supabaseRouteService';

// The one place that picks the RouteService: always Supabase.
export function getRouteService(): RouteService {
  return supabaseRouteService;
}

export function useRouteService(): RouteService {
  return getRouteService();
}
