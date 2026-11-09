import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@app/hooks/useAuth';
import { useWeekPlan } from '@app/hooks/useWeekPlan';
import { getLocalDateKey } from '@app/lib/date';
import { createUuid } from '@app/lib/uuid';
import { addDays, weekStartOf } from '@app/features/week/weekModel';
import {
  hasPendingPlanSession,
  nextPlanSession,
  planContext,
} from '@app/features/trainingPlan/planViewModel';
import { isPlanOn } from '@app/features/trainingPlan/trainingPlanModel';
import {
  invalidateTrainingPlan,
  trainingPlanKeys,
  useTrainingPlanState,
} from '@app/features/trainingPlan/useTrainingPlanState';
import {
  fetchTrainingPlanDetail,
  fetchTrainingPlanMonth,
  resumeTrainingPlan,
} from '@app/services/supabase/trainingPlan';

// get_training_plan (Plan, 31.6; also the plan's dates for Semana and Mes).
export function useTrainingPlanDetail(enabled = true) {
  const { profile } = useAuth();
  const userId = profile?.id;
  return useQuery({
    queryKey: [...trainingPlanKeys.all, 'detail', userId ?? 'guest'] as const,
    enabled: Boolean(userId) && enabled,
    staleTime: 60 * 1000,
    queryFn: () => fetchTrainingPlanDetail(),
  });
}

// get_training_plan_month (Mes, 31.5), by "YYYY-MM".
export function useTrainingPlanMonth(month: string, enabled = true) {
  const { profile } = useAuth();
  const userId = profile?.id;
  return useQuery({
    queryKey: [...trainingPlanKeys.all, 'month', userId ?? 'guest', month] as const,
    enabled: Boolean(userId) && enabled,
    staleTime: 60 * 1000,
    queryFn: () => fetchTrainingPlanMonth(month),
  });
}

// Retomar (31.4): resume_training_plan with a new client id per tap; the
// plan's state, the week and Inicio are read again afterwards.
export function useResumeTrainingPlan() {
  const queryClient = useQueryClient();
  const [failed, setFailed] = useState(false);
  const mutation = useMutation({
    mutationFn: () => resumeTrainingPlan(createUuid()),
    onSettled: () => invalidateTrainingPlan(queryClient),
  });
  const resume = useCallback(async (): Promise<boolean> => {
    setFailed(false);
    try {
      await mutation.mutateAsync();
      return true;
    } catch (error) {
      __DEV__ && console.warn('[training-plan] resume_training_plan:', error);
      setFailed(true);
      return false;
    }
  }, [mutation]);
  return { resume, resuming: mutation.isPending, failed };
}

// Inicio and Entrenos with a plan (31.4): the plan's state, this week and,
// when nothing is left in it, the next one; and the next session out of them.
export function usePlanToday() {
  const state = useTrainingPlanState();
  const on = isPlanOn(state.data?.state);
  const today = getLocalDateKey();
  const week = useWeekPlan(on);
  const ctx = planContext(today, state.data, week.data?.trainingPlan);
  const needNext = on && Boolean(week.data) && !hasPendingPlanSession(week.data, ctx);
  const next = useWeekPlan(needNext, addDays(weekStartOf(today), 7));
  const ref = on ? nextPlanSession([week.data, next.data], ctx) : null;
  return {
    on,
    paused: on && ctx.paused,
    pausedUntil: ctx.pausedUntil,
    ctx,
    state: state.data ?? null,
    week: week.data ?? null,
    next: ref,
    loading: state.isLoading || (on && week.isLoading),
  };
}
