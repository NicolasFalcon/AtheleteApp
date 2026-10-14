import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@app/hooks/useAuth';
import { isRouteSampleActive } from '@app/dev/routeDevConfig';
import { getRouteService } from '@app/services/route/useRouteService';

// Reads of Ruta through React Query. The key holds the user (or "sample" after
// a dev deep link) so accounts and sources never share a cache. Every write
// (save, delete, privacy, record) calls `useInvalidateRoute()`.
const ROUTE_KEY = 'route';

function useScope(): string {
  const { session } = useAuth();
  return isRouteSampleActive() ? 'sample' : (session?.user.id ?? 'anon');
}

export function useInvalidateRoute(): () => void {
  const client = useQueryClient();
  return useCallback(() => {
    client.invalidateQueries({ queryKey: [ROUTE_KEY] }).catch(() => {});
  }, [client]);
}

// Last outdoor activities (Perfil). `userId`: another person's profile (the
// server returns the trimmed tracks).
export function useRecentActivities(limit: number, userId?: string) {
  const scope = useScope();
  return useQuery({
    queryKey: [ROUTE_KEY, scope, 'recent', limit, userId ?? 'me'],
    queryFn: () => getRouteService().getRecentActivities(limit, userId),
    staleTime: 30_000,
    enabled: scope !== 'anon',
  });
}

export function useOutdoorMonth(userId?: string) {
  const scope = useScope();
  return useQuery({
    queryKey: [ROUTE_KEY, scope, 'month', userId ?? 'me'],
    queryFn: () => getRouteService().getOutdoorMonth(userId),
    staleTime: 30_000,
    enabled: scope !== 'anon',
  });
}

// The card of Inicio: the latest activity of today (null: none).
export function useTodayRouteActivity() {
  const scope = useScope();
  return useQuery({
    queryKey: [ROUTE_KEY, scope, 'today'],
    queryFn: () => getRouteService().getTodayActivity(),
    staleTime: 30_000,
    enabled: scope !== 'anon',
  });
}

export function usePersonalBests() {
  const scope = useScope();
  return useQuery({
    queryKey: [ROUTE_KEY, scope, 'bests'],
    queryFn: () => getRouteService().getPersonalBests(),
    staleTime: 60_000,
    enabled: scope !== 'anon',
  });
}
