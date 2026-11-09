import { isSessionType, type SessionType } from '@app/components/v2/SessionTypeChip';
import {
  call,
  day,
  list,
  num,
  rec,
  str,
  type Raw,
} from '@app/services/supabase/trainingPlan';

// Sesión del plan (docs/backend/TRAINING_PLAN_SHAPES.md, tp-1.2 §7 · 31.7) y
// ajustes del plan (31.8): get_plan_session, start_plan_session,
// get_plan_session_outcome, list_plan_adjustments and respond_plan_adjustment.
// The first three have their shape confirmed with the real backend; the two
// of the adjustments do NOT yet (see parseAdjustment).

const PLAN_STATUSES = ['pending', 'done', 'missed', 'substituted', 'skipped', 'paused'] as const;
export type PlanSessionStatusName = (typeof PLAN_STATUSES)[number];

// ── get_plan_session (31.7) ─────────────────────────────────────────────────
export type PlanSessionExercise = {
  block: 'warmup' | 'main';
  position: number;
  exerciseId: string;
  name: string;
  // Media key of the catalog thumbnail.
  image: string | null;
  sets: number;
  repMin: number | null;
  repMax: number | null;
  rir: number | null;
  restS: number | null;
  // null: bodyweight (calibrate false) or to calibrate (calibrate true).
  recommendedKg: number | null;
  calibrate: boolean;
  isAnchor: boolean;
  // The last session of the exercise: `{ kg, reps }`. `last_time.sets` is the
  // historic total, not the sets of that session, so it is never read.
  lastTime: { kg: number | null; reps: number } | null;
};

export type PlanSessionDetail = {
  id: string;
  planId: string | null;
  planName: string | null;
  weekIndex: number | null;
  date: string | null;
  originalDate: string | null;
  moved: boolean;
  type: SessionType | null;
  status: PlanSessionStatusName;
  title: string;
  minutes: number | null;
  banners: { calibration: boolean; deload: boolean };
  exercises: PlanSessionExercise[];
};

function parseLastTime(value: unknown): PlanSessionExercise['lastTime'] {
  const row = rec(value);
  const reps = num(row?.reps);
  if (!row || reps === null || reps <= 0) {
    return null;
  }
  const kg = num(row.kg);
  return { kg: kg !== null && kg > 0 ? kg : null, reps };
}

export function parsePlanSession(body: Raw): PlanSessionDetail | null {
  const row = rec(body.session);
  const id = str(row?.id);
  if (!row || !id) {
    return null;
  }
  const banners = rec(row.banners);
  return {
    id,
    planId: str(row.plan_id),
    planName: str(row.plan_name),
    weekIndex: num(row.week_index),
    date: day(row.date),
    originalDate: day(row.original_date),
    moved: row.moved === true,
    type: isSessionType(row.session_type) ? row.session_type : null,
    status: PLAN_STATUSES.find(item => item === row.status) ?? 'pending',
    title: str(row.title) ?? '',
    minutes: num(row.minutes),
    banners: { calibration: banners?.calibration === true, deload: banners?.deload === true },
    exercises: list(row.exercises)
      .flatMap((item): PlanSessionExercise[] => {
        const exerciseId = str(item.exercise_id);
        if (!exerciseId) {
          return [];
        }
        return [
          {
            block: item.block === 'warmup' ? 'warmup' : 'main',
            position: num(item.position) ?? 0,
            exerciseId,
            name: str(item.name) ?? '',
            image: str(item.image),
            sets: num(item.sets) ?? 0,
            repMin: num(item.rep_min),
            repMax: num(item.rep_max),
            rir: num(item.rir),
            restS: num(item.rest_s),
            recommendedKg: num(item.recommended_kg),
            calibrate: item.calibrate === true,
            isAnchor: item.is_anchor === true,
            lastTime: parseLastTime(item.last_time),
          },
        ];
      })
      .sort((a, b) => a.position - b.position),
  };
}

export async function fetchPlanSession(planSessionId: string): Promise<PlanSessionDetail | null> {
  return parsePlanSession(await call('get_plan_session', { p_plan_session_id: planSessionId }));
}

// ── start_plan_session ──────────────────────────────────────────────────────
export type StartedPlanSession = {
  sessionId: string | null;
  // `workout.id`: the routine the session screen reads with get_routine.
  workoutId: string | null;
};

// A new client id per attempt; a retry of the same attempt sends the same one.
export async function startPlanSession(
  planSessionId: string,
  clientId: string,
): Promise<StartedPlanSession> {
  const body = await call('start_plan_session', {
    p_plan_session_id: planSessionId,
    p_client_id: clientId,
  });
  return { sessionId: str(body.session_id), workoutId: str(rec(body.workout)?.id) };
}

// ── get_plan_session_outcome (31.7 · "Próxima vez") ─────────────────────────
export type OutcomeChange = 'up' | 'same' | 'down' | 'reps_up' | 'variant';

const CHANGES: readonly OutcomeChange[] = ['up', 'same', 'down', 'reps_up', 'variant'];

export type PlanOutcomeExercise = {
  exerciseId: string | null;
  name: string;
  change: OutcomeChange;
  nextKg: number | null;
  nextReps: number | null;
  nextVariantId: string | null;
  nextVariantName: string | null;
  reason: string | null;
};

export type PlanOutcome = { summary: string | null; exercises: PlanOutcomeExercise[] };

export function parsePlanOutcome(body: Raw): PlanOutcome {
  return {
    summary: str(body.summary),
    exercises: list(body.exercises).map(item => ({
      exerciseId: str(item.exercise_id),
      name: str(item.name) ?? '',
      change: CHANGES.find(change => change === item.change) ?? 'same',
      nextKg: num(item.next_kg),
      nextReps: num(item.next_reps),
      nextVariantId: str(item.next_variant_id),
      nextVariantName: str(item.next_variant_name),
      reason: str(item.reason),
    })),
  };
}

export async function fetchPlanOutcome(workoutSessionId: string): Promise<PlanOutcome> {
  return parsePlanOutcome(await call('get_plan_session_outcome', { p_workout_session_id: workoutSessionId }));
}

// ── Ajustes del plan (31.8) ─────────────────────────────────────────────────
export type AdjustmentKind = 'variant_stall' | 'deload_early' | 'missed_session' | 'repeat_week' | 'discomfort';

const KINDS: readonly AdjustmentKind[] = [
  'variant_stall',
  'deload_early',
  'missed_session',
  'repeat_week',
  'discomfort',
];

export type AdjustmentStatus = 'open' | 'approved' | 'rejected' | 'applied' | 'reverted' | 'expired';

const STATUSES: readonly AdjustmentStatus[] = ['open', 'approved', 'rejected', 'applied', 'reverted', 'expired'];

export type AdjustmentAction = 'approve' | 'reject' | 'move_today' | 'skip' | 'revert' | 'ack';

export type PlanAdjustment = {
  id: string;
  kind: AdjustmentKind;
  status: AdjustmentStatus;
  createdAt: string | null;
  respondedAt: string | null;
  // From `payload` (the contract only says "antes → después, sesiones
  // afectadas, motivo"; the keys below are not confirmed, so any of them may
  // come null and the card then shows what it has).
  reason: string | null;
  before: string | null;
  after: string | null;
  weekIndex: number | null;
  sessions: string[];
};

// A scalar or the name of a small object, as a line of text.
function line(value: unknown): string | null {
  if (typeof value === 'string') {
    return str(value);
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  const row = rec(value);
  return str(row?.name) ?? str(row?.title) ?? str(row?.label);
}

const firstLine = (row: Raw | null, keys: string[]): string | null => {
  for (const key of keys) {
    const found = line(row?.[key]);
    if (found) {
      return found;
    }
  }
  return null;
};

export function parseAdjustment(value: unknown): PlanAdjustment | null {
  const row = rec(value);
  const id = str(row?.id) ?? str(row?.adjustment_id);
  const kind = KINDS.find(item => item === row?.kind);
  if (!row || !id || !kind) {
    return null;
  }
  const payload = rec(row.payload);
  const affected = payload?.sessions ?? payload?.affected_sessions;
  return {
    id,
    kind,
    status: STATUSES.find(item => item === row.status) ?? 'open',
    createdAt: str(row.created_at),
    respondedAt: str(row.responded_at),
    reason: firstLine(payload, ['reason', 'motivo', 'explanation', 'message']),
    before: firstLine(payload, ['before', 'from', 'antes']),
    after: firstLine(payload, ['after', 'to', 'despues', 'después']),
    weekIndex: num(payload?.week_index) ?? num(payload?.week),
    sessions: Array.isArray(affected)
      ? affected.map(line).filter((item): item is string => item !== null)
      : [],
  };
}

// `list_plan_adjustments` answers "las abiertas y las aplicadas recientes":
// the rows are read from any of the lists the answer may carry.
export function parseAdjustments(body: Raw): PlanAdjustment[] {
  const seen = new Set<string>();
  return ['adjustments', 'items', 'open', 'applied', 'recent']
    .flatMap(key => (Array.isArray(body[key]) ? (body[key] as unknown[]) : []))
    .flatMap(item => {
      const parsed = parseAdjustment(item);
      if (!parsed || seen.has(parsed.id)) {
        return [];
      }
      seen.add(parsed.id);
      return [parsed];
    });
}

export async function fetchPlanAdjustments(planId?: string | null): Promise<PlanAdjustment[]> {
  return parseAdjustments(await call('list_plan_adjustments', planId ? { p_plan_id: planId } : {}));
}

export async function respondPlanAdjustment(args: {
  adjustmentId: string;
  action: AdjustmentAction;
  clientId: string;
}): Promise<void> {
  await call('respond_plan_adjustment', {
    p_adjustment_id: args.adjustmentId,
    p_action: args.action,
    p_client_id: args.clientId,
  });
}
