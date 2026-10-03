import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalDateKey } from '@app/lib/date';
import {
  completedExerciseIds,
  type LoggedSet,
  type PlannedExercise,
} from '@app/features/session/sessionModel';
import { getSupabaseClient } from '@app/services/supabase/client';
import { mapWorkoutSession } from '@app/services/supabase/fitness';
import {
  awardGamificationEvent,
  awardGamificationEventBestEffort,
  type GamificationAwardResult,
} from '@app/services/supabase/gamification';
import type { PRType, WorkoutSession } from '@app/shared';
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
};

function clockFromRow(row: SessionRow): SessionClockFields {
  return {
    startedAt: new Date(row.started_at ?? row.created_at).getTime(),
    pausedTotalSec: row.paused_total_sec ?? 0,
    pausedAt: row.paused_at ? new Date(row.paused_at).getTime() : null,
  };
}

function mapSet(row: SetRow): LoggedSet {
  return {
    id: row.id,
    position: row.exercise_position,
    setIndex: row.set_index,
    reps: row.reps,
    weightKg: row.weight_kg,
    durationSec: row.duration_sec,
  };
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
  return {
    session: mapWorkoutSession(row),
    clock: clockFromRow(row),
    volumeKg: row.volume_kg,
    sets: ((setsResult.data ?? []) as SetRow[]).map(mapSet),
  };
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

// Planned exercises, once per session (existing rows are left untouched).
export async function ensureSessionExercises(
  sessionId: string,
  plan: PlannedExercise[],
): Promise<void> {
  if (plan.length === 0) {
    return;
  }
  const client = getClient();
  const { error } = await (client.from('workout_session_exercises') as any).upsert(
    plan.map(exercise => ({
      session_id: sessionId,
      position: exercise.position,
      exercise_id: exercise.exerciseId,
      template_exercise_id: exercise.templateExerciseId,
      name: exercise.name,
      planned_sets: exercise.sets,
      planned_reps: exercise.reps,
      planned_duration_sec: exercise.durationSec,
      planned_rest_sec: exercise.restSec,
    })),
    { onConflict: 'session_id,position', ignoreDuplicates: true },
  );
  if (error) {
    throw error;
  }
}

export type SetWrite = {
  sessionId: string;
  userId: string;
  exerciseId: string | null;
  set: LoggedSet;
  restTakenSec?: number | null;
  completedAt: string;
};

// INSERT … ON CONFLICT (session_id, exercise_position, set_index) DO UPDATE.
export async function upsertSessionSet(write: SetWrite): Promise<string> {
  const client = getClient();
  const { data, error } = await (client.from('workout_session_sets') as any)
    .upsert(
      {
        session_id: write.sessionId,
        user_id: write.userId,
        exercise_id: write.exerciseId,
        exercise_position: write.set.position,
        set_index: write.set.setIndex,
        reps: write.set.reps,
        weight_kg: write.set.weightKg,
        duration_sec: write.set.durationSec,
        rest_taken_sec: write.restTakenSec ?? null,
        completed_at: write.completedAt,
      },
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
    .eq('position', position);
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

export async function setSessionPaused(
  sessionId: string,
  clock: SessionClockFields,
): Promise<void> {
  await updateSession(sessionId, {
    paused_at: clock.pausedAt ? new Date(clock.pausedAt).toISOString() : null,
    paused_total_sec: clock.pausedTotalSec,
  });
}

// "Guardar para después": status 'saved', frozen as a pause so the time away
// never counts (DA-60).
export async function saveSessionForLater(params: {
  sessionId: string;
  clock: SessionClockFields;
  activeSec: number;
  plan: PlannedExercise[];
  sets: LoggedSet[];
}): Promise<WorkoutSession> {
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
    date: getLocalDateKey(new Date(payload.endedAt)),
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
  previousWeight: number | null;
  previousReps: number | null;
};

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
      valueWeight: (row.value_weight as number | null) ?? null,
      valueReps: (row.value_reps as number | null) ?? null,
      previousWeight: (row.previous_weight as number | null) ?? null,
      previousReps: (row.previous_reps as number | null) ?? null,
    }));
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
        unit: record.valueWeight !== null ? 'kg' : null,
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
      console.warn('[session-pr] No se pudo otorgar la recompensa.', awardError);
    }
  }
  return inserted.length;
}

// ── Outbox: writes that failed stay on the phone and sync later ─────────────
// STATE_09 "Está a salvo en este teléfono". Sets and the completion are kept
// in AsyncStorage per user and replayed in order (both are idempotent).
type OutboxItem =
  | { kind: 'set'; write: SetWrite }
  | { kind: 'complete'; payload: CompletionPayload };

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
  const key = (entry: OutboxItem) =>
    entry.kind === 'set'
      ? `set:${entry.write.sessionId}:${entry.write.set.position}:${entry.write.set.setIndex}`
      : `complete:${entry.payload.sessionId}`;
  await writeOutbox(userId, [
    ...items.filter(entry => key(entry) !== key(item)),
    item,
  ]);
}

export async function hasPendingSessionWrites(userId: string): Promise<boolean> {
  return (await readOutbox(userId)).length > 0;
}

// Replays the queue; stops at the first failure (still offline). Returns the
// completions that went through.
export async function flushSessionOutbox(
  userId: string,
): Promise<CompletionResult[]> {
  const items = await readOutbox(userId);
  const completed: CompletionResult[] = [];
  let index = 0;
  for (; index < items.length; index += 1) {
    const item = items[index];
    try {
      if (item.kind === 'set') {
        await upsertSessionSet(item.write);
      } else {
        completed.push(await completeSession(item.payload));
      }
    } catch {
      break;
    }
  }
  await writeOutbox(userId, items.slice(index));
  return completed;
}
