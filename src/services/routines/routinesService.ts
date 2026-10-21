import { getSupabaseClient } from '@app/services/supabase/client';
import { parseRoutineCategory } from '@app/shared/data/workouts';
import type {
  RoutineBlock,
  RoutineOrigin,
  Workout,
  WorkoutDifficulty,
  WorkoutExercise,
  WorkoutType,
} from '@app/shared/domain/types';

// Routines (docs/backend/ROUTINES_SHAPES.md, the only source): every RPC goes
// with the user's JWT. The app never writes workout_templates or
// template_exercises directly.

export type RoutineErrorCode =
  | 'unauthorized'
  | 'invalid_input'
  | 'exercise_not_found'
  | 'routine_not_found'
  | 'chat_message_not_found'
  // v2.15 · Tu semana (V2_15_SHAPES.md §2)
  | 'past_day'
  | 'no_candidates'
  | 'not_missed'
  | 'no_free_day'
  | 'plan_not_found'
  | 'offline'
  | 'unknown';

export class RoutineError extends Error {
  code: RoutineErrorCode;
  // invalid_input: which field (title, exercises[]…).
  field: string | null;
  // exercise_not_found: the ids that do not exist or are not active.
  exerciseIds: string[];
  constructor(
    code: RoutineErrorCode,
    extra: { field?: string | null; exerciseIds?: string[]; message?: string } = {},
  ) {
    super(extra.message ?? code);
    this.name = 'RoutineError';
    this.code = code;
    this.field = extra.field ?? null;
    this.exerciseIds = extra.exerciseIds ?? [];
  }
}

export type RoutineScopeParam = 'all' | 'official' | 'mine';

export type RoutinePage = { items: Workout[]; nextCursor: string | null };

export type RoutineSuggestion = {
  routineId: string;
  title: string;
  routineCategory: Workout['routineCategory'];
  zone: string | null;
  difficulty: WorkoutDifficulty;
  duration: number;
  origin: RoutineOrigin;
  reason: string;
  reasonCode: string | null;
  lastZone: string | null;
  date: string | null;
};

export type TodaySuggestion = {
  source: 'rules' | 'weekly_plan' | 'none';
  suggestion: RoutineSuggestion | null;
  // The active week plan says today is a rest day or not available
  // (reason_code 'rest_day'): no routine, and not "no candidate" either.
  restDay: { kind: 'rest' | 'unavailable'; date: string | null } | null;
};

// What the builder (or ELLIE) sends. The exercise name is set by the server
// from the catalog.
export type RoutineExerciseInput = {
  exerciseId: string;
  block?: RoutineBlock;
  sets?: number | null;
  reps?: number | null;
  duration?: number | null;
  restTime?: number | null;
  notes?: string | null;
  plannedWeightKg?: number | null;
};

export type RoutineInput = {
  title: string;
  description?: string | null;
  type: WorkoutType;
  difficulty: WorkoutDifficulty;
  duration: number;
  calories: number;
  targetMuscles: string[];
  exercises: RoutineExerciseInput[];
};

export type RoutineOriginInput =
  | { origin: 'user' }
  | { origin: 'ellie'; chatMessageId: string };

// Contract limits (sets 1–20, reps 1–200, duration 0–7200 s, rest 0–900 s).
export const ROUTINE_LIMITS = {
  title: 80,
  description: 1000,
  exercises: 40,
  sets: [1, 20],
  reps: [1, 200],
  duration: [0, 7200],
  rest: [0, 900],
} as const;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
const str = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;
const num = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;
const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];

function clamp(
  value: number | null | undefined,
  [min, max]: readonly [number, number],
): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }
  return Math.min(max, Math.max(min, Math.round(value)));
}

const TYPES: readonly WorkoutType[] = ['strength', 'cardio', 'fullbody', 'mobility', 'hiit'];
const DIFFICULTIES: readonly WorkoutDifficulty[] = ['beginner', 'intermediate', 'advanced'];
const ORIGINS: readonly RoutineOrigin[] = ['official', 'editorial', 'ellie', 'user'];
const BLOCKS: readonly RoutineBlock[] = ['warmup', 'main', 'cooldown'];

// save_user_routine / update_user_routine payload. Values are kept inside
// the contract limits so the server does not answer invalid_input for a
// stepper that went too far.
export function buildRoutinePayload(
  input: RoutineInput,
  origin: RoutineOriginInput = { origin: 'user' },
): Record<string, unknown> {
  const description = input.description?.trim();
  return {
    title: input.title.trim().slice(0, ROUTINE_LIMITS.title),
    ...(description
      ? { description: description.slice(0, ROUTINE_LIMITS.description) }
      : {}),
    type: input.type,
    difficulty: input.difficulty,
    duration: Math.max(0, Math.round(input.duration)),
    calories: Math.max(0, Math.round(input.calories)),
    target_muscles: input.targetMuscles,
    origin: origin.origin,
    ...(origin.origin === 'ellie' ? { chat_message_id: origin.chatMessageId } : {}),
    exercises: input.exercises.map(exercise => {
      const duration = clamp(exercise.duration, ROUTINE_LIMITS.duration);
      return {
        exercise_id: exercise.exerciseId,
        block: exercise.block ?? 'main',
        sets: clamp(exercise.sets, ROUTINE_LIMITS.sets),
        // Timed exercises carry no reps.
        reps: duration ? null : clamp(exercise.reps, ROUTINE_LIMITS.reps),
        duration: duration || null,
        rest_time: clamp(exercise.restTime ?? 60, ROUTINE_LIMITS.rest) ?? 60,
        notes: exercise.notes?.trim() ? exercise.notes.trim() : null,
        planned_weight_kg: exercise.plannedWeightKg ?? null,
      };
    }),
  };
}

// A routine read with get_routine as the input of update_user_routine (each
// exercise keeps its block and values). A row without a catalog exercise
// cannot be sent: exercise_not_found, like the server would answer.
export function routineInputFrom(workout: Workout): RoutineInput {
  const missing = workout.exercises.filter(exercise => !exercise.exerciseId);
  if (missing.length > 0) {
    throw new RoutineError('exercise_not_found', { exerciseIds: [] });
  }
  return {
    title: workout.title,
    description: workout.description ?? null,
    type: workout.type,
    difficulty: workout.difficulty,
    duration: workout.duration,
    calories: workout.calories,
    targetMuscles: workout.targetMuscles,
    exercises: workout.exercises.map(exercise => ({
      exerciseId: exercise.exerciseId as string,
      block: exercise.block ?? 'main',
      sets: exercise.sets ?? null,
      reps: exercise.reps ?? null,
      duration: exercise.duration ?? null,
      restTime: exercise.restTime,
      notes: exercise.notes ?? null,
      plannedWeightKg: exercise.plannedWeightKg ?? null,
    })),
  };
}

function sourceTypeOf(origin: RoutineOrigin): Workout['sourceType'] {
  return origin === 'official'
    ? 'library'
    : origin === 'editorial'
      ? 'featured_editorial'
      : origin;
}

function originOf(value: unknown): RoutineOrigin {
  return ORIGINS.find(item => item === value) ?? 'official';
}

export function mapRoutineExercise(raw: unknown, index: number): WorkoutExercise {
  const row = asRecord(raw) ?? {};
  return {
    id: str(row.id) ?? `exercise-${index}`,
    exerciseId: str(row.exercise_id),
    name: str(row.name) ?? '',
    block: BLOCKS.find(item => item === row.block) ?? 'main',
    position: num(row.position) ?? index + 1,
    sets: num(row.sets) ?? undefined,
    reps: num(row.reps) ?? undefined,
    duration: num(row.duration) ?? undefined,
    restTime: num(row.rest_time) ?? 60,
    notes: str(row.notes) ?? undefined,
    plannedWeightKg: num(row.planned_weight_kg) ?? undefined,
    thumbKey: str(row.thumb_key),
    trackingMetrics: strings(row.tracking_metrics),
    isUnilateral: row.is_unilateral === true,
  };
}

// A routine of get_routine (with exercises) or of list_routines (with
// exercise_count) as the app's Workout.
export function mapRoutine(raw: unknown): Workout {
  const row = asRecord(raw) ?? {};
  const origin = originOf(row.origin);
  const exercises = Array.isArray(row.exercises)
    ? row.exercises.map(mapRoutineExercise)
    : [];
  const isMine = row.is_mine === true;
  return {
    id: str(row.id) ?? '',
    title: str(row.title) ?? '',
    description: str(row.description) ?? undefined,
    type: TYPES.find(item => item === row.type) ?? 'strength',
    difficulty: DIFFICULTIES.find(item => item === row.difficulty) ?? 'intermediate',
    duration: num(row.duration) ?? 0,
    calories: num(row.calories) ?? 0,
    targetMuscles: strings(row.target_muscles),
    routineCategory: parseRoutineCategory(str(row.routine_category)),
    exercises,
    exerciseCount: num(row.exercise_count) ?? exercises.length,
    isPremium: false,
    origin,
    sourceType: sourceTypeOf(origin),
    createdByAi: origin === 'ellie',
    isMine,
    // list_routines has no can_edit: only the owner edits.
    canEdit: typeof row.can_edit === 'boolean' ? row.can_edit : isMine,
    archived: row.archived === true,
    thumbKey: str(row.thumb_key),
    createdAt: str(row.created_at) ?? undefined,
    updatedAt: str(row.updated_at) ?? undefined,
  };
}

export function parseTodaySuggestion(body: Record<string, unknown>): TodaySuggestion {
  const source =
    body.source === 'rules' || body.source === 'weekly_plan' ? body.source : 'none';
  const raw = asRecord(body.suggestion);
  const routineId = str(raw?.routine_id);
  if (!raw || !routineId) {
    if (source === 'weekly_plan' && body.reason_code === 'rest_day') {
      return {
        source,
        suggestion: null,
        restDay: {
          kind: body.kind === 'unavailable' ? 'unavailable' : 'rest',
          date: str(body.date),
        },
      };
    }
    return { source: 'none', suggestion: null, restDay: null };
  }
  return {
    source,
    restDay: null,
    suggestion: {
      routineId,
      title: str(raw.title) ?? '',
      routineCategory: parseRoutineCategory(str(raw.routine_category)),
      zone: str(raw.zone),
      difficulty: DIFFICULTIES.find(item => item === raw.difficulty) ?? 'intermediate',
      duration: num(raw.duration) ?? 0,
      origin: originOf(raw.origin),
      reason: str(raw.reason) ?? '',
      reasonCode: str(raw.reason_code),
      lastZone: str(raw.last_zone),
      date: str(raw.date),
    },
  };
}

// ── Variants (V2_15_SHAPES.md §3) ─────────────────────────────────────────
export type VariantReason = 'machine_busy' | 'no_dumbbells' | 'discomfort';
export type EquipmentGroup = 'machine' | 'cable' | 'barbell' | 'dumbbell' | 'bodyweight';

export type ExerciseVariant = {
  id: string;
  name: string;
  equipment: string[];
  equipmentGroup: EquipmentGroup;
  note: string | null;
  thumbKey: string | null;
  recommended: boolean;
};

export type ExerciseVariants = {
  original: {
    id: string;
    name: string;
    primaryMuscle: string | null;
    pattern: string | null;
    equipmentGroup: EquipmentGroup | null;
  };
  items: ExerciseVariant[];
};

const GROUPS: readonly EquipmentGroup[] = ['machine', 'cable', 'barbell', 'dumbbell', 'bodyweight'];
const groupOf = (value: unknown): EquipmentGroup | null =>
  GROUPS.find(item => item === value) ?? null;

export function parseVariants(body: Record<string, unknown>): ExerciseVariants {
  const original = asRecord(body.original) ?? {};
  const items = Array.isArray(body.items) ? body.items : [];
  return {
    original: {
      id: str(original.id) ?? '',
      name: str(original.name) ?? '',
      primaryMuscle: str(original.primary_muscle),
      pattern: str(original.pattern),
      equipmentGroup: groupOf(original.equipment_group),
    },
    items: items
      .map(raw => {
        const row = asRecord(raw) ?? {};
        return {
          id: str(row.id) ?? '',
          name: str(row.name) ?? '',
          equipment: strings(row.equipment),
          equipmentGroup: groupOf(row.equipment_group) ?? 'bodyweight',
          note: str(row.note),
          thumbKey: str(row.thumb_key),
          recommended: row.recommended === true,
        };
      })
      .filter(item => item.id)
      .slice(0, 3),
  };
}

export type ReplacedRoutine = {
  // true: the routine was official or someone else's, and the server saved a
  // private copy of the user's own with the change. From then on the app uses
  // `routine.id`.
  copied: boolean;
  sourceRoutineId: string | null;
  routine: Workout;
};

export type RoutineRpc = (name: string, args: Record<string, unknown>) => Promise<unknown>;

export async function supabaseRpc(name: string, args: Record<string, unknown>): Promise<unknown> {
  const client = getSupabaseClient() as unknown as {
    rpc: (rpc: string, params: object) => Promise<{ data: unknown; error: { message?: string; code?: string } | null }>;
  } | null;
  if (!client) {
    throw new RoutineError('unknown', { message: 'Supabase no está configurado.' });
  }
  const { data, error } = await client.rpc(name, args);
  if (error) {
    // Without a session the public key is refused with a permissions error.
    throw new RoutineError(error.code === '42501' ? 'unauthorized' : 'offline', {
      message: error.message,
    });
  }
  return data;
}

const ERROR_CODES: readonly RoutineErrorCode[] = [
  'unauthorized',
  'invalid_input',
  'exercise_not_found',
  'routine_not_found',
  'chat_message_not_found',
  'past_day',
  'no_candidates',
  'not_missed',
  'no_free_day',
  'plan_not_found',
];

export function expectOk(body: unknown): Record<string, unknown> {
  const record = asRecord(body);
  if (record?.ok === true) {
    return record;
  }
  const code = ERROR_CODES.find(item => item === record?.error);
  throw new RoutineError(code ?? 'unknown', {
    field: str(record?.field),
    exerciseIds: strings(record?.exercise_ids),
  });
}

export function createRoutinesService(rpc: RoutineRpc = supabaseRpc) {
  return {
    async getRoutine(id: string): Promise<Workout> {
      const record = expectOk(await rpc('get_routine', { _id: id }));
      return mapRoutine(record.routine);
    },

    async listRoutines(params: {
      scope: RoutineScopeParam;
      limit?: number;
      cursor?: string | null;
    }): Promise<RoutinePage> {
      const record = expectOk(
        await rpc('list_routines', {
          _scope: params.scope,
          _limit: Math.min(50, params.limit ?? 20),
          _cursor: params.cursor ?? null,
        }),
      );
      return {
        items: Array.isArray(record.items) ? record.items.map(mapRoutine) : [],
        nextCursor: str(record.next_cursor),
      };
    },

    // ELLIE: one chat message = one routine; saving it again answers the same
    // routine with replayed: true.
    async saveRoutine(
      input: RoutineInput,
      origin: RoutineOriginInput = { origin: 'user' },
    ): Promise<{ routine: Workout; replayed: boolean }> {
      const record = expectOk(
        await rpc('save_user_routine', { _payload: buildRoutinePayload(input, origin) }),
      );
      return { routine: mapRoutine(record.routine), replayed: record.replayed === true };
    },

    async updateRoutine(id: string, input: RoutineInput): Promise<Workout> {
      const record = expectOk(
        await rpc('update_user_routine', { _id: id, _payload: buildRoutinePayload(input) }),
      );
      return mapRoutine(record.routine);
    },

    // archived: true when a post shares it (archived instead of deleted).
    async deleteRoutine(id: string): Promise<{ archived: boolean }> {
      const record = expectOk(await rpc('delete_user_routine', { _id: id }));
      return { archived: record.archived === true };
    },

    // Up to 3 exercises with the same primary muscle and pattern. `reason`
    // filters or orders them; `excludeExerciseId` is the variant in use.
    async listExerciseVariants(params: {
      exerciseId: string;
      reason?: VariantReason | null;
      excludeExerciseId?: string | null;
      locale?: 'es' | 'en' | null;
    }): Promise<ExerciseVariants> {
      const record = expectOk(
        await rpc('list_exercise_variants', {
          _exercise_id: params.exerciseId,
          _reason: params.reason ?? null,
          _exclude_exercise_id: params.excludeExerciseId ?? null,
          _locale: params.locale ?? null,
        }),
      );
      return parseVariants(record);
    },

    async replaceRoutineExercise(params: {
      routineId: string;
      templateExerciseId: string;
      newExerciseId: string;
    }): Promise<ReplacedRoutine> {
      const record = expectOk(
        await rpc('replace_routine_exercise', {
          _routine_id: params.routineId,
          _template_exercise_id: params.templateExerciseId,
          _new_exercise_id: params.newExerciseId,
        }),
      );
      return {
        copied: record.copied === true,
        sourceRoutineId: str(record.source_routine_id),
        routine: mapRoutine(record.routine),
      };
    },

    async getTodaySuggestion(tz: string | null): Promise<TodaySuggestion> {
      const record = expectOk(await rpc('get_today_suggestion', { _tz: tz }));
      return parseTodaySuggestion(record);
    },
  };
}

export const routinesService = createRoutinesService();
