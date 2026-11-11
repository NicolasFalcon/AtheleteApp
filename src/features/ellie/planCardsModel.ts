import type { ManageRequest } from '@app/features/trainingPlan/managePlanModel';
import { PLAN_DURATIONS } from '@app/features/trainingPlan/managePlanModel';
import {
  TRAINING_GOALS,
  type TrainingGoal,
  type TrainingPlanWeeks,
} from '@app/services/supabase/trainingPlan';
import { parsePlanReview, type PlanReview } from '@app/services/supabase/trainingPlanReview';
import { parseAdjustment, type PlanAdjustment } from '@app/services/supabase/trainingPlanSession';

// The three training-plan cards of ELLIE (docs/backend/ELLIE_CARDS_FLOW.md,
// "Tarjetas del plan de entrenamiento"): plan_review, plan_adjustment and
// plan_action_confirm. Pure parsing; the cards live in v2/PlanChatCards.tsx.

const rec = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

// plan_review: the payload is get_training_plan_review without `ok`.
export function parsePlanReviewCard(payload: unknown): PlanReview | null {
  const body = rec(payload);
  return body ? parsePlanReview(body) : null;
}

// plan_adjustment: the payload is one adjustment as list_plan_adjustments
// returns it (`{ id, plan_id, kind, status, created_at, responded_at, payload }`).
export function parseAdjustmentCard(payload: unknown): PlanAdjustment | null {
  return parseAdjustment(payload);
}

export type PlanActionName = 'pause' | 'resume' | 'change_days' | 'change_goal_duration' | 'end';

// plan_action_confirm: `{ action, params, summary }`.
export type PlanActionConfirm = {
  action: PlanActionName;
  request: ManageRequest;
  summary: string;
};

const isWeeks = (value: unknown): value is TrainingPlanWeeks =>
  PLAN_DURATIONS.some(weeks => weeks === value);

const isGoal = (value: unknown): value is TrainingGoal =>
  TRAINING_GOALS.some(goal => goal === value);

// The write the card runs on Confirmar: the same ManageRequest the sheet of
// Gestionar el plan sends, so useManagePlan runs it (client id, errors,
// invalidations). null: a payload the app cannot run (the card is not shown).
export function parsePlanActionConfirm(payload: unknown): PlanActionConfirm | null {
  const body = rec(payload);
  const params = rec(body?.params) ?? {};
  const summary = typeof body?.summary === 'string' ? body.summary : '';
  switch (body?.action) {
    case 'pause': {
      const weeks = params.weeks;
      return weeks === 1 || weeks === 2
        ? { action: 'pause', request: { kind: 'pause', weeks }, summary }
        : null;
    }
    case 'resume':
      return { action: 'resume', request: { kind: 'resume' }, summary };
    case 'change_days': {
      // The contract names it `days_of_week`; `days` is accepted too.
      const raw = Array.isArray(params.days_of_week) ? params.days_of_week : params.days;
      const days = Array.isArray(raw)
        ? raw.filter((day): day is number => Number.isInteger(day) && (day as number) >= 1 && (day as number) <= 7)
        : [];
      return days.length >= 2
        ? { action: 'change_days', request: { kind: 'days', days }, summary }
        : null;
    }
    case 'change_goal_duration':
      // The server fills the one that is missing with the plan's own, so both
      // arrive; without them there is nothing to send.
      return isGoal(params.goal) && isWeeks(params.weeks)
        ? {
            action: 'change_goal_duration',
            request: { kind: 'goal', goal: params.goal, weeks: params.weeks },
            summary,
          }
        : null;
    case 'end':
      return { action: 'end', request: { kind: 'end' }, summary };
    default:
      return null;
  }
}

// "Semana 2: 3 de 4 sesiones" needs the sessions planned.
export const reviewSessionsTotal = (review: PlanReview): number =>
  review.sessionsDone + review.sessionsMissed;

// The adjustments of a review still waiting for an answer.
export const reviewOpenAdjustments = (review: PlanReview): number =>
  review.adjustments.filter(item => item.status === 'open').length;
