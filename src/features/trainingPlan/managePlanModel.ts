import { FEATURES } from '@app/lib/config/features';
import { addDays } from '@app/features/week/weekModel';
import type { TrainingPlanCopyKey } from '@app/features/trainingPlan/trainingPlanCopy';
import type {
  TrainingGoal,
  TrainingPlanDetail,
  TrainingPlanErrorCode,
  TrainingPlanState,
  TrainingPlanWeeks,
} from '@app/services/supabase/trainingPlan';

// Pure rules of Gestionar el plan (handoff v2.21 §31.11) and of the free
// version (§31.12): what the sheet offers by the plan's state, the pause
// options with the new end date, the durations still allowed, the training
// days, the error messages and the paywall rule.

// Gestionar el plan (31.11): the five writes of the sheet.
export type ManageRequest =
  | { kind: 'pause'; weeks: 1 | 2 }
  | { kind: 'resume' }
  | { kind: 'days'; days: number[] }
  | { kind: 'goal'; goal: TrainingGoal; weeks: TrainingPlanWeeks }
  | { kind: 'end' };

// The same request again is a retry: it reuses its p_client_id (a retry that
// had already gone through answers `replayed: true`). A different request, or
// the same one after it succeeded, gets a new id.
export const requestKey = (request: ManageRequest): string => {
  switch (request.kind) {
    case 'pause':
      return `pause:${request.weeks}`;
    case 'days':
      return `days:${[...request.days].sort((a, b) => a - b).join(',')}`;
    case 'goal':
      return `goal:${request.goal}:${request.weeks}`;
    default:
      return request.kind;
  }
};

// ── What the sheet offers ───────────────────────────────────────────────────
export type ManageActions = {
  pause: boolean;
  resume: boolean;
  days: boolean;
  goal: boolean;
  end: boolean;
};

const NO_ACTIONS: ManageActions = { pause: false, resume: false, days: false, goal: false, end: false };

// active → Pausar; paused → Retomar instead of Pausar; read_only (the athlete
// stopped paying with a plan active, §10) → only Terminar antes; no plan or
// finished → nothing to manage.
export function manageActions(state: TrainingPlanState | null | undefined): ManageActions {
  if (!state || (state.state !== 'active' && state.state !== 'paused')) {
    return NO_ACTIONS;
  }
  if (state.readOnly) {
    return { ...NO_ACTIONS, end: true };
  }
  const paused = state.state === 'paused';
  return { pause: !paused, resume: paused, days: true, goal: true, end: true };
}

// ── Pausar (max 2 weeks in total) ───────────────────────────────────────────
export const MAX_PAUSE_WEEKS = 2;

// Weeks of pause already used: `plan.pause_weeks_used` of get_training_plan.
// Until the plan is read it counts as 0 (and pause_limit has the last word).
export function pauseWeeksUsed(detail: TrainingPlanDetail | null | undefined): number {
  return Math.min(MAX_PAUSE_WEEKS, Math.max(0, detail?.pauseWeeksUsed ?? 0));
}

export type PauseOption = {
  weeks: 1 | 2;
  enabled: boolean;
  // The plan's end date once paused that many weeks (null: no end date known).
  newEnd: string | null;
};

// 1 or 2 weeks; one that goes over the 2 weeks in total is disabled. The new
// end date is the current one moved by the weeks of the pause.
export function pauseOptions(used: number, endDate: string | null): PauseOption[] {
  const left = MAX_PAUSE_WEEKS - used;
  return ([1, 2] as const).map(weeks => ({
    weeks,
    enabled: weeks <= left,
    newEnd: endDate ? addDays(endDate, weeks * 7) : null,
  }));
}

// ── Cambiar días ────────────────────────────────────────────────────────────
export const MIN_PLAN_DAYS = 2;
export const MAX_PLAN_DAYS = 6;
// ISO weekdays, Monday first: the chips L – D.
export const ISO_DAYS: readonly number[] = [1, 2, 3, 4, 5, 6, 7];

const sorted = (days: readonly number[]) => [...days].sort((a, b) => a - b);

// Tap on a chip: marks or unmarks it, never above 6 days (a 7th is ignored);
// unmarking below 2 is allowed (the save button then stays off).
export function toggleDay(days: readonly number[], day: number): number[] {
  if (days.includes(day)) {
    return days.filter(item => item !== day);
  }
  return days.length >= MAX_PLAN_DAYS ? sorted(days) : sorted([...days, day]);
}

export const validDayCount = (days: readonly number[]) =>
  days.length >= MIN_PLAN_DAYS && days.length <= MAX_PLAN_DAYS;

export const sameDays = (a: readonly number[], b: readonly number[]) =>
  a.length === b.length && sorted(a).every((day, index) => day === sorted(b)[index]);

export const canSaveDays = (days: readonly number[], current: readonly number[]) =>
  validDayCount(days) && !sameDays(days, current);

// ── Cambiar objetivo o duración ─────────────────────────────────────────────
export const PLAN_DURATIONS: readonly TrainingPlanWeeks[] = [4, 8, 12];

// The week the athlete is in (week_index of the state) counts as started:
// a duration shorter than it is not offered ("las duraciones menores que lo
// hecho no aparecen"). No week yet (the plan has not started): all three.
export function durationOptions(weekIndex: number | null | undefined): TrainingPlanWeeks[] {
  const done = weekIndex ?? 0;
  return PLAN_DURATIONS.filter(weeks => weeks >= done);
}

// The duration to start from: the plan's own when it is still offered, else
// the first one offered.
export function initialDuration(
  weeks: number | null | undefined,
  options: readonly TrainingPlanWeeks[],
): TrainingPlanWeeks | null {
  return options.find(item => item === weeks) ?? options[0] ?? null;
}

export function goalDurationChanged(
  current: { goal: TrainingGoal | null; weeks: number | null },
  next: { goal: TrainingGoal | null; weeks: number | null },
): boolean {
  return current.goal !== next.goal || current.weeks !== next.weeks;
}

// ── Terminar antes ──────────────────────────────────────────────────────────
// What the plan carries so far: weeks done (the one in course is not done
// yet) and sessions done, from get_training_plan.
export function endSummary(
  state: TrainingPlanState | null | undefined,
  detail: TrainingPlanDetail | null | undefined,
): { weeksDone: number; weeks: number; sessionsDone: number; sessionsTotal: number } {
  const weeks = state?.weeks ?? detail?.weeks ?? 0;
  const weeksDone = Math.min(weeks, Math.max(0, (state?.weekIndex ?? 1) - 1));
  return {
    weeksDone,
    weeks,
    sessionsDone: detail?.sessionsDone ?? 0,
    sessionsTotal: detail?.sessionsTotal ?? 0,
  };
}

// ── Errors ──────────────────────────────────────────────────────────────────
// A message of its own for the codes of these RPCs; anything else, generic.
export function manageErrorKey(code: TrainingPlanErrorCode | null | undefined): TrainingPlanCopyKey {
  switch (code) {
    case 'pause_limit':
      return 'manage.err.pauseLimit';
    case 'invalid_days':
      return 'manage.err.invalidDays';
    case 'invalid_duration':
      return 'manage.err.invalidDuration';
    case 'plan_not_active':
      return 'manage.err.notActive';
    default:
      return 'manage.err.generic';
  }
}

// ── Versión gratis (31.12) ──────────────────────────────────────────────────
// Mes, Plan and Crear plan are locked with the flag on, or when the state
// says the athlete has no multi-week entitlement. Flag off and multi_week
// true (today): nothing is locked. Unknown state: not locked.
export function isPlanPaywalled(state: TrainingPlanState | null | undefined): boolean {
  return FEATURES.trainingPlanPaywall || state?.multiWeek === false;
}

// get_training_plan answers premium_required when the athlete has no
// multi-week entitlement (§10), yet a read_only plan must stay visible. The
// week view then runs on what the state itself says (name, weeks, dates).
export function detailFromState(state: TrainingPlanState): TrainingPlanDetail {
  return {
    planId: state.planId,
    name: state.name,
    status: state.state,
    goal: null,
    daysOfWeek: [],
    pauseWeeksUsed: null,
    weeks: state.weeks ?? 0,
    startDate: state.startDate,
    endDate: state.endDate,
    blocks: [],
    progressPct: null,
    adherencePct: null,
    sessionsDone: 0,
    sessionsMissed: 0,
    sessionsTotal: 0,
    goalTarget: null,
    anchors: [],
  };
}
