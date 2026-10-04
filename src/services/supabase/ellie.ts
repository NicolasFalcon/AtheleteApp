import {getLocalDateKey} from '@app/lib/date';
import {
  calculateHydrationStreak,
  getChallengeDay,
  getCompletedChallengeDays,
  getCurrentChallengeStreak,
  type DailyNutritionLog,
  type HabitChallenge,
  type HydrationLog,
  type NutritionPlan,
  type WorkoutSession,
} from '@app/shared';
import {
  DEFAULT_WATER_GOAL_GLASSES,
  GLASS_ML,
} from '@app/features/nutrition/nutritionModel';
import {getSupabaseClient} from '@app/services/supabase/client';
import type {Database, Json} from '@app/types/supabase';

type ChallengeParticipationRow =
  Database['public']['Tables']['challenge_participations']['Row'];
type DailyHydrationLogRow =
  Database['public']['Tables']['daily_hydration_logs']['Row'];
type DailyNutritionLogRow =
  Database['public']['Tables']['daily_nutrition_logs']['Row'];
type NutritionPlanRow = Database['public']['Tables']['nutrition_plans']['Row'];
type WorkoutSessionRow = Database['public']['Tables']['workout_sessions']['Row'];

export type EllieOverview = {
  workoutSessions: WorkoutSession[];
  challenge: HabitChallenge | null;
  habitLogs: Record<string, boolean[]>;
  challengeDay: number;
  completedDays: number;
  currentStreak: number;
  nutritionPlan: NutritionPlan | null;
  todayNutritionLog: DailyNutritionLog | null;
  dailyNutritionLogs: DailyNutritionLog[];
  hydration: {
    todayMl: number;
    goalMl: number;
    todayPercentage: number;
    daysMetGoalThisWeek: number;
    weeklyAverageMl: number;
    hydrationStreak: number;
  };
  profileExtras: {
    points: number;
    restrictionsNotes: string;
    injuryNotes: string;
    exercisePreferences: string[];
    exerciseAvoidances: string[];
    dietPreferences: string[];
    foodAvoidances: string[];
  };
  badges: Array<{id: string; earnedAt?: string}>;
  workoutCount: number;
};

export type EllieChatMessageRow = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

function getClient() {
  const client = getSupabaseClient();

  if (!client) {
    throw new Error('Supabase no está configurado.');
  }

  return client;
}

function mapWorkoutSession(row: WorkoutSessionRow): WorkoutSession {
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
      row.status === 'canceled'
        ? row.status
        : 'idle',
    startedAt: row.started_at,
    endedAt: row.ended_at,
    completedExercises: Array.isArray(row.completed_exercises)
      ? row.completed_exercises.filter(
          (item): item is string => typeof item === 'string',
        )
      : [],
    totalExercises: row.total_exercises || 0,
    createdAt: row.created_at,
  };
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
  logs: Array<{
    date: string;
    habit_index: number;
    completed: boolean | null;
  }>,
  totalHabits: number,
): Record<string, boolean[]> {
  const map: Record<string, boolean[]> = {};

  logs.forEach(log => {
    if (!map[log.date]) {
      map[log.date] = Array.from({length: totalHabits}, () => false);
    }

    if (log.habit_index >= 0 && log.habit_index < totalHabits) {
      map[log.date][log.habit_index] = log.completed || false;
    }
  });

  return map;
}

function getWeekStartKey(today: Date = new Date()): string {
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay());
  return getLocalDateKey(start);
}

export async function fetchEllieOverview(params: {
  userId: string;
  dailyWaterGoal?: number | null;
}): Promise<EllieOverview> {
  const client = getClient();
  const today = getLocalDateKey();
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const fourteenDaysAgoKey = getLocalDateKey(fourteenDaysAgo);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoKey = getLocalDateKey(thirtyDaysAgo);
  const weekStartKey = getWeekStartKey();

  const [
    profileResult,
    workoutSessionsResult,
    challengeResult,
    nutritionPlanResult,
    nutritionLogsResult,
    hydrationLogsResult,
    workoutCountResult,
    badgesResult,
  ] = await Promise.all([
    (client.from('profiles') as any).select('*').eq('id', params.userId).maybeSingle(),
    client
      .from('workout_sessions')
      .select('*')
      .eq('user_id', params.userId)
      .gte('date', thirtyDaysAgoKey)
      .order('date', {ascending: false}),
    client
      .from('challenge_participations')
      .select('*')
      .eq('user_id', params.userId)
      .eq('status', 'active')
      .order('created_at', {ascending: false})
      .limit(1),
    client
      .from('nutrition_plans')
      .select('*')
      .eq('user_id', params.userId)
      .eq('is_active', true)
      .order('created_at', {ascending: false})
      .limit(1),
    client
      .from('daily_nutrition_logs')
      .select('*')
      .eq('user_id', params.userId)
      .gte('date', fourteenDaysAgoKey)
      .order('date', {ascending: false}),
    client
      .from('daily_hydration_logs')
      .select('*')
      .eq('user_id', params.userId)
      .gte('date', fourteenDaysAgoKey)
      .order('date', {ascending: false}),
    (client.from('workout_templates') as any)
      .select('id', {count: 'exact', head: true}),
    (client.from('user_badges') as any)
      .select('badge_id, earned_at')
      .eq('user_id', params.userId)
      .order('earned_at', {ascending: false}),
  ]);

  if (profileResult.error) {
    throw profileResult.error;
  }
  if (workoutSessionsResult.error) {
    throw workoutSessionsResult.error;
  }
  if (challengeResult.error) {
    throw challengeResult.error;
  }
  if (nutritionPlanResult.error) {
    throw nutritionPlanResult.error;
  }
  if (nutritionLogsResult.error) {
    throw nutritionLogsResult.error;
  }
  if (hydrationLogsResult.error) {
    throw hydrationLogsResult.error;
  }
  if (workoutCountResult.error) {
    throw workoutCountResult.error;
  }

  const workoutSessions = ((workoutSessionsResult.data || []) as WorkoutSessionRow[]).map(
    mapWorkoutSession,
  );

  const nutritionPlan = nutritionPlanResult.data?.[0]
    ? mapNutritionPlan(nutritionPlanResult.data[0] as NutritionPlanRow)
    : null;
  const nutritionLogs = ((nutritionLogsResult.data || []) as DailyNutritionLogRow[]).map(
    mapDailyNutritionLog,
  );
  const todayNutritionLog =
    nutritionLogs.find(log => log.date === today) || null;

  let challenge: HabitChallenge | null = null;
  let habitLogs: Record<string, boolean[]> = {};
  let challengeDay = 0;
  let completedDays = 0;
  let currentStreak = 0;
  const participation = challengeResult.data?.[0] as
    | ChallengeParticipationRow
    | undefined;

  if (participation) {
    const habits = parseChallengeHabits(participation);
    const challengeRecord: HabitChallenge = {
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
    };

    const habitLogsResult = await client
      .from('habit_logs')
      .select('date, habit_index, completed')
      .eq('participation_id', participation.id);

    if (habitLogsResult.error) {
      throw habitLogsResult.error;
    }

    habitLogs = buildHabitLogMap(
      (habitLogsResult.data || []) as Array<{
        date: string;
        habit_index: number;
        completed: boolean | null;
      }>,
      habits.length || 3,
    );

    challenge = challengeRecord;
    challengeDay = getChallengeDay(challengeRecord);
    completedDays = getCompletedChallengeDays(habitLogs);
    currentStreak = getCurrentChallengeStreak(challengeRecord, habitLogs);
  }

  const goalGlasses = params.dailyWaterGoal || DEFAULT_WATER_GOAL_GLASSES;
  const goalMl = goalGlasses * GLASS_ML;
  const hydrationRows = (hydrationLogsResult.data || []) as DailyHydrationLogRow[];
  const hydrationLogs: HydrationLog[] = hydrationRows.map(row => ({
    date: row.date,
    waterMl: row.water_ml,
  }));
  const todayHydration = hydrationRows.find(row => row.date === today) || null;
  const weekHydrationLogs = hydrationLogs.filter(log => log.date >= weekStartKey);
  const daysMetGoalThisWeek =
    goalMl > 0
      ? weekHydrationLogs.filter(log => log.waterMl >= goalMl).length
      : 0;
  const weeklyAverageMl =
    weekHydrationLogs.length > 0
      ? Math.round(
          weekHydrationLogs.reduce((sum, log) => sum + log.waterMl, 0) /
            weekHydrationLogs.length,
        )
      : 0;

  const profileExtrasRow = (profileResult.data || {}) as Record<string, any>;
  const badges = ((badgesResult.data || []) as Array<Record<string, any>>).map(
    badge => ({
      id: String(badge.badge_id),
      earnedAt:
        typeof badge.earned_at === 'string' ? badge.earned_at : undefined,
    }),
  );

  return {
    workoutSessions,
    challenge,
    habitLogs,
    challengeDay,
    completedDays,
    currentStreak,
    nutritionPlan,
    todayNutritionLog,
    dailyNutritionLogs: nutritionLogs,
    hydration: {
      todayMl: todayHydration?.water_ml || 0,
      goalMl,
      todayPercentage:
        goalMl > 0
          ? Math.min(
              100,
              Math.round(((todayHydration?.water_ml || 0) / goalMl) * 100),
            )
          : 0,
      daysMetGoalThisWeek,
      weeklyAverageMl,
      hydrationStreak: calculateHydrationStreak(hydrationLogs, goalMl),
    },
    profileExtras: {
      points:
        typeof profileExtrasRow.points === 'number' ? profileExtrasRow.points : 0,
      restrictionsNotes:
        typeof profileExtrasRow.restrictions_notes === 'string'
          ? profileExtrasRow.restrictions_notes
          : '',
      injuryNotes:
        typeof profileExtrasRow.injury_notes === 'string'
          ? profileExtrasRow.injury_notes
          : '',
      exercisePreferences: Array.isArray(profileExtrasRow.exercise_preferences)
        ? profileExtrasRow.exercise_preferences.filter(
            (value: unknown): value is string => typeof value === 'string',
          )
        : [],
      exerciseAvoidances: Array.isArray(profileExtrasRow.exercise_avoidances)
        ? profileExtrasRow.exercise_avoidances.filter(
            (value: unknown): value is string => typeof value === 'string',
          )
        : [],
      dietPreferences: Array.isArray(profileExtrasRow.diet_preferences)
        ? profileExtrasRow.diet_preferences.filter(
            (value: unknown): value is string => typeof value === 'string',
          )
        : [],
      foodAvoidances: Array.isArray(profileExtrasRow.food_avoidances)
        ? profileExtrasRow.food_avoidances.filter(
            (value: unknown): value is string => typeof value === 'string',
          )
        : [],
    },
    badges,
    workoutCount: workoutCountResult.count || 0,
  };
}

export async function fetchEllieChatHistory(
  userId: string,
): Promise<EllieChatMessageRow[]> {
  const client = getClient();
  const {data, error} = await (client.from('chat_messages') as any)
    .select('id, role, content, created_at')
    .eq('user_id', userId)
    .order('created_at', {ascending: true});

  if (error) {
    throw error;
  }

  return ((data || []) as Array<Record<string, any>>).map(row => ({
    id: String(row.id),
    role: row.role === 'user' ? 'user' : 'assistant',
    content: String(row.content || ''),
    createdAt: String(row.created_at || ''),
  }));
}

export async function insertEllieChatMessage(params: {
  userId: string;
  role: 'user' | 'assistant';
  content: string;
}): Promise<void> {
  const client = getClient();
  const {error} = await (client.from('chat_messages') as any).insert({
    user_id: params.userId,
    role: params.role,
    content: params.content,
  });

  if (error) {
    throw error;
  }
}

export async function clearEllieChatHistory(userId: string): Promise<void> {
  const client = getClient();
  const {error} = await (client.from('chat_messages') as any)
    .delete()
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}
