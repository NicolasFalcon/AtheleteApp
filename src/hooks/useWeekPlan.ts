import { useCallback } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { deviceTimezone } from '@app/features/profile/timezoneSync';
import { useAuth } from '@app/hooks/useAuth';
import { routineKeys } from '@app/hooks/useRoutines';
import { getLocalDateKey } from '@app/lib/date';
import { weekPlanService } from '@app/services/routines/weekPlanService';

// Tu semana: get_week_plan of the current week with the device's zone. The
// key carries the local day, so a new day reads it again.
export const weekKeys = {
  all: ['week'] as const,
  current: (userId: string | undefined, day: string, tz: string) =>
    ['week', 'current', userId ?? 'guest', day, tz] as const,
};

export function useWeekPlan(enabled = true) {
  const { profile } = useAuth();
  const userId = profile?.id;
  const tz = deviceTimezone();
  const day = getLocalDateKey();
  return useQuery({
    queryKey: weekKeys.current(userId, day, tz ?? ''),
    enabled: Boolean(userId) && enabled,
    staleTime: 30 * 1000,
    queryFn: () => weekPlanService.getWeekPlan({ tz }),
  });
}

// After any change to the week: the week itself and today's suggestion
// (get_today_suggestion follows the active plan).
export async function invalidateWeek(queryClient: QueryClient) {
  await Promise.allSettled([
    queryClient.invalidateQueries({ queryKey: weekKeys.all }),
    queryClient.invalidateQueries({ queryKey: routineKeys.today }),
  ]);
}

// Runs a change of the week and refreshes what depends on it. Errors are
// thrown as they come (RoutineError) for the screen to show.
export function useWeekChange() {
  const queryClient = useQueryClient();
  return useCallback(
    async <T,>(change: () => Promise<T>): Promise<T> => {
      try {
        return await change();
      } finally {
        await invalidateWeek(queryClient);
      }
    },
    [queryClient],
  );
}
