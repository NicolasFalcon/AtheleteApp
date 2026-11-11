import {
  TrainingPlanError,
  call,
  list,
  num,
  parsePlanDetailGoal,
  rec,
  str,
  type ManageResult,
  type PlanDetailGoal,
  type Raw,
  type TrainingGoal,
  TRAINING_GOALS,
} from '@app/services/supabase/trainingPlan';
import { parseAdjustment, type PlanAdjustment } from '@app/services/supabase/trainingPlanSession';

// Revisión semanal (31.9) y reporte final (31.10): get_training_plan_review,
// get_training_plan_report and end_training_plan, which carries the full
// report inside its answer. Shapes read from the functions and from a smoke.

// ── get_training_plan_review ────────────────────────────────────────────────
// `{ ok, plan_id, week_index, created_at, review: { sessions_done,
// sessions_missed, sets, volume_kg, adjustments: [{ id, kind, status,
// payload }] } }`. No review yet: `{ ok:false, error:'not_found' }`.
export type PlanReview = {
  planId: string | null;
  weekIndex: number;
  // When the review was created (Sunday 19:00 local), ISO.
  createdAt: string | null;
  sessionsDone: number;
  sessionsMissed: number;
  sets: number;
  volumeKg: number;
  adjustments: PlanAdjustment[];
};

export function parsePlanReview(body: Raw): PlanReview | null {
  const weekIndex = num(body.week_index);
  const review = rec(body.review);
  if (weekIndex === null || !review) {
    return null;
  }
  const planId = str(body.plan_id);
  return {
    planId,
    weekIndex,
    createdAt: str(body.created_at),
    sessionsDone: num(review.sessions_done) ?? 0,
    sessionsMissed: num(review.sessions_missed) ?? 0,
    sets: num(review.sets) ?? 0,
    volumeKg: num(review.volume_kg) ?? 0,
    // Each item is `{ id, kind, status, payload }`: the plan id lives at the root.
    adjustments: list(review.adjustments)
      .map(item => parseAdjustment({ plan_id: planId, ...item }))
      .filter((item): item is PlanAdjustment => item !== null),
  };
}

// null: there is no review yet (not_found). Anything else is an error.
export async function fetchPlanReview(weekIndex?: number | null): Promise<PlanReview | null> {
  try {
    const body = await call(
      'get_training_plan_review',
      weekIndex ? { p_week_index: weekIndex } : {},
    );
    return parsePlanReview(body);
  } catch (error) {
    if (error instanceof TrainingPlanError && error.code === 'not_found') {
      return null;
    }
    throw error;
  }
}

// ── get_training_plan_report ────────────────────────────────────────────────
// `{ ok, plan_id, name, goal, goal_target, adherence_pct, sessions: { done,
// total, missed }, anchors: [{ exercise_id, name, before_e1rm, after_e1rm,
// delta_kg }], next_plan: { recommended_weeks } }`.
export type ReportAnchor = {
  exerciseId: string;
  name: string;
  beforeE1rm: number | null;
  afterE1rm: number | null;
  deltaKg: number | null;
};

export type PlanReport = {
  planId: string | null;
  name: string | null;
  goal: TrainingGoal | null;
  goalTarget: PlanDetailGoal | null;
  adherencePct: number | null;
  sessionsDone: number;
  sessionsTotal: number;
  sessionsMissed: number;
  anchors: ReportAnchor[];
  // The weeks ELLIE recommends for the next plan (null: none).
  nextWeeks: 4 | 8 | 12 | null;
};

export function parsePlanReport(value: unknown, planIdFallback: string | null = null): PlanReport | null {
  const body = rec(value);
  if (!body) {
    return null;
  }
  const sessions = rec(body.sessions);
  const recommended = num(rec(body.next_plan)?.recommended_weeks);
  return {
    planId: str(body.plan_id) ?? planIdFallback,
    name: str(body.name),
    goal: TRAINING_GOALS.find(item => item === body.goal) ?? null,
    goalTarget: parsePlanDetailGoal(body.goal_target),
    adherencePct: num(body.adherence_pct),
    sessionsDone: num(sessions?.done) ?? 0,
    sessionsTotal: num(sessions?.total) ?? 0,
    sessionsMissed: num(sessions?.missed) ?? 0,
    anchors: list(body.anchors).flatMap(anchor => {
      const exerciseId = str(anchor.exercise_id);
      return exerciseId
        ? [
            {
              exerciseId,
              name: str(anchor.name) ?? '',
              beforeE1rm: num(anchor.before_e1rm),
              afterE1rm: num(anchor.after_e1rm),
              deltaKg: num(anchor.delta_kg),
            },
          ]
        : [];
    }),
    nextWeeks: recommended === 4 || recommended === 8 || recommended === 12 ? recommended : null,
  };
}

export async function fetchPlanReport(planId: string): Promise<PlanReport> {
  const body = await call('get_training_plan_report', { p_plan_id: planId });
  const report = parsePlanReport(body, planId);
  if (!report) {
    throw new TrainingPlanError('unknown', 'get_training_plan_report without a body');
  }
  return report;
}

// ── end_training_plan ───────────────────────────────────────────────────────
// `{ ok, state:'completed', plan_id, replayed, report }`: the report comes
// inside, so ending never needs a second call to show it.
export async function endTrainingPlan(
  clientId: string,
): Promise<ManageResult & { report: PlanReport | null }> {
  const body = await call('end_training_plan', { p_client_id: clientId });
  const planId = str(body.plan_id);
  return {
    planId,
    state: body.state === 'completed' ? 'completed' : null,
    replayed: body.replayed === true,
    report: parsePlanReport(body.report, planId),
  };
}
