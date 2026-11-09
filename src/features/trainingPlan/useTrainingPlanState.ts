import { useQuery, type QueryClient } from '@tanstack/react-query';
import { useAuth } from '@app/hooks/useAuth';
import { invalidateWeek } from '@app/hooks/useWeekPlan';
import {
  fetchTrainingPlanState,
  type TrainingPlanState,
} from '@app/services/supabase/trainingPlan';

// get_training_plan_state() (tp-1.2 §7): the state every screen that shows
// the week reads (31.4). Cached for a minute; activating, pausing, resuming
// or ending the plan invalidates it (invalidateTrainingPlan).
export const trainingPlanKeys = {
  all: ['training-plan'] as const,
  state: (userId: string | undefined) => ['training-plan', 'state', userId ?? 'guest'] as const,
  preview: (proposalId: string) => ['training-plan', 'preview', proposalId] as const,
};

export function useTrainingPlanState(enabled = true) {
  const { profile } = useAuth();
  const userId = profile?.id;
  return useQuery<TrainingPlanState>({
    queryKey: trainingPlanKeys.state(userId),
    enabled: Boolean(userId) && enabled,
    staleTime: 60 * 1000,
    queryFn: fetchTrainingPlanState,
  });
}

// After activating, pausing, resuming or ending: the plan's state and
// previews, the week (get_week_plan materialises the plan's sessions) and
// today's suggestion and Inicio, which follow it.
export async function invalidateTrainingPlan(queryClient: QueryClient) {
  await Promise.allSettled([
    queryClient.invalidateQueries({ queryKey: trainingPlanKeys.all }),
    invalidateWeek(queryClient),
    queryClient.invalidateQueries({ queryKey: ['home'] }),
  ]);
}
