import { useCallback, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@app/hooks/useAuth';
import { createUuid } from '@app/lib/uuid';
import { invalidateWorkoutQueries } from '@app/lib/queryInvalidation';
import {
  invalidateTrainingPlan,
  trainingPlanKeys,
} from '@app/features/trainingPlan/useTrainingPlanState';
import {
  fetchPlanAdjustments,
  fetchPlanOutcome,
  fetchPlanSession,
  respondPlanAdjustment,
  startPlanSession,
  type AdjustmentAction,
  type PlanAdjustment,
  type StartedPlanSession,
} from '@app/services/supabase/trainingPlanSession';

// Everything lives under trainingPlanKeys.all, so activating, pausing, ending
// or answering an adjustment (invalidateTrainingPlan) reads it all again.
export const planSessionKeys = {
  session: (id: string) => [...trainingPlanKeys.all, 'session', id] as const,
  outcome: (workoutSessionId: string) => [...trainingPlanKeys.all, 'outcome', workoutSessionId] as const,
  adjustments: (userId: string | undefined) => [...trainingPlanKeys.all, 'adjustments', userId ?? 'guest'] as const,
};

// get_plan_session (31.7).
export function usePlanSession(planSessionId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: planSessionKeys.session(planSessionId ?? ''),
    enabled: Boolean(planSessionId) && enabled,
    staleTime: 30 * 1000,
    queryFn: () => fetchPlanSession(planSessionId as string),
  });
}

// get_plan_session_outcome: "Próxima vez" of the summary. Read again when the
// athlete saves feedback or the rating (they can change the progression).
export function usePlanOutcome(workoutSessionId: string | null | undefined, enabled: boolean) {
  return useQuery({
    queryKey: planSessionKeys.outcome(workoutSessionId ?? ''),
    enabled: Boolean(workoutSessionId) && enabled,
    staleTime: 0,
    queryFn: () => fetchPlanOutcome(workoutSessionId as string),
  });
}

// "Empezar": start_plan_session with a client id per attempt, the SAME one on
// a retry of it (a retry that already went through answers the same session).
export function useStartPlanSession(planSessionId: string) {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const clientId = useRef(createUuid());
  const [failed, setFailed] = useState(false);
  const mutation = useMutation({
    mutationFn: () => startPlanSession(planSessionId, clientId.current),
  });
  const start = useCallback(async (): Promise<StartedPlanSession | null> => {
    setFailed(false);
    try {
      const started = await mutation.mutateAsync();
      // A new attempt after this one (another start later) gets a new id.
      clientId.current = createUuid();
      if (profile?.id) {
        invalidateWorkoutQueries(queryClient, profile.id).catch(() => undefined);
      }
      invalidateTrainingPlan(queryClient).catch(() => undefined);
      return started;
    } catch {
      setFailed(true);
      return null;
    }
  }, [mutation, profile?.id, queryClient]);
  return { start, starting: mutation.isPending, failed };
}

// list_plan_adjustments (31.8): the open ones and the recent applied ones.
export function usePlanAdjustments(enabled = true) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: planSessionKeys.adjustments(profile?.id),
    enabled: Boolean(profile?.id) && enabled,
    staleTime: 60 * 1000,
    queryFn: () => fetchPlanAdjustments(),
  });
}

// respond_plan_adjustment with a new client id per tap. On success the week,
// the plan and its state are read again.
export function useRespondAdjustment() {
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const respond = useCallback(
    async (adjustment: PlanAdjustment, action: AdjustmentAction): Promise<boolean> => {
      setBusyId(adjustment.id);
      try {
        await respondPlanAdjustment({ adjustmentId: adjustment.id, action, clientId: createUuid() });
        await invalidateTrainingPlan(queryClient);
        return true;
      } catch {
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [queryClient],
  );
  return { respond, busyId };
}
