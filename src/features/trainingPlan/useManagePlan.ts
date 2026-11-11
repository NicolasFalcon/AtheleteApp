import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { requestKey, type ManageRequest } from '@app/features/trainingPlan/managePlanModel';
import { invalidateTrainingPlan } from '@app/features/trainingPlan/useTrainingPlanState';
import { seedPlanReport } from '@app/features/trainingPlan/usePlanReview';
import { useAuth } from '@app/hooks/useAuth';
import { createUuid } from '@app/lib/uuid';
import {
  TrainingPlanError,
  changePlanDays,
  changePlanGoalDuration,
  pauseTrainingPlan,
  resumeTrainingPlan,
  type TrainingPlanErrorCode,
} from '@app/services/supabase/trainingPlan';
import { endTrainingPlan, type PlanReport } from '@app/services/supabase/trainingPlanReview';

// What a write gives back: ending carries the final report, pausing the date
// the pause ends.
type Sent = { planId: string | null; report: PlanReport | null; pausedUntil: string | null };
const NOTHING: Sent = { planId: null, report: null, pausedUntil: null };

async function send(request: ManageRequest, clientId: string): Promise<Sent> {
  switch (request.kind) {
    case 'pause':
      return { ...NOTHING, pausedUntil: (await pauseTrainingPlan(request.weeks, clientId)).pausedUntil };
    case 'resume':
      await resumeTrainingPlan(clientId);
      return NOTHING;
    case 'days':
      await changePlanDays([...request.days].sort((a, b) => a - b), clientId);
      return NOTHING;
    case 'goal':
      await changePlanGoalDuration({ goal: request.goal, weeks: request.weeks, clientId });
      return NOTHING;
    default: {
      const ended = await endTrainingPlan(clientId);
      return { ...NOTHING, planId: ended.planId, report: ended.report };
    }
  }
}

// `report`: the final report that came inside end_training_plan.
export type ManageOutcome =
  | { ok: true; planId: string | null; report: PlanReport | null; pausedUntil: string | null }
  | { ok: false; code: TrainingPlanErrorCode };

// `run` calls the RPC and, settled, reads again the plan's state, the week,
// the month, the plan and Inicio (invalidateTrainingPlan). It answers
// `{ ok:true }` or `{ ok:false, code }` and never throws; `busy` is the kind
// in flight (for the button's loading) and a second tap meanwhile is ignored.
export function useManagePlan() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [busy, setBusy] = useState<ManageRequest['kind'] | null>(null);
  const inFlight = useRef(false);
  const clientIds = useRef(new Map<string, string>());

  const run = useCallback(
    async (request: ManageRequest): Promise<ManageOutcome> => {
      if (inFlight.current) {
        return { ok: false, code: 'unknown' };
      }
      inFlight.current = true;
      setBusy(request.kind);
      const key = requestKey(request);
      const clientId = clientIds.current.get(key) ?? createUuid();
      clientIds.current.set(key, clientId);
      try {
        const sent = await send(request, clientId);
        clientIds.current.delete(key);
        // Ending: the report is kept so Tu semana opens it with no second call.
        if (sent.report) {
          seedPlanReport(queryClient, profile?.id, sent.report);
        }
        return { ok: true, planId: sent.planId, report: sent.report, pausedUntil: sent.pausedUntil };
      } catch (error) {
        const failure = error instanceof TrainingPlanError ? error : new TrainingPlanError('unknown');
        __DEV__ && console.warn(`[training-plan] manage ${request.kind}:`, failure.code, failure.message);
        return { ok: false, code: failure.code };
      } finally {
        // Success or not: the state may have changed (a retry that went through).
        await invalidateTrainingPlan(queryClient);
        inFlight.current = false;
        setBusy(null);
      }
    },
    [profile?.id, queryClient],
  );

  return { run, busy };
}
