import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { RouteActivity, RouteGenerationParams } from '@app/features/route/routeTypes';
import { useAuth } from '@app/hooks/useAuth';
import { getRouteService } from '@app/services/route/useRouteService';

// Reads of Ruta through React Query. The key holds the user so accounts never share a cache. Every write
// (save, delete, privacy, record) calls `useInvalidateRoute()`.
const ROUTE_KEY = 'route';

function useScope(): string {
  const { session } = useAuth();
  return session?.user.id ?? 'anon';
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

// ── B-13 · no repeated calls when coming back to Ruta ──────────────────────
// Read once and kept: a write (save / rename / delete) invalidates them.
const KEEP_MS = 5 * 60_000;

export const plannedRoutesKey = (scope: string) => [ROUTE_KEY, scope, 'planned'] as const;

// Tus rutas (get_my_planned_routes).
export function usePlannedRoutes() {
  const scope = useScope();
  return useQuery({
    queryKey: plannedRoutesKey(scope),
    queryFn: () => getRouteService().getSavedRoutes(),
    staleTime: KEEP_MS,
    refetchOnMount: false,
    enabled: scope !== 'anon',
  });
}

export function usePlannedRoutesKey() {
  return plannedRoutesKey(useScope());
}

// One activity (result, share). `initial`: the one just finished, already in
// memory.
export function useRouteActivity(id: string | null | undefined, initial?: RouteActivity | null) {
  const scope = useScope();
  return useQuery({
    queryKey: [ROUTE_KEY, scope, 'activity', id ?? ''],
    queryFn: () => getRouteService().getActivity(id as string),
    enabled: scope !== 'anon' && Boolean(id) && !initial,
    initialData: initial ?? undefined,
    staleTime: KEEP_MS,
    refetchOnMount: false,
  });
}

// generate-route by rounded origin (~100 m) and parameters: the same request
// is answered from memory (also "Otra opción" back and forth by seed).
export function generateRouteKey(params: RouteGenerationParams) {
  // Its own root: invalidating Ruta's data never asks generate-route again.
  return [
    'route-generate',
    params.sport,
    Math.round(params.origin.lat * 1000) / 1000,
    Math.round(params.origin.lon * 1000) / 1000,
    params.targetKm,
    params.kind,
    params.elevation,
    params.surface,
    params.seed,
  ] as const;
}

export function useGeneratedRoute(params: RouteGenerationParams | null) {
  return useQuery({
    queryKey: params ? generateRouteKey(params) : ['route-generate', 'none'],
    queryFn: () => getRouteService().generateRoute(params as RouteGenerationParams),
    enabled: Boolean(params),
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnMount: false,
    retry: false,
  });
}
