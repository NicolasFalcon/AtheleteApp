import { useQuery, type QueryClient } from '@tanstack/react-query';
import { deviceTimezone } from '@app/features/profile/timezoneSync';
import { useAuth } from '@app/hooks/useAuth';
import { getLocalDateKey } from '@app/lib/date';
import { sleepService } from '@app/services/sleep/sleepService';

// One source for Sueño, its Inicio tile and Progreso (get_sleep_overview),
// and one for Respira and its tile (get_breathing_week): the figures match.
export const sleepKeys = {
  all: ['sleep'] as const,
  overview: (userId: string | undefined, day: string) => ['sleep', 'overview', userId ?? 'guest', day] as const,
  breathing: (userId: string | undefined, day: string) => ['sleep', 'breathing', userId ?? 'guest', day] as const,
};

export function useSleepOverview(enabled = true) {
  const { profile } = useAuth();
  const day = getLocalDateKey();
  return useQuery({
    queryKey: sleepKeys.overview(profile?.id, day),
    enabled: Boolean(profile?.id) && enabled,
    staleTime: 60 * 1000,
    queryFn: () => sleepService.getSleepOverview(deviceTimezone()),
  });
}

export function useBreathingWeek(enabled = true) {
  const { profile } = useAuth();
  const day = getLocalDateKey();
  return useQuery({
    queryKey: sleepKeys.breathing(profile?.id, day),
    enabled: Boolean(profile?.id) && enabled,
    staleTime: 60 * 1000,
    queryFn: () => sleepService.getBreathingWeek(deviceTimezone()),
  });
}

export function invalidateSleep(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: sleepKeys.all });
}
