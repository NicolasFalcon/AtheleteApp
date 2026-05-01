import {getChallengeDay, getCompletedChallengeDays, type NutritionPlan} from '@app/shared';
import {getSupabaseClient} from '@app/services/supabase/client';
import type {Database, Json} from '@app/types/supabase';

type ChallengeParticipationRow =
  Database['public']['Tables']['challenge_participations']['Row'];
type NutritionPlanRow = Database['public']['Tables']['nutrition_plans']['Row'];
type WorkoutSessionRow = Database['public']['Tables']['workout_sessions']['Row'];

export type ProfileBadge = {
  id: string;
  earnedAt?: string;
};

export type ProfileChallengeSummary = {
  id: string;
  challengeDay: number;
  completedDays: number;
  progressPct: number;
  habits: Array<{id: string; name: string; category: string}>;
};

export type ProfileOverview = {
  points: number;
  currentStreak: number;
  longestStreak: number;
  nutritionPlan: NutritionPlan | null;
  badges: ProfileBadge[];
  challenge: ProfileChallengeSummary | null;
};

function getClient() {
  const client = getSupabaseClient();

  if (!client) {
    throw new Error('Supabase no está configurado.');
  }

  return client;
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

function parseChallengeHabits(participation: ChallengeParticipationRow) {
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
      name: typeof item.name === 'string' ? item.name : '',
      category:
        item.category === 'training' ||
        item.category === 'health' ||
        item.category === 'mind'
          ? item.category
          : 'training',
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

function getUniqueCompletedDates(rows: WorkoutSessionRow[]): string[] {
  return [...new Set(rows.filter(row => row.completed).map(row => row.date))].sort();
}

function calculateCurrentStreak(dates: string[]): number {
  const completed = new Set(dates);
  let streak = 0;

  for (let offset = 0; offset < 365; offset += 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    const key = `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;

    if (completed.has(key)) {
      streak += 1;
      continue;
    }

    if (offset > 0) {
      break;
    }
  }

  return streak;
}

function calculateLongestStreak(dates: string[]): number {
  if (dates.length === 0) {
    return 0;
  }

  let longest = 1;
  let current = 1;

  for (let index = 1; index < dates.length; index += 1) {
    const previous = new Date(`${dates[index - 1]}T00:00:00`);
    const currentDate = new Date(`${dates[index]}T00:00:00`);
    const diff = Math.round(
      (currentDate.getTime() - previous.getTime()) / 86400000,
    );

    if (diff === 1) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
}

export async function fetchProfileOverview(userId: string): Promise<ProfileOverview> {
  const client = getClient();

  const [
    profileResult,
    badgesResult,
    nutritionPlanResult,
    challengeResult,
    workoutSessionsResult,
  ] = await Promise.all([
    (client.from('profiles') as any).select('*').eq('id', userId).maybeSingle(),
    (client.from('user_badges') as any)
      .select('badge_id, earned_at')
      .eq('user_id', userId)
      .order('earned_at', {ascending: false}),
    client
      .from('nutrition_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', {ascending: false})
      .limit(1),
    client
      .from('challenge_participations')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', {ascending: false})
      .limit(1),
    client
      .from('workout_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('completed', true)
      .order('date', {ascending: true}),
  ]);

  if (profileResult.error) {
    throw profileResult.error;
  }
  if (badgesResult.error) {
    throw badgesResult.error;
  }
  if (nutritionPlanResult.error) {
    throw nutritionPlanResult.error;
  }
  if (challengeResult.error) {
    throw challengeResult.error;
  }
  if (workoutSessionsResult.error) {
    throw workoutSessionsResult.error;
  }

  const points =
    typeof (profileResult.data as any)?.points === 'number'
      ? (profileResult.data as any).points
      : 0;
  const badges = ((badgesResult.data || []) as Array<Record<string, any>>).map(
    badge => ({
      id: String(badge.badge_id),
      earnedAt:
        typeof badge.earned_at === 'string' ? badge.earned_at : undefined,
    }),
  );
  const nutritionPlan = nutritionPlanResult.data?.[0]
    ? mapNutritionPlan(nutritionPlanResult.data[0] as NutritionPlanRow)
    : null;

  let challenge: ProfileChallengeSummary | null = null;
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

    const habitLogs = buildHabitLogMap(
      (habitLogsResult.data || []) as Array<{
        date: string;
        habit_index: number;
        completed: boolean | null;
      }>,
      habits.length || 3,
    );
    const completedDays = getCompletedChallengeDays(habitLogs);

    challenge = {
      id: participation.id,
      challengeDay: getChallengeDay({
        id: participation.id,
        userId: participation.user_id,
        startDate: participation.start_date,
        status:
          participation.status === 'active' ||
          participation.status === 'completed' ||
          participation.status === 'abandoned'
            ? participation.status
            : 'active',
        habits: habits.map(habit => ({
          id: habit.id,
          challengeId: participation.id,
          category:
            habit.category === 'training' ||
            habit.category === 'health' ||
            habit.category === 'mind'
              ? habit.category
              : 'training',
          name: habit.name,
        })),
      }),
      completedDays,
      progressPct: Math.min(100, Math.round((completedDays / 33) * 100)),
      habits,
    };
  }

  const completedDates = getUniqueCompletedDates(
    (workoutSessionsResult.data || []) as WorkoutSessionRow[],
  );

  return {
    points,
    currentStreak: calculateCurrentStreak(completedDates),
    longestStreak: calculateLongestStreak(completedDates),
    nutritionPlan,
    badges,
    challenge,
  };
}
