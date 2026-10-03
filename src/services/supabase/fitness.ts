import { hasCompletedEver } from '@app/features/home/homePriority';
import { selectPendingSession } from '@app/features/session/sessionModel';
import { getLocalDateKey } from '@app/lib/date';
import { awardGamificationEventBestEffort } from '@app/services/supabase/gamification';
import {
  calculateHydrationStreak,
  dedupeFeaturedTemplates,
  getChallengeDay,
  getCompletedChallengeDays,
  getCurrentChallengeStreak,
  mapDbExerciseRow,
  mapTemplateExerciseRowToExercise,
  mapTemplateRowToWorkout,
  type DailyNutritionLog,
  type HabitChallenge,
  type HydrationLog,
  type LibraryExercise,
  type NutritionPlan,
  type Workout,
  type WorkoutExercise,
  type WorkoutSession,
} from '@app/shared';
import { getSupabaseClient } from '@app/services/supabase/client';
import type { Database, Json } from '@app/types/supabase';

type ChallengeParticipationRow =
  Database['public']['Tables']['challenge_participations']['Row'];
type DailyHydrationLogRow =
  Database['public']['Tables']['daily_hydration_logs']['Row'];
type DailyNutritionLogRow =
  Database['public']['Tables']['daily_nutrition_logs']['Row'];
type ExerciseRow = Database['public']['Tables']['exercises']['Row'];
type HabitLogRow = Database['public']['Tables']['habit_logs']['Row'];
type NutritionPlanRow = Database['public']['Tables']['nutrition_plans']['Row'];
type TemplateExerciseRow =
  Database['public']['Tables']['template_exercises']['Row'];
type WorkoutSessionRow =
  Database['public']['Tables']['workout_sessions']['Row'];
type WorkoutTemplateRow =
  Database['public']['Tables']['workout_templates']['Row'];

const WORKOUT_LIBRARY_PAGE_SIZE = 10;
const EXERCISE_LIBRARY_PAGE_SIZE = 12;

export type WorkoutLibrarySource = 'library' | 'ellie' | 'mine';

export type WorkoutLibraryPageParams = {
  userId?: string;
  source: WorkoutLibrarySource;
  search: string;
  type: string;
  favoriteIds: string[] | null;
  page: number;
  pageSize?: number;
};

export type ExerciseLibraryPageParams = {
  search: string;
  equipment: string;
  bodyPart: string;
  level: string;
  favoriteIds: string[] | null;
  page: number;
  pageSize?: number;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  nextPage: number | undefined;
};

export type HomeOverview = {
  // Latest session completed today (local date).
  completedToday: WorkoutSession | null;
  // Session to resume: the latest `saved` one ("Guardar para después", any
  // day) or, otherwise, today's `in_progress`.
  resumable: WorkoutSession | null;
  // Every session dated today (any status), for the "Entreno" ring minutes.
  todaySessions: WorkoutSession[];
  // At least one completed session ever (new user otherwise).
  hasCompletedEver: boolean;
  // Finished Core 33 challenges, for the discovery card (HOME_10 / HOME_11).
  // `lastDay33` = local date of day 33 of the latest one (start + 32 days):
  // participations have no completion timestamp.
  core33History: { completedCount: number; lastDay33: string | null };
  challenge:
    | (HabitChallenge & {
        challengeDay: number;
        completedDays: number;
        streak: number;
        completedToday: number;
        totalHabits: number;
        progressPct: number;
        // Today's state of each habit, in habit order.
        todayHabits: boolean[];
      })
    | null;
  nutritionPlan: NutritionPlan | null;
  todayNutritionLog: DailyNutritionLog | null;
  hydration: {
    todayMl: number;
    goalMl: number;
    todayGlasses: number;
    goalGlasses: number;
    todayPercentage: number;
    streak: number;
  };
};

function getClient() {
  const client = getSupabaseClient();

  if (!client) {
    throw new Error('Supabase no está configurado.');
  }

  return client;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return fallback;
}

export function mapWorkoutSession(row: WorkoutSessionRow): WorkoutSession {
  return {
    id: row.id,
    workoutId: row.workout_id || '',
    workoutTitle: row.workout_title,
    userId: row.user_id,
    date: row.date,
    completed: row.completed || false,
    duration: row.duration || 0,
    caloriesBurned: row.calories_burned || 0,
    status:
      row.status === 'in_progress' ||
      row.status === 'completed' ||
      row.status === 'canceled' ||
      row.status === 'saved'
        ? row.status
        : 'idle',
    startedAt: row.started_at,
    endedAt: row.ended_at,
    pausedAt: row.paused_at,
    pausedTotalSec: row.paused_total_sec ?? 0,
    completedExercises: Array.isArray(row.completed_exercises)
      ? row.completed_exercises.filter(
          (item): item is string => typeof item === 'string',
        )
      : [],
    totalExercises: row.total_exercises || 0,
    createdAt: row.created_at,
  };
}

async function cancelWorkoutSessionsByIds(ids: string[]): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  const client = getClient();
  const { error } = await (client.from('workout_sessions') as any)
    .update({
      status: 'canceled',
      completed: false,
      ended_at: new Date().toISOString(),
    })
    .in('id', ids);

  if (error) {
    throw error;
  }
}

function calculateSessionDurationMinutes(
  startedAt: string | null,
  fallbackMinutes: number,
): number {
  if (!startedAt) {
    return fallbackMinutes;
  }

  const elapsedMs = Date.now() - new Date(startedAt).getTime();
  return Math.max(1, Math.round(elapsedMs / 60000));
}

function calculateWorkoutSessionCalories(
  workout: Workout,
  completedExercises: string[],
): number {
  if (workout.exercises.length === 0) {
    return workout.calories;
  }

  return Math.round(
    (workout.calories * completedExercises.length) / workout.exercises.length,
  );
}

async function getCompletedWorkoutCountThisWeek(userId: string) {
  const client = getClient();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartKey = getLocalDateKey(weekStart);

  const { count, error } = await (client.from('workout_sessions') as any)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('completed', true)
    .gte('date', weekStartKey);

  if (error) {
    throw error;
  }

  return count || 0;
}

function mapNutritionPlan(row: NutritionPlanRow): NutritionPlan {
  return {
    id: row.id,
    userId: row.user_id,
    targetCalories: row.target_calories,
    targetProtein: row.target_protein,
    targetCarbs: row.target_carbs ?? undefined,
    targetFats: row.target_fats ?? undefined,
    notes: row.notes ?? undefined,
  };
}

function mapDailyNutritionLog(row: DailyNutritionLogRow): DailyNutritionLog {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    calories: row.calories || 0,
    protein: row.protein || 0,
    carbs: row.carbs ?? undefined,
    fats: row.fats ?? undefined,
    adherence: row.adherence ?? undefined,
  };
}

function parseChallengeHabits(
  participation: ChallengeParticipationRow,
): HabitChallenge['habits'] {
  const rawHabits = Array.isArray(participation.habits)
    ? participation.habits
    : [];

  return rawHabits.map((habit, index) => {
    const item =
      habit && typeof habit === 'object' && !Array.isArray(habit)
        ? (habit as Record<string, Json>)
        : {};

    return {
      id:
        typeof item.id === 'string'
          ? item.id
          : `habit-${participation.id}-${index}`,
      challengeId: participation.id,
      category:
        item.category === 'training' ||
        item.category === 'health' ||
        item.category === 'mind'
          ? item.category
          : 'training',
      name: typeof item.name === 'string' ? item.name : '',
    };
  });
}

function buildHabitLogMap(
  logs: HabitLogRow[],
  totalHabits: number,
): Record<string, boolean[]> {
  const map: Record<string, boolean[]> = {};

  logs.forEach(log => {
    if (!map[log.date]) {
      map[log.date] = Array.from({ length: totalHabits }, () => false);
    }

    if (log.habit_index >= 0 && log.habit_index < totalHabits) {
      map[log.date][log.habit_index] = log.completed || false;
    }
  });

  return map;
}

export async function fetchWorkoutLibrary(userId?: string): Promise<Workout[]> {
  const client = getClient();
  let builder = client
    .from('workout_templates')
    .select('*')
    .order('created_at', { ascending: false });

  builder = userId
    ? builder.or(`created_by.eq.${userId},is_public.eq.true,created_by.is.null`)
    : builder.or('is_public.eq.true,created_by.is.null');

  const { data: templates, error: templateError } = await builder;

  if (templateError) {
    throw templateError;
  }

  const templateRows = (templates || []) as WorkoutTemplateRow[];

  if (templateRows.length === 0) {
    return [];
  }

  const templateIds = templateRows.map(template => template.id);
  const { data: exerciseRows, error: exerciseError } = await client
    .from('template_exercises')
    .select('*')
    .in('template_id', templateIds)
    .order('sort_order');

  if (exerciseError) {
    throw exerciseError;
  }

  const templateExerciseRows = (exerciseRows || []) as TemplateExerciseRow[];

  const exercisesByTemplate = templateExerciseRows.reduce<
    Record<string, WorkoutExercise[]>
  >((accumulator, exercise) => {
    if (!accumulator[exercise.template_id]) {
      accumulator[exercise.template_id] = [];
    }

    accumulator[exercise.template_id].push(
      mapTemplateExerciseRowToExercise(exercise),
    );

    return accumulator;
  }, {});

  return dedupeFeaturedTemplates(templateRows).map(template =>
    mapTemplateRowToWorkout(template, exercisesByTemplate),
  );
}

export async function fetchWorkoutLibraryPage(
  params: WorkoutLibraryPageParams,
): Promise<PaginatedResult<Workout>> {
  if (params.favoriteIds?.length === 0) {
    return { items: [], total: 0, nextPage: undefined };
  }

  const client = getClient();
  const pageSize = params.pageSize || WORKOUT_LIBRARY_PAGE_SIZE;
  const from = params.page * pageSize;
  const to = from + pageSize - 1;
  let builder = client
    .from('workout_templates')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (params.source === 'library') {
    builder = builder.or('created_by.is.null,is_public.eq.true');
  } else {
    if (!params.userId) {
      return { items: [], total: 0, nextPage: undefined };
    }

    builder = builder.eq('created_by', params.userId).eq('is_public', false);
    builder =
      params.source === 'ellie'
        ? builder.or('created_by_ai.eq.true,source.eq.ellie')
        : builder
            .or('created_by_ai.eq.false,created_by_ai.is.null')
            .or('source.neq.ellie,source.is.null');
  }

  const normalizedSearch = params.search.trim();

  if (normalizedSearch) {
    builder = builder.ilike('title', `%${normalizedSearch}%`);
  }

  if (params.type !== 'all') {
    builder = builder.eq('type', params.type);
  }

  if (params.favoriteIds && params.favoriteIds.length > 0) {
    builder = builder.in('id', params.favoriteIds);
  }

  const { data, error, count } = await builder;

  if (error) {
    throw error;
  }

  const rows = (data || []) as WorkoutTemplateRow[];
  const items = dedupeFeaturedTemplates(rows).map(row =>
    mapTemplateRowToWorkout(row, {}),
  );

  return {
    items,
    total: count || 0,
    nextPage: rows.length === pageSize ? params.page + 1 : undefined,
  };
}

// The pending rows (`in_progress` or `saved`): the single read behind both
// the Inicio hero and the routine detail. The choice among them is
// `selectPendingSession`.
export async function fetchPendingSessions(
  userId: string,
): Promise<WorkoutSession[]> {
  const client = getClient();
  const { data, error } = await client
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['in_progress', 'saved'])
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    throw error;
  }

  return ((data || []) as WorkoutSessionRow[]).map(mapWorkoutSession);
}

// Session shown by the routine detail: the pending one (same rule as the
// Inicio hero, restricted to this routine) or, failing that, the one
// completed today.
export async function fetchEffectiveWorkoutSession(
  userId: string,
  workoutId?: string,
): Promise<WorkoutSession | null> {
  const client = getClient();
  const today = getLocalDateKey();
  let pending = await fetchPendingSessions(userId);

  // In progress from another day, or more than one today: only one can run.
  const staleIds = pending
    .filter(
      session => session.status === 'in_progress' && session.date !== today,
    )
    .map(session => session.id);
  const todayRunning = pending.filter(
    session => session.status === 'in_progress' && session.date === today,
  );
  const extraIds = todayRunning.slice(1).map(session => session.id);
  const dropIds = [...staleIds, ...extraIds];

  if (dropIds.length > 0) {
    await cancelWorkoutSessionsByIds(dropIds);
    pending = pending.filter(session => !dropIds.includes(session.id));
  }

  const chosen = selectPendingSession(pending, today, workoutId);

  if (chosen) {
    return chosen;
  }

  let completedQuery = client
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .eq('status', 'completed');

  if (workoutId) {
    completedQuery = completedQuery.eq('workout_id', workoutId);
  }

  const { data, error } = await completedQuery
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  const completed = (data || [])[0] as WorkoutSessionRow | undefined;
  return completed ? mapWorkoutSession(completed) : null;
}

export async function startWorkoutSession(params: {
  userId: string;
  workout: Workout;
}): Promise<WorkoutSession> {
  const client = getClient();
  const today = getLocalDateKey();
  const now = new Date().toISOString();
  const { data: inProgressRows, error: inProgressError } = await client
    .from('workout_sessions')
    .select('*')
    .eq('user_id', params.userId)
    .eq('status', 'in_progress')
    .order('created_at', { ascending: false });

  if (inProgressError) {
    throw inProgressError;
  }

  const inProgress = (inProgressRows || []) as WorkoutSessionRow[];
  const matchingTodaySession = inProgress.find(
    row => row.workout_id === params.workout.id && row.date === today,
  );

  if (matchingTodaySession) {
    const otherIds = inProgress
      .filter(row => row.id !== matchingTodaySession.id)
      .map(row => row.id);

    if (otherIds.length > 0) {
      await cancelWorkoutSessionsByIds(otherIds);
    }

    return mapWorkoutSession(matchingTodaySession);
  }

  if (inProgress.length > 0) {
    await cancelWorkoutSessionsByIds(inProgress.map(row => row.id));
  }

  const { data, error } = await (client.from('workout_sessions') as any)
    .insert({
      user_id: params.userId,
      workout_id: params.workout.id,
      workout_title: params.workout.title,
      date: today,
      status: 'in_progress',
      started_at: now,
      completed: false,
      duration: 0,
      calories_burned: 0,
      completed_exercises: [],
      total_exercises: params.workout.exercises.length,
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return mapWorkoutSession(data as WorkoutSessionRow);
}

export async function persistWorkoutSessionExercises(params: {
  sessionId: string;
  completedExercises: string[];
}): Promise<WorkoutSession> {
  const client = getClient();
  const { data, error } = await (client.from('workout_sessions') as any)
    .update({
      completed_exercises: params.completedExercises,
    })
    .eq('id', params.sessionId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return mapWorkoutSession(data as WorkoutSessionRow);
}

export async function completeWorkoutSession(params: {
  session: WorkoutSession;
  workout: Workout;
  completedExercises: string[];
}): Promise<WorkoutSession> {
  const client = getClient();
  const now = new Date().toISOString();
  const duration = calculateSessionDurationMinutes(
    params.session.startedAt,
    params.session.duration,
  );
  const caloriesBurned = calculateWorkoutSessionCalories(
    params.workout,
    params.completedExercises,
  );

  const { data, error } = await (client.from('workout_sessions') as any)
    .update({
      status: 'completed',
      completed: true,
      ended_at: now,
      duration,
      calories_burned: caloriesBurned,
      completed_exercises: params.completedExercises,
    })
    .eq('id', params.session.id)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(getErrorMessage(error, 'No pudimos finalizar la sesión.'));
  }

  const nextSession = mapWorkoutSession(data as WorkoutSessionRow);
  let completedThisWeek: number | null = null;

  try {
    completedThisWeek = await getCompletedWorkoutCountThisWeek(
      params.session.userId,
    );
  } catch (countError) {
    console.warn(
      '[workout-completion] No se pudo calcular la consistencia semanal.',
      countError,
    );
  }

  await awardGamificationEventBestEffort({
    source: 'workout-completion',
    eventType: 'workout_completed',
    referenceId: params.session.id,
    points: 50,
    badgeIds: [
      'first_workout',
      ...(completedThisWeek !== null && completedThisWeek >= 3
        ? (['week_consistency'] as const)
        : []),
    ],
    metadata: {
      sessionId: params.session.id,
      workoutId: params.workout.id,
      workoutTitle: params.workout.title,
      completedExercises: params.completedExercises.length,
      completedThisWeek,
    },
  });

  return nextSession;
}

export async function cancelWorkoutSession(params: {
  session: WorkoutSession;
  workout: Workout;
  completedExercises: string[];
}): Promise<WorkoutSession> {
  const client = getClient();
  const now = new Date().toISOString();
  const duration = calculateSessionDurationMinutes(
    params.session.startedAt,
    params.session.duration,
  );
  const caloriesBurned = calculateWorkoutSessionCalories(
    params.workout,
    params.completedExercises,
  );

  const { data, error } = await (client.from('workout_sessions') as any)
    .update({
      status: 'canceled',
      completed: false,
      ended_at: now,
      duration,
      calories_burned: caloriesBurned,
      completed_exercises: params.completedExercises,
    })
    .eq('id', params.session.id)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return mapWorkoutSession(data as WorkoutSessionRow);
}

export async function resumeWorkoutSession(
  session: WorkoutSession,
): Promise<WorkoutSession> {
  const client = getClient();
  const resumedStartedAt =
    session.duration > 0
      ? new Date(Date.now() - session.duration * 60000).toISOString()
      : session.startedAt || new Date().toISOString();

  const { data, error } = await (client.from('workout_sessions') as any)
    .update({
      status: 'in_progress',
      started_at: resumedStartedAt,
      ended_at: null,
    })
    .eq('id', session.id)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return mapWorkoutSession(data as WorkoutSessionRow);
}

export async function fetchExerciseLibrary(): Promise<LibraryExercise[]> {
  const client = getClient();
  let from = 0;
  const pageSize = 500;
  const rows: ExerciseRow[] = [];
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await client
      .from('exercises')
      .select('*')
      .order('name')
      .range(from, from + pageSize - 1);

    if (error) {
      throw error;
    }

    rows.push(...((data as ExerciseRow[]) || []));
    hasMore = (data?.length || 0) === pageSize;
    from += pageSize;
  }

  return rows.map(mapDbExerciseRow);
}

const equipmentDbValues: Record<string, string> = {
  dumbbells: 'dumbbells',
  machines: 'machine',
  bands: 'resistance_band',
  kettlebells: 'kettlebell',
};

const bodyPartDbValues: Record<string, string[]> = {
  legs: ['legs', 'calves', 'glutes'],
  glutes: ['glutes'],
  shoulders: ['shoulders', 'traps'],
  arms: ['biceps', 'triceps', 'forearms'],
  core: ['core', 'lower_back'],
  fullbody: ['full_body'],
};

export async function fetchExerciseLibraryPage(
  params: ExerciseLibraryPageParams,
): Promise<PaginatedResult<LibraryExercise>> {
  if (params.favoriteIds?.length === 0) {
    return { items: [], total: 0, nextPage: undefined };
  }

  const client = getClient();
  const pageSize = params.pageSize || EXERCISE_LIBRARY_PAGE_SIZE;
  const from = params.page * pageSize;
  const to = from + pageSize - 1;
  let builder = client
    .from('exercises')
    .select('*', { count: 'exact' })
    .order('name')
    .range(from, to);

  const normalizedSearch = params.search.trim();

  if (normalizedSearch) {
    builder = builder.ilike('name', `%${normalizedSearch}%`);
  }

  if (params.equipment !== 'all') {
    builder = builder.eq(
      'equipment',
      equipmentDbValues[params.equipment] || params.equipment,
    );
  }

  if (params.bodyPart !== 'all') {
    const values = bodyPartDbValues[params.bodyPart] || [params.bodyPart];
    builder =
      values.length === 1
        ? builder.eq('muscle_group', values[0])
        : builder.in('muscle_group', values);
  }

  if (params.level !== 'all') {
    builder = builder.eq('difficulty', params.level);
  }

  if (params.favoriteIds && params.favoriteIds.length > 0) {
    builder = builder.in('id', params.favoriteIds);
  }

  const { data, error, count } = await builder;

  if (error) {
    throw error;
  }

  const rows = (data || []) as ExerciseRow[];

  return {
    items: rows.map(mapDbExerciseRow),
    total: count || 0,
    nextPage: rows.length === pageSize ? params.page + 1 : undefined,
  };
}

export async function fetchHomeOverview(params: {
  userId: string;
  dailyWaterGoal?: number | null;
}): Promise<HomeOverview> {
  const client = getClient();
  const today = getLocalDateKey();

  const [
    todaySessionsResult,
    pendingSessionsResult,
    completedEverResult,
    challengeResult,
    nutritionPlanResult,
    todayNutritionResult,
    hydrationTodayResult,
    hydrationRecentResult,
    completedChallengesResult,
  ] = await Promise.all([
    client
      .from('workout_sessions')
      .select('*')
      .eq('user_id', params.userId)
      .eq('date', today)
      .order('created_at', { ascending: false })
      .limit(20),
    fetchPendingSessions(params.userId).then(
      data => ({ data, error: null }),
      (error: unknown) => ({ data: null, error }),
    ),
    client
      .from('workout_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', params.userId)
      .eq('completed', true),
    client
      .from('challenge_participations')
      .select('*')
      .eq('user_id', params.userId)
      .in('status', ['active', 'completed'])
      .order('created_at', { ascending: false })
      .limit(1),
    client
      .from('nutrition_plans')
      .select('*')
      .eq('user_id', params.userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1),
    client
      .from('daily_nutrition_logs')
      .select('*')
      .eq('user_id', params.userId)
      .eq('date', today)
      .limit(1),
    client
      .from('daily_hydration_logs')
      .select('*')
      .eq('user_id', params.userId)
      .eq('date', today)
      .limit(1),
    client
      .from('daily_hydration_logs')
      .select('*')
      .eq('user_id', params.userId)
      .order('date', { ascending: false })
      .limit(14),
    client
      .from('challenge_participations')
      .select('start_date')
      .eq('user_id', params.userId)
      .eq('status', 'completed')
      .order('start_date', { ascending: false }),
  ]);

  if (todaySessionsResult.error) {
    throw todaySessionsResult.error;
  }

  if (pendingSessionsResult.error) {
    throw pendingSessionsResult.error;
  }

  if (completedEverResult.error) {
    throw completedEverResult.error;
  }

  if (challengeResult.error) {
    throw challengeResult.error;
  }

  if (nutritionPlanResult.error) {
    throw nutritionPlanResult.error;
  }

  if (todayNutritionResult.error) {
    throw todayNutritionResult.error;
  }

  if (hydrationTodayResult.error) {
    throw hydrationTodayResult.error;
  }

  if (hydrationRecentResult.error) {
    throw hydrationRecentResult.error;
  }

  if (completedChallengesResult.error) {
    throw completedChallengesResult.error;
  }

  const completedChallenges = (completedChallengesResult.data || []) as Array<{
    start_date: string;
  }>;
  const latestStart = completedChallenges[0]?.start_date ?? null;
  let lastDay33: string | null = null;
  if (latestStart) {
    const day33 = new Date(`${latestStart}T12:00:00`);
    day33.setDate(day33.getDate() + 32);
    lastDay33 = getLocalDateKey(day33);
  }

  const todayRows = (todaySessionsResult.data || []) as WorkoutSessionRow[];
  const completedTodayRow = todayRows.find(
    row => row.status === 'completed' || row.completed === true,
  );
  // Same read and same rule as the routine detail (selectPendingSession).
  const resumable = selectPendingSession(
    (pendingSessionsResult.data as WorkoutSession[] | null) ?? [],
    today,
  );

  let challenge: HomeOverview['challenge'] = null;
  const participation = challengeResult.data?.[0] as
    | ChallengeParticipationRow
    | undefined;

  if (participation) {
    const habits = parseChallengeHabits(participation);
    const habitLogsResult = await client
      .from('habit_logs')
      .select('*')
      .eq('participation_id', participation.id);

    if (habitLogsResult.error) {
      throw habitLogsResult.error;
    }

    const logMap = buildHabitLogMap(
      (habitLogsResult.data || []) as HabitLogRow[],
      habits.length || 3,
    );
    const completedToday = (logMap[today] || []).filter(Boolean).length;
    const completedDays = getCompletedChallengeDays(logMap);
    challenge = {
      id: participation.id,
      userId: participation.user_id,
      status:
        participation.status === 'active' ||
        participation.status === 'completed' ||
        participation.status === 'abandoned'
          ? participation.status
          : 'active',
      startDate: participation.start_date,
      habits,
      challengeDay: getChallengeDay({
        id: participation.id,
        userId: participation.user_id,
        status:
          participation.status === 'active' ||
          participation.status === 'completed' ||
          participation.status === 'abandoned'
            ? participation.status
            : 'active',
        startDate: participation.start_date,
        habits,
      }),
      completedDays,
      streak: getCurrentChallengeStreak(
        {
          id: participation.id,
          userId: participation.user_id,
          status:
            participation.status === 'active' ||
            participation.status === 'completed' ||
            participation.status === 'abandoned'
              ? participation.status
              : 'active',
          startDate: participation.start_date,
          habits,
        },
        logMap,
      ),
      completedToday,
      totalHabits: habits.length || 3,
      progressPct: Math.round((completedDays / 33) * 100),
      todayHabits:
        logMap[today] ||
        Array.from({ length: habits.length || 3 }, () => false),
    };
  }

  const nutritionPlan = nutritionPlanResult.data?.[0]
    ? mapNutritionPlan(nutritionPlanResult.data[0] as NutritionPlanRow)
    : null;

  const todayNutritionLog = todayNutritionResult.data?.[0]
    ? mapDailyNutritionLog(todayNutritionResult.data[0] as DailyNutritionLogRow)
    : null;

  const goalGlasses = params.dailyWaterGoal || 14;
  const goalMl = goalGlasses * 250;
  const todayHydration =
    (hydrationTodayResult.data?.[0] as DailyHydrationLogRow) || null;
  const todayMl = todayHydration?.water_ml || 0;
  const hydrationLogRows = (hydrationRecentResult.data ||
    []) as DailyHydrationLogRow[];
  const hydrationLogs: HydrationLog[] = hydrationLogRows.map(log => ({
    date: log.date,
    waterMl: log.water_ml,
  }));

  return {
    completedToday: completedTodayRow
      ? mapWorkoutSession(completedTodayRow)
      : null,
    resumable,
    todaySessions: todayRows.map(mapWorkoutSession),
    hasCompletedEver: hasCompletedEver(
      completedEverResult.count,
      Boolean(completedTodayRow),
    ),
    core33History: {
      completedCount: completedChallenges.length,
      lastDay33,
    },
    challenge,
    nutritionPlan,
    todayNutritionLog,
    hydration: {
      todayMl,
      goalMl,
      todayGlasses: Math.round(todayMl / 250),
      goalGlasses,
      todayPercentage:
        goalMl > 0 ? Math.min(100, Math.round((todayMl / goalMl) * 100)) : 0,
      streak: calculateHydrationStreak(hydrationLogs, goalMl),
    },
  };
}

export async function addHydrationAmount(params: {
  userId: string;
  amountMl: number;
}): Promise<void> {
  const client = getClient();
  const today = getLocalDateKey();
  const { data: existing, error: fetchError } = await client
    .from('daily_hydration_logs')
    .select('*')
    .eq('user_id', params.userId)
    .eq('date', today)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  const existingRow = (existing as DailyHydrationLogRow | null) || null;

  if (existingRow) {
    const updatePayload: Database['public']['Tables']['daily_hydration_logs']['Update'] =
      {
        water_ml: (existingRow.water_ml || 0) + params.amountMl,
        updated_at: new Date().toISOString(),
      };
    const { error } = await (client.from('daily_hydration_logs') as any)
      .update(updatePayload)
      .eq('id', existingRow.id);

    if (error) {
      throw error;
    }

    await awardHydrationLogged(today);
    return;
  }

  const insertPayload: Database['public']['Tables']['daily_hydration_logs']['Insert'] =
    {
      user_id: params.userId,
      date: today,
      water_ml: params.amountMl,
    };

  const { error } = await (client.from('daily_hydration_logs') as any).insert(
    insertPayload,
  );

  if (error) {
    throw error;
  }

  await awardHydrationLogged(today);
}

// Sent on every water entry with the local date as reference. Points are
// granted once per day (later calls return `duplicate`), but the server
// re-evaluates the hydration badges on each call, so the badge arrives when
// the goal is met. A failure never undoes the saved water.
async function awardHydrationLogged(date: string) {
  await awardGamificationEventBestEffort({
    source: 'hydration-log',
    eventType: 'hydration_logged',
    referenceId: date,
    metadata: { date },
  });
}
