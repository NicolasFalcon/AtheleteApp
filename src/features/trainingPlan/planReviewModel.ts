import { addDays } from '@app/features/week/weekModel';
import type { WeekPlan } from '@app/features/week/weekModel';
import { getLocalDateKey } from '@app/lib/date';
import type { PersonalRecord } from '@app/shared';
import type { PlanAnchor, PlanDetailGoal, TrainingGoal, TrainingPlanDetail } from '@app/services/supabase/trainingPlan';
import type { PlanReport, ReportAnchor } from '@app/services/supabase/trainingPlanReview';
import type { PlanAdjustment } from '@app/services/supabase/trainingPlanSession';

// Pure rules of the weekly review (handoff v2.21 §31.9) and of the final
// report (§31.10): what improved, which records belong to a week or to the
// plan, how the goal is judged, and what the next plan proposes.

// ── Revisión semanal ────────────────────────────────────────────────────────
// "YYYY-MM-DD" (local) of a timestamp: the day a review or a record belongs to.
export function localDayOf(timestamp: string | null | undefined): string | null {
  if (!timestamp) {
    return null;
  }
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : getLocalDateKey(date);
}

// First and last day of a plan week (get_training_plan's blocks); a week
// without an end date ends 6 days after its start.
export function weekBounds(
  detail: TrainingPlanDetail | null | undefined,
  weekIndex: number,
): { start: string; end: string } | null {
  const week = detail?.blocks.flatMap(block => block.weeks).find(item => item.weekIndex === weekIndex);
  if (!week?.startDate) {
    return null;
  }
  return { start: week.startDate, end: week.endDate ?? addDays(week.startDate, 6) };
}

// "Ver semana {n+1}": the Monday of the next week, null on the last one.
export function nextWeekStart(detail: TrainingPlanDetail | null | undefined, weekIndex: number): string | null {
  return weekBounds(detail, weekIndex + 1)?.start ?? null;
}

// Sessions the plan had in that week: the days of get_week_plan that carry a
// plan session (a paused one is not planned). Without that week: what the
// review itself counted, done + missed.
export function plannedSessions(week: WeekPlan | null | undefined, done: number, missed: number): number {
  if (!week) {
    return done + missed;
  }
  const planned = week.days.filter(day => day.planSession && day.planSession.status !== 'paused').length;
  return Math.max(planned, done);
}

export type ImprovedAnchor = {
  exerciseId: string;
  name: string;
  e1rm: number;
  // Against the previous registered week (null: it is the first record).
  delta: number | null;
};

const round = (value: number) => Math.round(value * 2) / 2;

// The estimated 1RM of each anchor in that week against the last week before
// it that has one. Only what went up (or its first record) is shown; an
// anchor without a value in that week is left out.
export function improvedAnchors(anchors: PlanAnchor[], weekIndex: number): ImprovedAnchor[] {
  return anchors.flatMap(anchor => {
    const rows = anchor.e1rmByWeek.filter((row): row is { weekIndex: number; e1rm: number } => row.e1rm !== null);
    const current = rows.find(row => row.weekIndex === weekIndex);
    if (!current) {
      return [];
    }
    const before = rows
      .filter(row => row.weekIndex < weekIndex)
      .sort((a, b) => b.weekIndex - a.weekIndex)[0];
    const delta = before ? round(current.e1rm) - round(before.e1rm) : null;
    if (delta !== null && delta <= 0) {
      return [];
    }
    return [{ exerciseId: anchor.exerciseId, name: anchor.name, e1rm: round(current.e1rm), delta }];
  });
}

// Personal records set on the dates of a range (by the local day of their
// recorded_at), newest first.
export function recordsBetween(records: PersonalRecord[], from: string, to: string): PersonalRecord[] {
  return records
    .filter(record => {
      const day = localDayOf(record.recordedAt);
      return day !== null && day >= from && day <= to;
    })
    .sort((a, b) => (a.recordedAt < b.recordedAt ? 1 : -1));
}

// Applied adjustments ("Ajustes automáticos") and open ones ("Para revisar").
export function reviewAdjustments(adjustments: PlanAdjustment[]): {
  applied: PlanAdjustment[];
  open: PlanAdjustment[];
} {
  return {
    applied: adjustments.filter(item => item.status === 'applied'),
    open: adjustments.filter(item => item.status === 'open'),
  };
}

// "24,6" of 24 600 kg: the volume in tonnes with one decimal, a comma in es.
export function volumeTonnes(volumeKg: number, language: 'es' | 'en'): string {
  const value = (Math.round(volumeKg / 100) / 10).toFixed(1);
  return language === 'es' ? value.replace('.', ',') : value;
}

// ── Reporte final ───────────────────────────────────────────────────────────
// The plan's records are the ones between its start and its end (never past
// today: ended early, the plan's end date can be ahead).
export function reportRange(
  detail: TrainingPlanDetail | null | undefined,
  today: string,
): { from: string; to: string } | null {
  if (!detail?.startDate) {
    return null;
  }
  const end = detail.endDate && detail.endDate < today ? detail.endDate : today;
  return { from: detail.startDate, to: end };
}

export type GoalVerdict = {
  name: string;
  kind: 'kg' | 'reps';
  target: number;
  // The 1RM the anchor ended with (kg goals only).
  reached: number | null;
  // true / false for a kg goal with data; null when it cannot be told.
  achieved: boolean | null;
};

// The anchor a goal target belongs to: by exercise id, else by name.
function anchorOfGoal(goal: PlanDetailGoal, anchors: ReportAnchor[]): ReportAnchor | null {
  return (
    anchors.find(anchor => goal.exerciseId !== null && anchor.exerciseId === goal.exerciseId) ??
    anchors.find(
      anchor => goal.exerciseName !== null && anchor.name.toLowerCase() === goal.exerciseName.toLowerCase(),
    ) ??
    null
  );
}

// "Meta": only when goal_target is not null. A kg goal is compared with the
// anchor's after_e1rm and says whether it was reached. A reps goal (pull-ups)
// has no e1RM to compare, so it only states the target.
export function goalVerdict(report: PlanReport): GoalVerdict | null {
  const goal = report.goalTarget;
  if (!goal) {
    return null;
  }
  const anchor = anchorOfGoal(goal, report.anchors);
  const name = goal.exerciseName ?? anchor?.name ?? '';
  if (goal.kind === 'reps') {
    return { name, kind: 'reps', target: goal.target, reached: null, achieved: null };
  }
  const reached = anchor?.afterE1rm ?? null;
  return {
    name,
    kind: 'kg',
    target: goal.target,
    reached: reached !== null ? round(reached) : null,
    achieved: reached !== null ? reached >= goal.target : null,
  };
}

export type AnchorLine =
  | { kind: 'insufficient'; name: string }
  | { kind: 'values'; name: string; before: number; after: number; delta: number };

// "Antes y después": before → after with the chip "+{delta_kg} kg". With
// before_e1rm or after_e1rm null there is not enough data.
export function anchorLine(anchor: ReportAnchor): AnchorLine {
  if (anchor.beforeE1rm === null || anchor.afterE1rm === null) {
    return { kind: 'insufficient', name: anchor.name };
  }
  const before = round(anchor.beforeE1rm);
  const after = round(anchor.afterE1rm);
  return { kind: 'values', name: anchor.name, before, after, delta: anchor.deltaKg ?? after - before };
}

// The three anchors of the Stories sticker: the ones with both values, by
// biggest improvement.
export function stickerAnchors(anchors: ReportAnchor[]): { name: string; after: number; delta: number }[] {
  return anchors
    .map(anchorLine)
    .flatMap(line => (line.kind === 'values' ? [{ name: line.name, after: line.after, delta: line.delta }] : []))
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 3);
}

// The next plan the report proposes: the goal of this plan and the weeks the
// server recommends (8 when it sends none). Pre-selects Crear plan.
export function nextPlan(report: PlanReport): { goal: TrainingGoal | null; weeks: 4 | 8 | 12 } {
  return { goal: report.goal, weeks: report.nextWeeks ?? 8 };
}

// "Sin registros suficientes" / the chip: "+15" / "+17,5" / "-2,5".
export function signedKg(value: number, language: 'es' | 'en'): string {
  const text = Number.isInteger(value) ? String(Math.abs(value)) : Math.abs(value).toFixed(1);
  const shown = language === 'es' ? text.replace('.', ',') : text;
  return `${value < 0 ? '-' : '+'}${shown}`;
}
