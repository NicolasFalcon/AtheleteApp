import {getLocalDateKey} from '@app/lib/date';
import {
  getChallengeDay,
  getCompletedChallengeDays,
  getCurrentChallengeStreak,
  type DailyNutritionLog,
  type HabitChallenge,
  type HydrationLog,
  type NutritionPlan,
  type WorkoutSession,
} from '@app/shared';
import {DEFAULT_WATER_GOAL_GLASSES} from '@app/features/nutrition/nutritionModel';
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

export type ProgressChallenge = HabitChallenge & {
  challengeDay: number;
  completedDays: number;
  currentStreak: number;
  progressPct: number;
  completedToday: number;
  totalHabits: number;
};

export type ProgressOverview = {
  workoutSessions: WorkoutSession[];
  nutritionPlan: NutritionPlan | null;
  dailyNutritionLogs: DailyNutritionLog[];
  hydrationLogs: HydrationLog[];
  habitLogs: Record<string, boolean[]>;
  challenge: ProgressChallenge | null;
  dailyWaterGoal: number;
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
  logs: Array<{date: string; habit_index: number; completed: boolean | null}>,
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

export async function fetchProgressOverview(params: {
  userId: string;
  dailyWaterGoal?: number | null;
}): Promise<ProgressOverview> {
  const client = getClient();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoKey = getLocalDateKey(thirtyDaysAgo);
  const today = getLocalDateKey();

  const [
    workoutSessionsResult,
    nutritionPlanResult,
    nutritionLogsResult,
    hydrationLogsResult,
    challengeResult,
  ] = await Promise.all([
    client
      .from('workout_sessions')
      .select('*')
      .eq('user_id', params.userId)
      .gte('date', thirtyDaysAgoKey)
      .order('date', {ascending: true}),
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
      .gte('date', thirtyDaysAgoKey)
      .order('date', {ascending: true}),
    client
      .from('daily_hydration_logs')
      .select('*')
      .eq('user_id', params.userId)
      .gte('date', thirtyDaysAgoKey)
      .order('date', {ascending: true}),
    client
      .from('challenge_participations')
      .select('*')
      .eq('user_id', params.userId)
      .in('status', ['active', 'completed'])
      .order('created_at', {ascending: false})
      .limit(1),
  ]);

  if (workoutSessionsResult.error) {
    throw workoutSessionsResult.error;
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
  if (challengeResult.error) {
    throw challengeResult.error;
  }

  const workoutSessions = ((workoutSessionsResult.data || []) as WorkoutSessionRow[]).map(
    mapWorkoutSession,
  );
  const nutritionPlan = nutritionPlanResult.data?.[0]
    ? mapNutritionPlan(nutritionPlanResult.data[0] as NutritionPlanRow)
    : null;
  const dailyNutritionLogs = ((nutritionLogsResult.data || []) as DailyNutritionLogRow[]).map(
    mapDailyNutritionLog,
  );
  const hydrationLogs = ((hydrationLogsResult.data || []) as DailyHydrationLogRow[]).map(
    row => ({
      date: row.date,
      waterMl: row.water_ml,
    }),
  );

  let challenge: ProgressChallenge | null = null;
  let habitLogs: Record<string, boolean[]> = {};
  const participation = challengeResult.data?.[0] as
    | ChallengeParticipationRow
    | undefined;

  if (participation) {
    const habits = parseChallengeHabits(participation);
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

    const baseChallenge: HabitChallenge = {
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

    const totalHabits = habits.length || 3;
    const completedDays = getCompletedChallengeDays(habitLogs);
    const completedToday = habitLogs[today]?.filter(Boolean).length || 0;

    challenge = {
      ...baseChallenge,
      challengeDay: getChallengeDay(baseChallenge),
      completedDays,
      currentStreak: getCurrentChallengeStreak(baseChallenge, habitLogs),
      progressPct: Math.min(100, Math.round((completedDays / 33) * 100)),
      completedToday,
      totalHabits,
    };
  }

  return {
    workoutSessions,
    nutritionPlan,
    dailyNutritionLogs,
    hydrationLogs,
    habitLogs,
    challenge,
    dailyWaterGoal: params.dailyWaterGoal || DEFAULT_WATER_GOAL_GLASSES,
  };
}
