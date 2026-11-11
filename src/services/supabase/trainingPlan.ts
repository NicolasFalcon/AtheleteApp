import { getSupabaseClient } from '@app/services/supabase/client';
import { isSessionType, type SessionType } from '@app/components/v2/SessionTypeChip';
import { parseMovedOut, type MovedOut } from '@app/features/week/weekModel';

// Plan de entrenamiento de 1 a 3 meses (docs/backend/TRAINING_PLAN_SHAPES.md,
// tp-1.2): the plan's state, the proposal card of ellie-chat, the preview
// before activating and the activation. Every RPC answers `{ ok, … }` or
// `{ ok:false, error:"code", … }` (flat), with auth.uid(). Writes carry a
// p_client_id and are idempotent per user + client id.

export type { SessionType };

export type TrainingPlanStateName = 'none' | 'active' | 'paused' | 'completed';

// training_plans.goal: the backend's canonical values (§3).
export type TrainingGoal = 'gain_muscle' | 'gain_strength' | 'lose_weight' | 'performance';

export const TRAINING_GOALS: readonly TrainingGoal[] = [
  'gain_muscle',
  'gain_strength',
  'lose_weight',
  'performance',
];

export type TrainingPlanWeeks = 4 | 8 | 12;
export type SessionMinutes = 45 | 60 | 75 | 90;

// training_plan_weeks.kind.
export type PlanWeekKind = 'calibracion' | 'carga' | 'descarga' | 'descarga_test';

const WEEK_KINDS: readonly PlanWeekKind[] = ['calibracion', 'carga', 'descarga', 'descarga_test'];

// training_plan_weeks.phase.
export type PlanPhase = 'base' | 'desarrollo' | 'pico';

const PHASES: readonly PlanPhase[] = ['base', 'desarrollo', 'pico'];

// ── Parsing helpers ─────────────────────────────────────────────────────────
export type Raw = Record<string, unknown>;

export const rec = (value: unknown): Raw | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Raw) : null;
export const str = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null;
export const num = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
};
export const list = (value: unknown): Raw[] =>
  Array.isArray(value) ? value.map(rec).filter((item): item is Raw => item !== null) : [];
export const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item !== '') : [];
const numbers = (value: unknown): number[] =>
  Array.isArray(value) ? value.map(num).filter((item): item is number => item !== null) : [];
// A YYYY-MM-DD date (a timestamp keeps only its day).
export const day = (value: unknown): string | null => {
  const text = str(value);
  return text && /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : null;
};

const goalOf = (value: unknown): TrainingGoal | null =>
  TRAINING_GOALS.find(item => item === value) ?? null;
const weekKindOf = (value: unknown): PlanWeekKind | null =>
  WEEK_KINDS.find(item => item === value) ?? null;
const phaseOf = (value: unknown): PlanPhase | null => PHASES.find(item => item === value) ?? null;

// Phase of a block when the server leaves it out (§4.2): 12 weeks base ·
// desarrollo · pico; 8 weeks base · pico; 4 weeks base.
export function phaseForBlock(blockIndex: number, blocks: number): PlanPhase {
  if (blockIndex <= 1) {
    return 'base';
  }
  if (blocks === 2) {
    return 'pico';
  }
  return blockIndex === 2 ? 'desarrollo' : 'pico';
}

// ── get_training_plan_state ─────────────────────────────────────────────────
export type TrainingPlanState = {
  state: TrainingPlanStateName;
  planId: string | null;
  name: string | null;
  weekIndex: number | null;
  weeks: number | null;
  blockIndex: number | null;
  phase: PlanPhase | null;
  // First day of the plan ("Empieza el …"; the plan may not have started).
  startDate: string | null;
  // Paused: the first local day of the pause, the day it ends and how many
  // weeks it moves the plan (1 or 2). All null outside a pause.
  pausedFrom: string | null;
  pausedUntil: string | null;
  pauseWeeks: 1 | 2 | null;
  endDate: string | null;
  readOnly: boolean;
  // entitlement.multi_week (§10). Today always true: no paywall.
  multiWeek: boolean;
};

export const NO_TRAINING_PLAN: TrainingPlanState = {
  state: 'none',
  planId: null,
  name: null,
  weekIndex: null,
  weeks: null,
  blockIndex: null,
  phase: null,
  startDate: null,
  pausedFrom: null,
  pausedUntil: null,
  pauseWeeks: null,
  endDate: null,
  readOnly: false,
  multiWeek: true,
};

const STATES: readonly TrainingPlanStateName[] = ['none', 'active', 'paused', 'completed'];

export function parseTrainingPlanState(body: Raw): TrainingPlanState {
  const entitlement = rec(body.entitlement);
  return {
    state: STATES.find(item => item === body.state) ?? 'none',
    planId: str(body.plan_id),
    name: str(body.name),
    weekIndex: num(body.week_index),
    weeks: num(body.weeks),
    blockIndex: num(body.block_index),
    phase: phaseOf(body.phase),
    startDate: day(body.start_date),
    pausedFrom: day(body.paused_from),
    pausedUntil: day(body.paused_until),
    pauseWeeks: num(body.pause_weeks) === 2 ? 2 : num(body.pause_weeks) === 1 ? 1 : null,
    endDate: day(body.end_date),
    readOnly: body.read_only === true,
    multiWeek: entitlement?.multi_week !== false,
  };
}

// ── training_plan_proposal (§4: the card of ellie-chat) ─────────────────────
export type TypicalDay = { weekday: number; type: SessionType | null; title: string };

export type PlanGoalTarget = {
  exerciseName: string;
  target: number;
  unit: string;
  startEstimate: number | null;
};

export type TrainingPlanProposal = {
  id: string;
  // The draft the card points to (§4: preview and activation read it).
  planId: string | null;
  version: number;
  adjustLabel: string | null;
  name: string;
  goal: TrainingGoal | null;
  goalFromProfile: boolean;
  weeks: number;
  blocks: number;
  // ISO 1..7.
  daysOfWeek: number[];
  sessionMinutes: number;
  split: string | null;
  startDate: string | null;
  endDate: string | null;
  totalSessions: number;
  deloads: number;
  hasTest: boolean;
  calibrationWeek: boolean;
  weekKinds: PlanWeekKind[];
  typicalWeek: TypicalDay[];
  goalTarget: PlanGoalTarget | null;
  reasoning: string;
  // <file key> of the cover (null: the app picks one by goal).
  cover: string | null;
  adjustChips: string[];
};

export function parseTrainingPlanProposal(
  id: string,
  payloadValue: unknown,
  meta: { version?: number | null; adjustLabel?: string | null } = {},
): TrainingPlanProposal | null {
  const payload = rec(payloadValue);
  if (!payload) {
    return null;
  }
  const daysOfWeek = numbers(payload.days_of_week).filter(value => value >= 1 && value <= 7);
  const weeks = num(payload.weeks) ?? 0;
  const weekKinds = strings(payload.week_kinds)
    .map(weekKindOf)
    .filter((kind): kind is PlanWeekKind => kind !== null);
  const target = rec(payload.goal_target);
  const targetValue = num(target?.target);
  return {
    id,
    planId: str(payload.plan_id),
    version: meta.version ?? 1,
    adjustLabel: meta.adjustLabel ?? null,
    name: str(payload.name) ?? '',
    goal: goalOf(payload.goal),
    goalFromProfile: payload.goal_from_profile === true,
    weeks,
    blocks: num(payload.blocks) ?? Math.max(1, Math.round(weeks / 4)),
    daysOfWeek,
    sessionMinutes: num(payload.session_minutes) ?? 0,
    split: str(payload.split),
    startDate: day(payload.start_date),
    endDate: day(payload.end_date),
    totalSessions: num(payload.total_sessions) ?? daysOfWeek.length * weeks,
    deloads: num(payload.deloads) ?? weekKinds.filter(kind => kind !== 'carga' && kind !== 'calibracion').length,
    hasTest: payload.has_test === true,
    calibrationWeek: payload.calibration_week === true,
    weekKinds,
    typicalWeek: list(payload.typical_week)
      .map(row => ({
        weekday: num(row.weekday) ?? 0,
        type: isSessionType(row.session_type) ? row.session_type : null,
        title: str(row.title) ?? '',
      }))
      .filter(row => row.weekday >= 1 && row.weekday <= 7),
    goalTarget:
      target && targetValue !== null
        ? {
            exerciseName: str(target.exercise_name) ?? '',
            target: targetValue,
            unit: str(target.unit) ?? 'kg',
            startEstimate: num(target.start_estimate),
          }
        : null,
    reasoning: str(payload.reasoning) ?? '',
    cover: str(payload.cover),
    adjustChips: strings(payload.adjust_chips),
  };
}

// ── get_training_plan_preview (§7 · 31.3) ──────────────────────────────────
export type PreviewSession = {
  date: string | null;
  type: SessionType | null;
  title: string;
  minutes: number | null;
};

export type PreviewWeek = {
  weekIndex: number;
  blockIndex: number;
  phase: PlanPhase;
  kind: PlanWeekKind;
  startDate: string | null;
  endDate: string | null;
  sessions: PreviewSession[];
};

export type ReplacedDay = { date: string; name: string };

export type TrainingPlanPreview = {
  name: string | null;
  weeks: number | null;
  daysOfWeek: number[];
  sessionMinutes: number | null;
  totalSessions: number;
  startDate: string | null;
  endDate: string | null;
  planWeeks: PreviewWeek[];
  // Sessions planned by hand on those dates (empty: no notice).
  replaces: ReplacedDay[];
};

function parsePreviewSession(row: Raw): PreviewSession {
  return {
    date: day(row.date),
    type: isSessionType(row.session_type) ? row.session_type : null,
    title: str(row.title) ?? '',
    minutes: num(row.minutes),
  };
}

// `{ ok, plan, replaces, weeks }`: weeks at the root, each `{ week_index,
// block_index, phase, kind, start_date, end_date, sessions: [{ id, date,
// title, session_type, minutes }] }`. The header comes from `plan` (id, name,
// status, goal, weeks, days_of_week, session_minutes, start_date, end_date…;
// no total_sessions, so it is counted from the weeks). An empty field falls
// back to the weeks themselves (count and first/last dates).
export function parseTrainingPlanPreview(body: Raw): TrainingPlanPreview {
  const plan = rec(body.plan) ?? {};
  const rows = list(body.weeks);
  const blocks = Math.max(1, Math.ceil(rows.length / 4));
  const planWeeks = rows
    .map((row, index): PreviewWeek => {
      const weekIndex = num(row.week_index) ?? index + 1;
      const blockIndex = num(row.block_index) ?? Math.ceil(weekIndex / 4);
      return {
        weekIndex,
        blockIndex,
        phase: phaseOf(row.phase) ?? phaseForBlock(blockIndex, blocks),
        kind: weekKindOf(row.kind) ?? 'carga',
        startDate: day(row.start_date),
        endDate: day(row.end_date),
        sessions: list(row.sessions).map(parsePreviewSession),
      };
    })
    .sort((a, b) => a.weekIndex - b.weekIndex);
  return {
    name: str(plan.name),
    weeks: num(plan.weeks) ?? (planWeeks.length || null),
    daysOfWeek: numbers(plan.days_of_week),
    sessionMinutes: num(plan.session_minutes),
    // `plan` has no total: the sessions of all the weeks.
    totalSessions: planWeeks.reduce((sum, week) => sum + week.sessions.length, 0),
    startDate: day(plan.start_date) ?? planWeeks[0]?.startDate ?? null,
    endDate: day(plan.end_date) ?? planWeeks[planWeeks.length - 1]?.endDate ?? null,
    planWeeks,
    // Sessions planned by hand on those dates (empty: no notice).
    replaces: list(body.replaces).flatMap(row => {
      const date = day(row.date);
      return date ? [{ date, name: str(row.name) ?? '' }] : [];
    }),
  };
}

// ── Errors ──────────────────────────────────────────────────────────────────
export type TrainingPlanErrorCode =
  | 'premium_required'
  | 'plan_active_exists'
  | 'week_has_sessions'
  | 'proposal_not_open'
  | 'plan_not_active'
  | 'pause_limit'
  | 'invalid_days'
  | 'invalid_duration'
  | 'not_found'
  | 'invalid_input'
  | 'unauthorized'
  | 'offline'
  | 'unknown';

const KNOWN: readonly TrainingPlanErrorCode[] = [
  'premium_required',
  'plan_active_exists',
  'week_has_sessions',
  'proposal_not_open',
  'plan_not_active',
  'pause_limit',
  'invalid_days',
  'invalid_duration',
  'not_found',
  'invalid_input',
  'unauthorized',
];

// week_has_sessions: a session planned on the plan's dates. `source` is
// 'coach' when a coach assigned it (then coachName names them).
export type PlannedSession = {
  date: string | null;
  name: string;
  source: string | null;
  coachName: string | null;
};

export class TrainingPlanError extends Error {
  readonly code: TrainingPlanErrorCode;
  // week_has_sessions.
  readonly sessions: PlannedSession[];
  // plan_active_exists: `plan.name`, the plan that is active now.
  readonly currentPlanName: string | null;
  constructor(
    code: TrainingPlanErrorCode,
    message?: string | null,
    extra: { sessions?: PlannedSession[]; currentPlanName?: string | null } = {},
  ) {
    super(message ?? code);
    this.name = 'TrainingPlanError';
    this.code = code;
    this.sessions = extra.sessions ?? [];
    this.currentPlanName = extra.currentPlanName ?? null;
  }
}

const isNetworkError = (error: unknown) =>
  /network|fetch|timed? ?out|offline/i.test(
    error instanceof Error ? error.message : String((error as { message?: unknown })?.message ?? error),
  );

function errorFrom(body: Raw): TrainingPlanError {
  const nested = rec(body.error);
  const raw = str(body.error) ?? str(nested?.code);
  const code = KNOWN.find(item => item === raw) ?? 'unknown';
  return new TrainingPlanError(code, str(nested?.message) ?? raw, {
    sessions: list(body.sessions ?? nested?.sessions).map(row => ({
      date: day(row.date),
      name: str(row.name) ?? '',
      source: str(row.source),
      coachName: str(row.coach_name),
    })),
    // plan_active_exists: `{ ok:false, error, plan: { plan_id, name } }`.
    currentPlanName: str(rec(body.plan)?.name),
  });
}

export async function call(name: string, args: Raw): Promise<Raw> {
  const client = getSupabaseClient() as unknown as {
    rpc: (
      rpc: string,
      params: object,
    ) => Promise<{ data: unknown; error: { message?: string; code?: string } | null }>;
  } | null;
  if (!client) {
    throw new TrainingPlanError('unknown', 'Supabase no está configurado.');
  }
  let response: Awaited<ReturnType<typeof client.rpc>>;
  try {
    response = await client.rpc(name, args);
  } catch (thrown) {
    throw new TrainingPlanError(isNetworkError(thrown) ? 'offline' : 'unknown', String(thrown));
  }
  const { data, error } = response;
  if (error) {
    throw new TrainingPlanError(
      error.code === '42501' ? 'unauthorized' : isNetworkError(error) ? 'offline' : 'unknown',
      error.message ?? null,
    );
  }
  const body = rec(data) ?? {};
  if (body.ok !== true) {
    throw errorFrom(body);
  }
  return body;
}

// ── RPC ─────────────────────────────────────────────────────────────────────
export async function fetchTrainingPlanState(): Promise<TrainingPlanState> {
  return parseTrainingPlanState(await call('get_training_plan_state', {}));
}

export async function fetchTrainingPlanPreview(proposalId: string): Promise<TrainingPlanPreview> {
  return parseTrainingPlanPreview(await call('get_training_plan_preview', { p_proposal_id: proposalId }));
}

// get_goal_target_estimates() → `{ ok, items: [{ exercise_slug, e1rm_kg,
// max_reps }] }`, always the four targets (bench, squat, deadlift,
// pull-ups); e1rm_kg and max_reps are nullable.
export type GoalTargetEstimate = {
  exerciseSlug: string;
  e1rmKg: number | null;
  maxReps: number | null;
};

export async function fetchGoalTargetEstimates(): Promise<GoalTargetEstimate[]> {
  const body = await call('get_goal_target_estimates', {});
  return list(body.items).flatMap(row => {
    const exerciseSlug = str(row.exercise_slug);
    return exerciseSlug ? [{ exerciseSlug, e1rmKg: num(row.e1rm_kg), maxReps: num(row.max_reps) }] : [];
  });
}

export type ActivatedPlan = {
  planId: string | null;
  state: TrainingPlanStateName | null;
  startDate: string | null;
  endDate: string | null;
  // Sessions planned by hand that the plan replaced (as the server sends them).
  replacedSessions: unknown[];
  // The same client id answered again (a retry that had gone through).
  replayed: boolean;
};

// activate_training_plan → `{ ok, plan_id, state, start_date, end_date,
// replaced_sessions, replayed }`. A new client id per attempt; the
// confirmation (after week_has_sessions or plan_active_exists) is another
// call with confirmReplace.
export async function activateTrainingPlan(args: {
  proposalId: string;
  clientId: string;
  confirmReplace?: boolean;
}): Promise<ActivatedPlan> {
  const body = await call('activate_training_plan', {
    p_proposal_id: args.proposalId,
    p_client_id: args.clientId,
    p_confirm_replace: args.confirmReplace ?? false,
  });
  return {
    planId: str(body.plan_id),
    state: STATES.find(item => item === body.state) ?? null,
    startDate: day(body.start_date),
    endDate: day(body.end_date),
    replacedSessions: Array.isArray(body.replaced_sessions) ? body.replaced_sessions : [],
    replayed: body.replayed === true,
  };
}

// ── get_training_plan (§7 · 31.6) ──────────────────────────────────────────
// `{ ok, plan, blocks: [{ block_index, phase, weeks: [{ week_index, kind,
// load, start_date, end_date }] }], progress_pct, adherence_pct,
// sessions_done, sessions_missed, sessions_total, goal_target, anchors: [{
// exercise_id, name, delta_kg, e1rm_by_week: [{ week_index, e1rm }],
// projection: [{ week_index, recommended_kg, rep_max }] }] }`.
export type PlanDetailWeek = {
  weekIndex: number;
  kind: PlanWeekKind;
  // Relative load of the week (the server's scale; the app normalises it).
  load: number | null;
  startDate: string | null;
  endDate: string | null;
};

export type PlanDetailBlock = { blockIndex: number; phase: PlanPhase; weeks: PlanDetailWeek[] };

export type PlanDetailGoal = {
  exerciseId: string | null;
  exerciseSlug: string | null;
  exerciseName: string | null;
  kind: 'kg' | 'reps';
  target: number;
  startEstimate: number | null;
};

export type PlanAnchor = {
  exerciseId: string;
  name: string;
  deltaKg: number | null;
  // Only the weeks with real sets carry a value (the rest come null).
  e1rmByWeek: { weekIndex: number; e1rm: number | null }[];
  // The planned load, apart from the e1RM already registered.
  projection: { weekIndex: number; recommendedKg: number | null; repMax: number | null }[];
};

export type TrainingPlanDetail = {
  planId: string | null;
  name: string | null;
  status: string | null;
  // The plan's header, for Gestionar el plan: its goal, its training days
  // (ISO 1..7) and the weeks of pause already used (max 2 in total; it comes
  // in the `plan` object of get_training_plan, never in the state).
  goal: TrainingGoal | null;
  daysOfWeek: number[];
  pauseWeeksUsed: number | null;
  weeks: number;
  startDate: string | null;
  endDate: string | null;
  blocks: PlanDetailBlock[];
  progressPct: number | null;
  adherencePct: number | null;
  sessionsDone: number;
  sessionsMissed: number;
  sessionsTotal: number;
  goalTarget: PlanDetailGoal | null;
  anchors: PlanAnchor[];
};

export function parsePlanDetailGoal(value: unknown): PlanDetailGoal | null {
  const row = rec(value);
  const target = num(row?.target);
  if (!row || target === null) {
    return null;
  }
  return {
    exerciseId: str(row.exercise_id),
    exerciseSlug: str(row.exercise_slug),
    exerciseName: str(row.exercise_name) ?? str(row.name),
    kind: row.kind === 'reps' ? 'reps' : 'kg',
    target,
    startEstimate: num(row.start_estimate),
  };
}

export function parseTrainingPlanDetail(body: Raw): TrainingPlanDetail {
  const plan = rec(body.plan) ?? {};
  const blocks = list(body.blocks)
    .map((block, index): PlanDetailBlock => {
      const blockIndex = num(block.block_index) ?? index + 1;
      return {
        blockIndex,
        phase: phaseOf(block.phase) ?? phaseForBlock(blockIndex, list(body.blocks).length),
        weeks: list(block.weeks)
          .map(week => ({
            weekIndex: num(week.week_index) ?? 0,
            kind: weekKindOf(week.kind) ?? 'carga',
            load: num(week.load),
            startDate: day(week.start_date),
            endDate: day(week.end_date),
          }))
          .filter(week => week.weekIndex > 0)
          .sort((a, b) => a.weekIndex - b.weekIndex),
      };
    })
    .sort((a, b) => a.blockIndex - b.blockIndex);
  const countedWeeks = blocks.reduce((sum, block) => sum + block.weeks.length, 0);
  return {
    planId: str(plan.id) ?? str(plan.plan_id),
    name: str(plan.name),
    status: str(plan.status),
    goal: goalOf(plan.goal),
    daysOfWeek: numbers(plan.days_of_week).filter(value => value >= 1 && value <= 7),
    pauseWeeksUsed: num(plan.pause_weeks_used),
    weeks: num(plan.weeks) ?? countedWeeks,
    startDate: day(plan.start_date),
    endDate: day(plan.end_date),
    blocks,
    progressPct: num(body.progress_pct),
    adherencePct: num(body.adherence_pct),
    sessionsDone: num(body.sessions_done) ?? 0,
    sessionsMissed: num(body.sessions_missed) ?? 0,
    sessionsTotal: num(body.sessions_total) ?? 0,
    goalTarget: parsePlanDetailGoal(body.goal_target),
    anchors: list(body.anchors).flatMap(anchor => {
      const exerciseId = str(anchor.exercise_id);
      return exerciseId
        ? [
            {
              exerciseId,
              name: str(anchor.name) ?? '',
              deltaKg: num(anchor.delta_kg),
              e1rmByWeek: list(anchor.e1rm_by_week).map(row => ({
                weekIndex: num(row.week_index) ?? 0,
                e1rm: num(row.e1rm),
              })),
              projection: list(anchor.projection).map(row => ({
                weekIndex: num(row.week_index) ?? 0,
                recommendedKg: num(row.recommended_kg),
                repMax: num(row.rep_max),
              })),
            },
          ]
        : [];
    }),
  };
}

export async function fetchTrainingPlanDetail(planId?: string | null): Promise<TrainingPlanDetail> {
  return parseTrainingPlanDetail(await call('get_training_plan', planId ? { p_plan_id: planId } : {}));
}

// ── get_training_plan_month (§7 · 31.5) ────────────────────────────────────
// `{ ok, plan, month, weeks: [{ week_index, kind, start_date, days: [{ date,
// session_type, status, moved, in_pause, added_routine, moved_out }] }] }`.
// The days come inside their week; `in_pause` marks the free days of a pause.
export type MonthDayStatus = 'done' | 'missed' | 'pending' | 'substituted' | 'skipped' | null;

export type PlanMonthDay = {
  date: string;
  type: SessionType | null;
  status: MonthDayStatus;
  // The session came here from another day.
  moved: boolean;
  inPause: boolean;
  addedRoutine: boolean;
  // The plan session that left this day for another (null: none).
  movedOut: MovedOut | null;
  // The plan week it belongs to.
  weekIndex: number;
};

export type PlanMonthWeek = {
  weekIndex: number;
  kind: PlanWeekKind;
  startDate: string | null;
};

export type PlanMonth = { weeks: PlanMonthWeek[]; days: PlanMonthDay[] };

export function monthStatusOf(value: unknown): MonthDayStatus {
  const text = typeof value === 'string' ? value.toLowerCase() : '';
  if (text.startsWith('done') || text.startsWith('complet')) {
    return 'done';
  }
  if (text.startsWith('miss')) {
    return 'missed';
  }
  if (text.startsWith('subst')) {
    return 'substituted';
  }
  if (text.startsWith('skip')) {
    return 'skipped';
  }
  return text ? 'pending' : null;
}

export function parsePlanMonth(body: Raw): PlanMonth {
  const weeks: PlanMonthWeek[] = [];
  const days: PlanMonthDay[] = [];
  list(body.weeks).forEach(row => {
    const weekIndex = num(row.week_index);
    if (weekIndex === null) {
      return;
    }
    weeks.push({
      weekIndex,
      kind: weekKindOf(row.kind) ?? 'carga',
      startDate: day(row.start_date),
    });
    list(row.days).forEach(item => {
      const date = day(item.date);
      if (!date) {
        return;
      }
      days.push({
        date,
        type: isSessionType(item.session_type) ? item.session_type : null,
        status: monthStatusOf(item.status),
        moved: item.moved === true,
        inPause: item.in_pause === true,
        addedRoutine: item.added_routine !== null && item.added_routine !== undefined && item.added_routine !== false,
        movedOut: parseMovedOut(item.moved_out),
        weekIndex,
      });
    });
  });
  return { weeks, days };
}

// `month`: any date of the month; the RPC takes its first day.
export async function fetchTrainingPlanMonth(month: string): Promise<PlanMonth> {
  return parsePlanMonth(await call('get_training_plan_month', { p_month: `${month.slice(0, 7)}-01` }));
}

// ── resume_training_plan(p_client_id) ──────────────────────────────────────
// Back to `active` from today; the pending sessions move to the next
// training days. Errors: plan_not_active.
export async function resumeTrainingPlan(clientId: string): Promise<void> {
  await call('resume_training_plan', { p_client_id: clientId });
}


// ── Gestionar el plan (31.11) ──────────────────────────────────────────────
// Every write carries a p_client_id (idempotent per user + client id); the
// same id on a retry answers the same result with `replayed: true`.

export type ManageResult = {
  planId: string | null;
  state: TrainingPlanStateName | null;
  replayed: boolean;
};

const manageResult = (body: Raw): ManageResult => ({
  planId: str(body.plan_id),
  state: STATES.find(item => item === body.state) ?? null,
  replayed: body.replayed === true,
});

// pause_training_plan(p_weeks, p_client_id) → `{ ok, plan_id, state:
// 'paused', paused_until, replayed }`. Errors: pause_limit (the two weeks are
// used), plan_not_active.
export async function pauseTrainingPlan(
  weeks: 1 | 2,
  clientId: string,
): Promise<ManageResult & { pausedUntil: string | null }> {
  const body = await call('pause_training_plan', { p_weeks: weeks, p_client_id: clientId });
  return { ...manageResult(body), pausedUntil: day(body.paused_until) };
}

// change_plan_days(p_days, p_client_id) → `{ ok, plan_id, days_of_week,
// replayed }`. p_days: ISO 1..7, from 2 to 6. Error: invalid_days.
export async function changePlanDays(
  days: number[],
  clientId: string,
): Promise<ManageResult & { daysOfWeek: number[] }> {
  const body = await call('change_plan_days', { p_days: days, p_client_id: clientId });
  return { ...manageResult(body), daysOfWeek: numbers(body.days_of_week) };
}

// change_plan_goal_duration(p_goal, p_weeks, p_client_id) → `{ ok, plan_id,
// goal, weeks, replayed }`. Error: invalid_duration (shorter than the weeks
// already done).
export async function changePlanGoalDuration(
  args: { goal: TrainingGoal; weeks: TrainingPlanWeeks; clientId: string },
): Promise<ManageResult & { goal: TrainingGoal | null; weeks: number | null }> {
  const body = await call('change_plan_goal_duration', {
    p_goal: args.goal,
    p_weeks: args.weeks,
    p_client_id: args.clientId,
  });
  return { ...manageResult(body), goal: goalOf(body.goal), weeks: num(body.weeks) };
}

// save_plan_session_to_routines(p_plan_session_id, p_client_id) → `{ ok,
// routine_id, replayed }`.
export async function savePlanSessionToRoutines(
  planSessionId: string,
  clientId: string,
): Promise<{ routineId: string | null; replayed: boolean }> {
  const body = await call('save_plan_session_to_routines', {
    p_plan_session_id: planSessionId,
    p_client_id: clientId,
  });
  return { routineId: str(body.routine_id), replayed: body.replayed === true };
}
