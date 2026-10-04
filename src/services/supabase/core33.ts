import { getLocalDateKey } from '@app/lib/date';
import {
  getChallengeDay,
  getCompletedChallengeDays,
  getCurrentChallengeStreak,
  getLongestChallengeStreak,
  type HabitChallenge,
  type HabitCategory,
} from '@app/shared';
import { startGuard } from '@app/features/core33/core33Model';
import {
  findChallenge,
  habitsForChallenge,
  type Core33ChallengeId,
} from '@app/features/core33/core33Catalog';
import { getSupabaseClient } from '@app/services/supabase/client';
import {
  markCore33Completed,
  resetCore33InviteCounter,
} from '@app/services/supabase/profile';
import { awardGamificationEvent } from '@app/services/supabase/gamification';
import type { Database, Json } from '@app/types/supabase';

type ChallengeParticipationRow =
  Database['public']['Tables']['challenge_participations']['Row'];
type HabitLogRow = Database['public']['Tables']['habit_logs']['Row'];

export type Core33HabitSelection = {
  training: string;
  health: string;
  mind: string;
};

export type Core33TimelineDay = {
  day: number;
  date: string;
  completedCount: number;
  status: 'empty' | 'partial' | 'full';
  isCurrent: boolean;
};

export type Core33State = {
  challenge:
    | (HabitChallenge & {
        challengeDay: number;
        completedDays: number;
        completedToday: number;
        currentStreak: number;
        longestStreak: number;
        progressPct: number;
        overallPct: number;
        totalHabits: number;
      })
    | null;
  habitLogs: Record<string, boolean[]>;
  today: string;
  todayLogs: boolean[];
  timeline: Core33TimelineDay[];
};

const CORE33_DAY_COMPLETED_POINTS = 20;
const CORE33_COMPLETED_POINTS = 500;

const CORE33_HABIT_PRESETS: Array<{
  key: keyof Core33HabitSelection;
  label: string;
  category: HabitCategory;
  options: string[];
}> = [
  {
    key: 'training',
    label: 'Entrenamiento',
    category: 'training',
    options: ['Entrenar 30 min', '10K pasos', 'Estirar 5 min'],
  },
  {
    key: 'health',
    label: 'Salud',
    category: 'health',
    options: ['Beber 2L de agua', 'Sin bebidas azucaradas', 'Comer 1 ensalada'],
  },
  {
    key: 'mind',
    label: 'Mentalidad',
    category: 'mind',
    options: ['Leer 10 min', 'Escribir diario 5 min', 'Meditar 5 min'],
  },
];

function getClient() {
  const client = getSupabaseClient();

  if (!client) {
    throw new Error('Supabase no está configurado.');
  }

  return client;
}

function getChallengeStatus(value: string): HabitChallenge['status'] {
  if (value === 'completed' || value === 'abandoned') {
    return value;
  }

  return 'active';
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

function buildCore33State(
  participation: ChallengeParticipationRow | undefined,
  logs: HabitLogRow[],
): Core33State {
  const today = getLocalDateKey();

  if (!participation) {
    return {
      challenge: null,
      habitLogs: {},
      today,
      todayLogs: [],
      timeline: [],
    };
  }

  const habits = parseChallengeHabits(participation);
  const challenge: HabitChallenge = {
    id: participation.id,
    userId: participation.user_id,
    status: getChallengeStatus(participation.status),
    startDate: participation.start_date,
    habits,
  };
  const totalHabits = habits.length || 3;
  const habitLogs = buildHabitLogMap(logs, totalHabits);
  const challengeDay = getChallengeDay(challenge);
  const completedDays = getCompletedChallengeDays(habitLogs);
  const completedToday = (habitLogs[today] || []).filter(Boolean).length;
  const totalChecks = Object.values(habitLogs).reduce(
    (sum, dayLogs) => sum + dayLogs.filter(Boolean).length,
    0,
  );
  const timeline = Array.from({ length: 33 }, (_, index) => {
    const date = new Date(`${challenge.startDate}T00:00:00`);
    date.setDate(date.getDate() + index);
    const dateKey = getLocalDateKey(date);
    const dayLogs = habitLogs[dateKey] || [];
    const completedCount = dayLogs.filter(Boolean).length;

    return {
      day: index + 1,
      date: dateKey,
      completedCount,
      status:
        completedCount === totalHabits
          ? 'full'
          : completedCount > 0
          ? 'partial'
          : 'empty',
      isCurrent: index + 1 === challengeDay,
    } satisfies Core33TimelineDay;
  });

  return {
    challenge: {
      ...challenge,
      challengeDay,
      completedDays,
      completedToday,
      currentStreak: getCurrentChallengeStreak(challenge, habitLogs),
      longestStreak: getLongestChallengeStreak(challenge, habitLogs),
      progressPct: Math.min(100, Math.round((completedDays / 33) * 100)),
      overallPct: Math.min(
        100,
        Math.round((totalChecks / (33 * totalHabits)) * 100),
      ),
      totalHabits,
    },
    habitLogs,
    today,
    todayLogs:
      habitLogs[today] || Array.from({ length: totalHabits }, () => false),
    timeline,
  };
}

export function getCore33HabitPresets() {
  return CORE33_HABIT_PRESETS;
}

export async function fetchCore33State(userId: string): Promise<Core33State> {
  const client = getClient();
  const { data, error } = await client
    .from('challenge_participations')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['active', 'completed'])
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  const participation = data?.[0] as ChallengeParticipationRow | undefined;

  if (!participation) {
    return buildCore33State(undefined, []);
  }

  const { data: logs, error: logsError } = await client
    .from('habit_logs')
    .select('*')
    .eq('participation_id', participation.id);

  if (logsError) {
    throw logsError;
  }

  return buildCore33State(participation, (logs || []) as HabitLogRow[]);
}

// Thrown when the user already has an active challenge.
export class Core33AlreadyActiveError extends Error {
  constructor() {
    super('Ya tienes un Core 33 activo.');
    this.name = 'Core33AlreadyActiveError';
  }
}

// Starts the chosen challenge today: a participation is created with the 3
// habits of the catalogue (stored in `habits` with ids
// `core33:<challenge>:<n>`). It never abandons another one: with an active
// challenge it throws Core33AlreadyActiveError, checked on the server right
// before creating (the cached state may be stale).
export async function startCore33Challenge(params: {
  userId: string;
  challengeId: Core33ChallengeId;
}): Promise<void> {
  const client = getClient();
  const challenge = findChallenge(params.challengeId);

  if (!challenge) {
    throw new Error('Ese reto no existe.');
  }

  const { data: current, error: checkError } = await client
    .from('challenge_participations')
    .select('status')
    .eq('user_id', params.userId)
    .eq('status', 'active');

  if (checkError) {
    throw checkError;
  }

  if (startGuard((current ?? []) as { status: string }[]) === 'alreadyActive') {
    throw new Core33AlreadyActiveError();
  }

  const { error } = await (
    client.from('challenge_participations') as any
  ).insert({
    user_id: params.userId,
    status: 'active',
    start_date: getLocalDateKey(),
    habits: habitsForChallenge(challenge),
  });

  if (error) {
    throw error;
  }
}

// Gives up the active challenge (it stays in the history as abandoned).
export async function restartCore33Challenge(params: {
  userId: string;
  challengeId: string;
}): Promise<void> {
  const client = getClient();
  const { error } = await (client.from('challenge_participations') as any)
    .update({ status: 'abandoned' })
    .eq('id', params.challengeId)
    .eq('user_id', params.userId);

  if (error) {
    throw error;
  }
}

export type Core33ToggleResult = {
  // This tap closed the day.
  dayClosed: boolean;
  // This tap closed day 33 and completed the challenge.
  challengeCompleted: boolean;
};

// `habitLogs` are the logs BEFORE this tap (the caller serialises taps and
// keeps them up to date), so closing the day is detected exactly once.
export async function toggleCore33Habit(params: {
  userId: string;
  challenge: NonNullable<Core33State['challenge']>;
  habitLogs: Record<string, boolean[]>;
  date: string;
  habitIndex: number;
}): Promise<Core33ToggleResult> {
  const client = getClient();
  const result: Core33ToggleResult = {
    dayClosed: false,
    challengeCompleted: false,
  };

  if (params.challenge.status === 'completed') {
    return result;
  }

  const totalHabits = params.challenge.totalHabits || 3;
  const currentDayLogs =
    params.habitLogs[params.date] ||
    Array.from({ length: totalHabits }, () => false);
  const previousDayCompleted =
    currentDayLogs.length > 0 && currentDayLogs.every(Boolean);
  const nextValue = !currentDayLogs[params.habitIndex];
  const nextDayLogs = [...currentDayLogs];
  nextDayLogs[params.habitIndex] = nextValue;
  const nextHabitLogs = {
    ...params.habitLogs,
    [params.date]: nextDayLogs,
  };
  const nextDayCompleted = nextDayLogs.every(Boolean);

  const { error } = await (client.from('habit_logs') as any).upsert(
    {
      participation_id: params.challenge.id,
      user_id: params.userId,
      date: params.date,
      habit_index: params.habitIndex,
      completed: nextValue,
    },
    { onConflict: 'participation_id,date,habit_index' },
  );

  if (error) {
    throw error;
  }

  if (!previousDayCompleted && nextDayCompleted) {
    result.dayClosed = true;
    await awardGamificationEvent({
      eventType: 'core33_day_completed',
      referenceId: `${params.challenge.id}:${params.date}`,
      points: CORE33_DAY_COMPLETED_POINTS,
      metadata: {
        challengeId: params.challenge.id,
        date: params.date,
        habitIndex: params.habitIndex,
      },
    });

    const streak = getCurrentChallengeStreak(params.challenge, nextHabitLogs);
    if (streak >= 7) {
      await awardGamificationEvent({
        eventType: 'core33_streak_7',
        referenceId: params.challenge.id,
        badgeIds: ['streak_7_days'],
        metadata: {
          challengeId: params.challenge.id,
          streak,
        },
      });
    }

    const completedDays = getCompletedChallengeDays(nextHabitLogs);
    const challengeDay = getChallengeDay(params.challenge);

    if (completedDays >= 33 && challengeDay >= 33) {
      const { error: updateError } = await (
        client.from('challenge_participations') as any
      )
        .update({ status: 'completed' })
        .eq('id', params.challenge.id)
        .eq('user_id', params.userId);

      if (updateError) {
        throw updateError;
      }

      // One event per participation (referenceId): the medal and the points
      // are granted once even if this runs twice.
      await awardGamificationEvent({
        eventType: 'core33_completed',
        referenceId: params.challenge.id,
        points: CORE33_COMPLETED_POINTS,
        badgeIds: ['core33_finisher'],
        metadata: {
          challengeId: params.challenge.id,
          completedDays,
          challengeDay,
        },
      });

      // The profile remembers it and the invite card starts over (BT-22).
      // Best effort: the challenge is already completed.
      await Promise.all([
        markCore33Completed(params.userId),
        resetCore33InviteCounter(params.userId),
      ]).catch(profileError =>
        console.warn('[core33] No se pudo actualizar el perfil.', profileError),
      );
      result.challengeCompleted = true;
    }
  }

  return result;
}
