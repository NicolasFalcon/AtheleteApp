import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalDateKey } from '@app/lib/date';
import {
  completedExerciseIds,
  type LoggedSet,
  type PlannedExercise,
} from '@app/features/session/sessionModel';
import {
  buildExerciseRows,
  buildVariantPatch,
  buildSetRow,
  mapSetRows,
  fromDbPosition,
  toDbPosition,
} from '@app/features/session/sessionDbMapping';
import {
  runOutbox,
  type Queued,
  type RunOptions,
} from '@app/features/session/sessionOutbox';
import { getSupabaseClient } from '@app/services/supabase/client';
import { mapWorkoutSession } from '@app/services/supabase/fitness';
import {
  awardGamificationEvent,
  awardGamificationEventBestEffort,
  type GamificationAwardResult,
} from '@app/services/supabase/gamification';
import type { PRType, WorkoutSession } from '@app/shared';
import type { BodyZone, Effort } from '@app/features/session/restMessages';
import type { Database } from '@app/types/supabase';

// Workout Session v2 · per-set persistence (BACKEND_SUMMARY §1 "Series por
// ejercicio", §3.5). The legacy `completed_exercises` keeps being written.

type SessionRow = Database['public']['Tables']['workout_sessions']['Row'];
type SetRow = Database['public']['Tables']['workout_session_sets']['Row'];

function getClient() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase no está configurado.');
  }
  return client;
}

export type SessionClockFields = {
  startedAt: number;
  pausedTotalSec: number;
  pausedAt: number | null;
};

export type SessionDetail = {
  session: WorkoutSession;
  clock: SessionClockFields;
  volumeKg: number | null;
  sets: LoggedSet[];
  // Library exercise of each position (sets only carry the position), and
  // the warm-up sets (left out of the exercise list of the summary).
  exerciseByPosition: Record<number, string | null>;
  warmupSetIds: string[];
  // Final 1–5 rating (sfb-1: workout_sessions.rating, rating_note,
  // rated_at). null when the session was never rated.
  rating: SessionRatingRead | null;
  // workout_sessions.plan_session_id: the session of the training plan this
  // one came from (null: a routine session).
  planSessionId: string | null;
};

export type SessionRatingRead = { value: number; note: string | null; ratedAt: string | null };

// rating / rating_note / rated_at are not in the generated Database types
// yet, so they are read from the raw row.
function ratingOf(row: SessionRow): SessionRatingRead | null {
  const raw = row as unknown as { rating?: unknown; rating_note?: unknown; rated_at?: unknown };
  const value = typeof raw.rating === 'number' && raw.rating >= 1 && raw.rating <= 5 ? Math.round(raw.rating) : null;
  if (value === null) {
    return null;
  }
  return {
    value,
    note: typeof raw.rating_note === 'string' && raw.rating_note.trim() ? raw.rating_note.trim() : null,
    ratedAt: typeof raw.rated_at === 'string' ? raw.rated_at : null,
  };
}

function clockFromRow(row: SessionRow): SessionClockFields {
  return {
    startedAt: new Date(row.started_at ?? row.created_at).getTime(),
    pausedTotalSec: row.paused_total_sec ?? 0,
    pausedAt: row.paused_at ? new Date(row.paused_at).getTime() : null,
  };
}

// plan_session_id is not in the generated Database types yet.
function planSessionIdOf(row: SessionRow): string | null {
  const raw = (row as unknown as { plan_session_id?: unknown }).plan_session_id;
  return typeof raw === 'string' && raw !== '' ? raw : null;
}

export async function fetchSessionDetail(
  sessionId: string,
): Promise<SessionDetail> {
  const client = getClient();
  const [sessionResult, setsResult] = await Promise.all([
    client.from('workout_sessions').select('*').eq('id', sessionId).single(),
    client
      .from('workout_session_sets')
      .select('*')
      .eq('session_id', sessionId)
      .order('exercise_position')
      .order('set_index'),
  ]);
  if (sessionResult.error || !sessionResult.data) {
    throw sessionResult.error ?? new Error('No encontramos la sesión.');
  }
  if (setsResult.error) {
    throw setsResult.error;
  }
  const row = sessionResult.data as SessionRow;
  const setRows = (setsResult.data ?? []) as SetRow[];
  const exerciseByPosition: Record<number, string | null> = {};
  setRows.forEach(set => {
    const position = fromDbPosition(set.exercise_position);
    exerciseByPosition[position] = exerciseByPosition[position] ?? set.exercise_id;
  });
  return {
    session: mapWorkoutSession(row),
    clock: clockFromRow(row),
    volumeKg: row.volume_kg,
    sets: mapSetRows(setRows),
    exerciseByPosition,
    warmupSetIds: setRows.filter(set => set.is_warmup).map(set => set.id),
    rating: ratingOf(row),
    planSessionId: planSessionIdOf(row),
  };
}

// Answers to the rest messages of a session (sfb-1, workout_session_feedback):
// how it felt (effort) and discomforts (body_zone + note). exerciseId null:
// about the session in general. A failed read throws with its code (RLS:
// 42501) so the summary can say it instead of hiding the block.
export type SessionFeedbackRead = {
  id: string;
  exerciseId: string | null;
  kind: 'effort' | 'discomfort';
  effort: Effort | null;
  bodyZone: BodyZone | null;
  note: string | null;
  createdAt: string;
};

export class SessionFeedbackReadError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'SessionFeedbackReadError';
    this.code = code;
  }
}

const EFFORTS: readonly Effort[] = ['facil', 'bien', 'duro', 'al_limite'];
const ZONES: readonly BodyZone[] = ['hombro', 'rodilla', 'espalda', 'codo', 'otra'];

export async function fetchSessionFeedback(sessionId: string): Promise<SessionFeedbackRead[]> {
  // The table is not in the generated Database types yet.
  const client = getClient() as unknown as {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: string) => {
          order: (
            column: string,
            options: { ascending: boolean },
          ) => Promise<{ data: unknown; error: { code?: string; message?: string } | null }>;
        };
      };
    };
  };
  const { data, error } = await client
    .from('workout_session_feedback')
    .select('id, exercise_id, kind, effort, body_zone, note, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  if (error) {
    throw new SessionFeedbackReadError(error.code ?? 'unknown', error.message ?? 'No se pudo leer el feedback.');
  }
  const rows = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
  return rows
    .filter(row => row.kind === 'effort' || row.kind === 'discomfort')
    .map(row => ({
      id: String(row.id),
      exerciseId: typeof row.exercise_id === 'string' ? row.exercise_id : null,
      kind: row.kind as 'effort' | 'discomfort',
      effort: EFFORTS.find(value => value === row.effort) ?? null,
      bodyZone: ZONES.find(value => value === row.body_zone) ?? null,
      note: typeof row.note === 'string' && row.note.trim() ? row.note.trim() : null,
      createdAt: String(row.created_at ?? ''),
    }));
}

// Completed sessions of one LOCAL day, ordered by start time.
// workout_sessions.date is the user's local day (getLocalDateKey, never
// null): set on insert and, on completion, to the local day of ended_at.
// It is also what get_week_plan uses for a "done" day, so the card and the
// sessions found here always agree.
export type DaySession = {
  id: string;
  workoutId: string | null;
  title: string;
  startedAt: string | null;
  durationMin: number;
};

export async function fetchDaySessions(userId: string, date: string): Promise<DaySession[]> {
  const client = getClient();
  const { data, error } = await client
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .eq('date', date);
  if (error) {
    throw error;
  }
  return ((data ?? []) as SessionRow[])
    .map(row => {
      const session = mapWorkoutSession(row);
      return {
        id: row.id,
        workoutId: session.workoutId || null,
        title: session.workoutTitle,
        startedAt: row.started_at ?? null,
        durationMin: session.duration,
      };
    })
    .sort((a, b) => (a.startedAt ?? '').localeCompare(b.startedAt ?? ''));
}

// Local day of the user's first completed session (null: none yet). Tu
// semana goes back no further than its week.
export async function fetchFirstSessionDate(userId: string): Promise<string | null> {
  const client = getClient();
  const { data, error } = await client
    .from('workout_sessions')
    .select('date')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('date', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return (data as { date: string } | null)?.date ?? null;
}

// Records already saved for a session (personal_records by session_set_id):
// the summary of a past session and Compartir read them here, since
// detect_session_prs only returns marks not registered yet. The previous
// mark is not stored, so previous_* stay null.
export async function fetchSessionRecords(sessionSetIds: string[]): Promise<DetectedPR[]> {
  if (sessionSetIds.length === 0) {
    return [];
  }
  const client = getClient();
  const { data, error } = await client
    .from('personal_records')
    .select('session_set_id, exercise_id, pr_type, value_weight, value_reps, value_duration_sec, value_distance_m')
    .in('session_set_id', sessionSetIds);
  if (error) {
    throw error;
  }
  return (data ?? [])
    .filter(row => row.session_set_id)
    .map(row => ({
      sessionSetId: String(row.session_set_id),
      exerciseId: row.exercise_id,
      prType: row.pr_type as PRType,
      valueWeight: row.value_weight,
      valueReps: row.value_reps,
      valueDurationSec: row.value_duration_sec,
      valueDistanceM: row.value_distance_m,
      previousWeight: null,
      previousReps: null,
      previousDurationSec: null,
      previousDistanceM: null,
    }));
}

// The user's work sets of one library exercise, newest first (Exercise
// Detail · Tu historial). Warm-up sets are left out.
export type ExerciseHistorySet = {
  sessionId: string;
  reps: number | null;
  weightKg: number | null;
  durationSec: number | null;
  distanceM: number | null;
  completedAt: string;
};

export async function fetchExerciseHistory(
  userId: string,
  exerciseId: string,
): Promise<ExerciseHistorySet[]> {
  const client = getClient();
  const { data, error } = await client
    .from('workout_session_sets')
    .select('session_id, reps, weight_kg, duration_sec, distance_m, completed_at')
    .eq('user_id', userId)
    .eq('exercise_id', exerciseId)
    .eq('is_warmup', false)
    .order('completed_at', { ascending: false })
    .limit(1000);
  if (error) {
    throw error;
  }
  return (data ?? []).map(row => ({
    sessionId: row.session_id,
    reps: row.reps,
    weightKg: row.weight_kg,
    durationSec: row.duration_sec,
    distanceM: row.distance_m,
    completedAt: row.completed_at,
  }));
}

// Last weight used by the user per library exercise (proposed kg).
export async function fetchLastWeights(
  userId: string,
  exerciseIds: string[],
): Promise<Record<string, number>> {
  if (exerciseIds.length === 0) {
    return {};
  }
  const client = getClient();
  const { data, error } = await client
    .from('workout_session_sets')
    .select('exercise_id, weight_kg, completed_at')
    .eq('user_id', userId)
    .in('exercise_id', exerciseIds)
    .not('weight_kg', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(200);
  if (error) {
    throw error;
  }
  const result: Record<string, number> = {};
  (data ?? []).forEach(row => {
    if (row.exercise_id && row.weight_kg !== null && !(row.exercise_id in result)) {
      result[row.exercise_id] = row.weight_kg;
    }
  });
  return result;
}

// Readable message of a Supabase / unknown error (for logs).
export function describeError(error: unknown): string {
  if (error && typeof error === 'object') {
    const e = error as { message?: string; code?: string; details?: string };
    return [e.code, e.message, e.details].filter(Boolean).join(' · ');
  }
  return String(error);
}

// Planned exercises, once per session. Idempotent and independent of the
// unique constraint: it reads which positions exist and inserts only the
// missing ones, so it can be repeated (retry, save, complete).
export async function ensureSessionExercises(
  sessionId: string,
  plan: PlannedExercise[],
): Promise<void> {
  if (plan.length === 0) {
    return;
  }
  const client = getClient();
  const existing = await client
    .from('workout_session_exercises')
    .select('position')
    .eq('session_id', sessionId);
  if (existing.error) {
    throw existing.error;
  }
  // DB positions start at 1; the plan keeps the app's base 0.
  const rows = buildExerciseRows(
    sessionId,
    plan,
    (existing.data ?? []).map(row => row.position),
  );
  if (rows.length === 0) {
    return;
  }
  const { error } = await (client.from('workout_session_exercises') as any).insert(rows);
  if (error) {
    throw error;
  }
}

// A variant applied (or undone) in this session: the row of the exercise
// gets the variant's exercise id and name, and the original id and reason.
export async function saveSessionVariant(
  sessionId: string,
  position: number,
  change: Parameters<typeof buildVariantPatch>[0],
): Promise<void> {
  const client = getClient();
  const { error } = await (client.from('workout_session_exercises') as any)
    .update(buildVariantPatch(change))
    .eq('session_id', sessionId)
    .eq('position', toDbPosition(position));
  if (error) {
    throw error;
  }
}

export type StoredVariant = {
  position: number;
  exerciseId: string;
  name: string;
  originalExerciseId: string;
  reason: string | null;
};

// The variants already saved in a session (resuming it keeps them).
export async function fetchSessionVariants(sessionId: string): Promise<StoredVariant[]> {
  const client = getClient();
  const { data, error } = await (client.from('workout_session_exercises') as any)
    .select('position, exercise_id, name, original_exercise_id, variant_reason')
    .eq('session_id', sessionId)
    .not('original_exercise_id', 'is', null);
  if (error) {
    throw error;
  }
  return ((data ?? []) as Array<Record<string, unknown>>)
    .filter(row => typeof row.exercise_id === 'string' && typeof row.original_exercise_id === 'string')
    .map(row => ({
      position: fromDbPosition(row.position as number),
      exerciseId: row.exercise_id as string,
      name: (row.name as string) ?? '',
      originalExerciseId: row.original_exercise_id as string,
      reason: typeof row.variant_reason === 'string' ? row.variant_reason : null,
    }));
}

export type SetWrite = {
  sessionId: string;
  userId: string;
  exerciseId: string | null;
  set: LoggedSet;
  // Real rest BEFORE this set (null for the first set of the session).
  restActualSec?: number | null;
  completedAt: string;
};

// INSERT … ON CONFLICT (session_id, exercise_position, set_index) DO UPDATE.
export async function upsertSessionSet(write: SetWrite): Promise<string> {
  const client = getClient();
  const { data, error } = await (client.from('workout_session_sets') as any)
    .upsert(
      buildSetRow(write),
      { onConflict: 'session_id,exercise_position,set_index' },
    )
    .select('id')
    .single();
  if (error || !data) {
    throw error ?? new Error('No pudimos guardar la serie.');
  }
  return data.id as string;
}

export async function markSessionExercise(
  sessionId: string,
  position: number,
  done: boolean,
): Promise<void> {
  const client = getClient();
  const { error } = await (client.from('workout_session_exercises') as any)
    .update({
      status: done ? 'completed' : 'pending',
      completed_at: done ? new Date().toISOString() : null,
    })
    .eq('session_id', sessionId)
    .eq('position', toDbPosition(position));
  if (error) {
    throw error;
  }
}

async function updateSession(
  sessionId: string,
  patch: Record<string, unknown>,
): Promise<SessionRow> {
  const client = getClient();
  const { data, error } = await (client.from('workout_sessions') as any)
    .update(patch)
    .eq('id', sessionId)
    .select('*')
    .single();
  if (error || !data) {
    throw error ?? new Error('No pudimos actualizar la sesión.');
  }
  return data as SessionRow;
}

export async function syncCompletedExercises(
  sessionId: string,
  plan: PlannedExercise[],
  sets: LoggedSet[],
): Promise<void> {
  await updateSession(sessionId, {
    completed_exercises: completedExerciseIds(plan, sets),
  });
}

// `duration` (minutes) is the last recorded activity of a running session:
// Inicio counts a session that is still `in_progress` only up to it, never up
// to "now" (closing the app or locking the phone adds nothing).
export async function setSessionPaused(
  sessionId: string,
  clock: SessionClockFields,
  activeSec: number,
): Promise<void> {
  await updateSession(sessionId, {
    paused_at: clock.pausedAt ? new Date(clock.pausedAt).toISOString() : null,
    paused_total_sec: clock.pausedTotalSec,
    duration: Math.floor(activeSec / 60),
  });
}

// Last recorded activity (a logged set).
export async function recordSessionActivity(
  sessionId: string,
  activeSec: number,
): Promise<void> {
  await updateSession(sessionId, { duration: Math.floor(activeSec / 60) });
}

// "Guardar para después": status 'saved', frozen as a pause so the time away
// never counts (DA-60).
export type SaveForLaterParams = {
  sessionId: string;
  clock: SessionClockFields;
  activeSec: number;
  plan: PlannedExercise[];
  sets: LoggedSet[];
};

export async function saveSessionForLater(
  params: SaveForLaterParams,
): Promise<WorkoutSession> {
  const now = Date.now();
  const row = await updateSession(params.sessionId, {
    status: 'saved',
    completed: false,
    paused_at: new Date(params.clock.pausedAt ?? now).toISOString(),
    paused_total_sec: params.clock.pausedTotalSec,
    duration: Math.round(params.activeSec / 60),
    completed_exercises: completedExerciseIds(params.plan, params.sets),
  });
  return mapWorkoutSession(row);
}

// Back to in progress from 'saved' (any day) or a legacy resumable
// 'canceled': the time away becomes pause and the session moves to today.
export async function reopenSession(
  sessionId: string,
  clock: SessionClockFields,
): Promise<SessionDetail> {
  const now = Date.now();
  const pausedTotalSec =
    clock.pausedTotalSec +
    (clock.pausedAt ? Math.max(0, Math.round((now - clock.pausedAt) / 1000)) : 0);
  await updateSession(sessionId, {
    status: 'in_progress',
    completed: false,
    ended_at: null,
    paused_at: null,
    paused_total_sec: pausedTotalSec,
    date: getLocalDateKey(),
  });
  return fetchSessionDetail(sessionId);
}

// "Salir sin guardar".
export async function discardSession(sessionId: string): Promise<void> {
  await updateSession(sessionId, {
    status: 'canceled',
    cancel_reason: 'user',
    completed: false,
    ended_at: new Date().toISOString(),
    paused_at: null,
  });
}

export type CompletionPayload = {
  sessionId: string;
  workoutId: string | null;
  workoutTitle: string;
  activeSec: number;
  pausedTotalSec: number;
  caloriesBurned: number;
  completedExercises: string[];
  endedAt: string;
};

export type CompletionResult = {
  session: WorkoutSession;
  volumeKg: number | null;
  award: GamificationAwardResult | null;
};

async function completedThisWeek(userId: string): Promise<number | null> {
  try {
    const client = getClient();
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const { count, error } = await (client.from('workout_sessions') as any)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('completed', true)
      .gte('date', getLocalDateKey(weekStart));
    return error ? null : count ?? 0;
  } catch {
    return null;
  }
}

// Completes the session (the server computes volume_kg) and awards
// `workout_completed` as before.
export async function completeSession(
  payload: CompletionPayload,
): Promise<CompletionResult> {
  const row = await updateSession(payload.sessionId, {
    status: 'completed',
    completed: true,
    ended_at: payload.endedAt,
    paused_at: null,
    paused_total_sec: payload.pausedTotalSec,
    duration: Math.max(1, Math.round(payload.activeSec / 60)),
    calories_burned: payload.caloriesBurned,
    completed_exercises: payload.completedExercises,
    // `date` is NOT written here. The day of a session is the local day it
    // started or was last resumed, and those are the only two writers of
    // `date`: the insert (start day, fitness.ts) and reopenSession (the day
    // it is resumed). Completing keeps it, so 23:30 → 00:20 stays on the
    // day it began and a session resumed on Wednesday counts for Wednesday.
  });
  const session = mapWorkoutSession(row);
  const weekCount = await completedThisWeek(session.userId);
  const award = await awardGamificationEventBestEffort({
    source: 'workout-completion',
    eventType: 'workout_completed',
    referenceId: session.id,
    points: 50,
    badgeIds: [
      'first_workout',
      ...(weekCount !== null && weekCount >= 3
        ? (['week_consistency'] as const)
        : []),
    ],
    metadata: {
      sessionId: session.id,
      workoutId: payload.workoutId,
      workoutTitle: payload.workoutTitle,
      completedExercises: payload.completedExercises.length,
      completedThisWeek: weekCount,
    },
  });
  return { session, volumeKg: row.volume_kg, award };
}

// ── Records detected in the session ─────────────────────────────────────────
export type DetectedPR = {
  sessionSetId: string;
  exerciseId: string;
  prType: PRType;
  valueWeight: number | null;
  valueReps: number | null;
  valueDurationSec: number | null;
  valueDistanceM: number | null;
  previousWeight: number | null;
  previousReps: number | null;
  previousDurationSec: number | null;
  previousDistanceM: number | null;
};

const num = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

// The value that defines the record (a record without it cannot be saved).
function mainValue(record: Pick<DetectedPR, 'prType' | 'valueWeight' | 'valueReps' | 'valueDurationSec' | 'valueDistanceM'>) {
  switch (record.prType) {
    case 'max_reps':
      return record.valueReps;
    case 'duration':
      return record.valueDurationSec;
    case 'distance':
      return record.valueDistanceM;
    default:
      return record.valueWeight;
  }
}

export async function detectSessionPRs(sessionId: string): Promise<DetectedPR[]> {
  const client = getClient();
  const { data, error } = await client.rpc('detect_session_prs', {
    _session_id: sessionId,
  });
  if (error) {
    throw error;
  }
  const rows = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
  return rows
    .filter(row => row.session_set_id && row.exercise_id && row.pr_type)
    .map(row => ({
      sessionSetId: String(row.session_set_id),
      exerciseId: String(row.exercise_id),
      prType: row.pr_type as PRType,
      valueWeight: num(row.value_weight),
      valueReps: num(row.value_reps),
      valueDurationSec: num(row.value_duration_sec),
      valueDistanceM: num(row.value_distance_m),
      previousWeight: num(row.previous_weight),
      previousReps: num(row.previous_reps),
      previousDurationSec: num(row.previous_duration_sec),
      previousDistanceM: num(row.previous_distance_m),
    }))
    .filter(record => mainValue(record) !== null);
}

// INSERT … ON CONFLICT (user_id, session_set_id) DO NOTHING, then
// `personal_record_created` for each new row (same reward as a manual PR).
export async function registerSessionPRs(params: {
  userId: string;
  sessionId: string;
  records: DetectedPR[];
}): Promise<number> {
  if (params.records.length === 0) {
    return 0;
  }
  const client = getClient();
  const now = new Date().toISOString();
  const { data, error } = await (client.from('personal_records') as any)
    .upsert(
      params.records.map(record => ({
        user_id: params.userId,
        exercise_id: record.exerciseId,
        pr_type: record.prType,
        value_weight: record.valueWeight,
        value_reps: record.valueReps,
        value_duration_sec: record.valueDurationSec,
        value_distance_m: record.valueDistanceM,
        unit:
          record.prType === 'distance'
            ? 'm'
            : record.prType === 'duration'
            ? 's'
            : record.valueWeight !== null
            ? 'kg'
            : null,
        recorded_at: now,
        source: 'session',
        workout_session_id: params.sessionId,
        session_set_id: record.sessionSetId,
      })),
      { onConflict: 'user_id,session_set_id', ignoreDuplicates: true },
    )
    .select('id, exercise_id, pr_type');
  if (error) {
    throw error;
  }
  const inserted = (data ?? []) as { id: string; exercise_id: string; pr_type: string }[];
  for (const record of inserted) {
    try {
      await awardGamificationEvent({
        eventType: 'personal_record_created',
        referenceId: String(record.id),
        points: 25,
        badgeIds: ['first_pr'],
        metadata: {
          recordId: record.id,
          exerciseId: record.exercise_id,
          prType: record.pr_type,
          source: 'session',
        },
      });
    } catch (awardError) {
      __DEV__ && console.warn('[session-pr] No se pudo otorgar la recompensa.', awardError);
    }
  }
  return inserted.length;
}

// ── Outbox: writes that failed stay on the phone and sync later ─────────────
// STATE_09 "Está a salvo en este teléfono". Sets and the completion are kept
// in AsyncStorage per user and replayed in order (both are idempotent).
type OutboxItem = (
  | { kind: 'set'; write: SetWrite }
  | { kind: 'save'; params: SaveForLaterParams }
  | { kind: 'complete'; payload: CompletionPayload }
) &
  Queued;

const outboxKeyOf = (entry: OutboxItem) =>
  entry.kind === 'set'
    ? `set:${entry.write.sessionId}:${entry.write.set.position}:${entry.write.set.setIndex}`
    : entry.kind === 'save'
    ? `save:${entry.params.sessionId}`
    : `complete:${entry.payload.sessionId}`;

const outboxKey = (userId: string) => `@athelete/session-outbox-v1:${userId}`;

async function readOutbox(userId: string): Promise<OutboxItem[]> {
  try {
    const raw = await AsyncStorage.getItem(outboxKey(userId));
    return raw ? (JSON.parse(raw) as OutboxItem[]) : [];
  } catch {
    return [];
  }
}

async function writeOutbox(userId: string, items: OutboxItem[]) {
  if (items.length === 0) {
    await AsyncStorage.removeItem(outboxKey(userId));
    return;
  }
  await AsyncStorage.setItem(outboxKey(userId), JSON.stringify(items));
}

export async function enqueueSessionWrite(
  userId: string,
  item: OutboxItem,
): Promise<void> {
  const items = await readOutbox(userId);
  // Queuing again (a new attempt by the person) clears an old failure mark.
  await writeOutbox(userId, [
    ...items.filter(entry => outboxKeyOf(entry) !== outboxKeyOf(item)),
    { ...item, failure: undefined },
  ]);
}

export async function hasPendingSessionWrites(userId: string): Promise<boolean> {
  return (await readOutbox(userId)).length > 0;
}

// Sets of this session still waiting in the queue (they would be missing from
// the saved workout).
export async function hasPendingSetsForSession(
  userId: string,
  sessionId: string,
): Promise<boolean> {
  return (await readOutbox(userId)).some(
    item => item.kind === 'set' && item.write.sessionId === sessionId,
  );
}

// Replays the queue (rules in sessionOutbox.ts). Only one replay runs at a
// time per user: a second caller gets the one in progress. Every operation is
// idempotent, so a replay interrupted halfway is safe to repeat.
const inflight = new Map<string, Promise<OutboxRun>>();

export type OutboxRun = {
  completed: CompletionResult[];
  done: number;
  // Still waiting for the network (worth another attempt later).
  retryable: number;
  // Parked with an error that is not the network's.
  failed: number;
  stoppedByNetwork: boolean;
};

async function execute(item: OutboxItem): Promise<CompletionResult | undefined> {
  if (item.kind === 'set') {
    await upsertSessionSet(item.write);
    return undefined;
  }
  if (item.kind === 'save') {
    await saveSessionForLater(item.params);
    return undefined;
  }
  return completeSession(item.payload);
}

export function flushSessionOutbox(
  userId: string,
  options: RunOptions = {},
): Promise<OutboxRun> {
  const running = inflight.get(userId);
  if (running) {
    // A manual retry of parked items waits for the replay in progress and
    // then runs its own; anything else just shares it.
    return options.retryFailed
      ? running.then(() => flushSessionOutbox(userId, options))
      : running;
  }
  const run = (async () => {
    const items = await readOutbox(userId);
    const outcome = await runOutbox(items, execute, () => new Date(), options);
    // Items queued while the replay ran are kept (re-read and merge).
    const current = await readOutbox(userId);
    const keyOf = (entry: OutboxItem) => outboxKeyOf(entry);
    const handled = new Set(items.map(keyOf));
    const added = current.filter(entry => !handled.has(keyOf(entry)));
    await writeOutbox(userId, [...outcome.remaining, ...added]);
    return {
      completed: outcome.results,
      done: outcome.done,
      retryable: [...outcome.remaining, ...added].filter(entry => !entry.failure).length,
      failed: outcome.remaining.filter(entry => entry.failure).length,
      stoppedByNetwork: outcome.stoppedByNetwork,
    };
  })().finally(() => {
    inflight.delete(userId);
  });
  inflight.set(userId, run);
  return run;
}
