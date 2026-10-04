import {
  getChallengeDay,
  getCompletedChallengeDays,
  getCurrentChallengeStreak,
  getLongestChallengeStreak,
  getMissedChallengeDays,
  CORE33_TOTAL_DAYS,
  dateKeyInZone,
  type HabitLogMap,
} from '@app/shared/domain/core33';
import {
  challengeOfHabits,
  pillarOf,
} from '@app/features/core33/core33Catalog';

// What the day screen of Core 33 shows, from the participation and its logs.
// Inicio, Progreso, Perfil and ELLIE read the same shared domain functions
// (`shared/domain/core33`), so the numbers agree.

export type CapsuleState = 'closed' | 'closedToday' | 'today' | 'open';

export type DayHabit = {
  index: number;
  pillar: string;
  text: string;
  done: boolean;
};

export type Core33DayView = {
  title: string; // challenge name, or "Core 33"
  completed: boolean;
  day: number; // calendar day of the challenge (1–33)
  closed: number; // closed days (the big number)
  total: number; // 33
  streak: number;
  longest: number;
  left: number; // days left to close
  missed: number;
  habits: DayHabit[];
  doneCount: number;
  todayClosed: boolean;
  overline: string; // "Construye fuerza · Día 13" · "Último día" · "Reto completado"
  sub: string; // "2 hábitos para cerrar el último día."
  todayTitle: string; // "Hoy" · "Día cerrado"
  todayHint: string;
  missedLine: string | null;
  capsules: CapsuleState[];
};

type ChallengeInput = {
  status: 'active' | 'completed' | 'abandoned';
  startDate: string;
  habits: { id: string; category: string; name: string }[];
};

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export function buildCore33DayView(input: {
  challenge: ChallengeInput;
  habitLogs: HabitLogMap;
  today?: Date;
  timeZone?: string;
  // Taps not yet confirmed by the server: habit index → done.
  overrides?: Record<number, boolean>;
}): Core33DayView {
  const { challenge, habitLogs } = input;
  const today = input.today ?? new Date();
  const todayKey = dateKeyInZone(today, input.timeZone);
  const total = challenge.habits.length || 3;

  // Today's logs with the pending taps on top.
  const logs: HabitLogMap = { ...habitLogs };
  const base = habitLogs[todayKey] ?? Array.from({ length: total }, () => false);
  logs[todayKey] = base.map((done, index) => input.overrides?.[index] ?? done);

  const completed = challenge.status === 'completed';
  const habitChallenge = {
    id: '',
    userId: '',
    status: challenge.status,
    startDate: challenge.startDate,
    habits: [],
  } as never;
  const day = getChallengeDay(habitChallenge, today, CORE33_TOTAL_DAYS, input.timeZone);
  const closed = Math.min(CORE33_TOTAL_DAYS, getCompletedChallengeDays(logs));
  const todayLogs = logs[todayKey];
  const doneCount = todayLogs.filter(Boolean).length;
  const todayClosed = todayLogs.length > 0 && todayLogs.every(Boolean);
  const missed = completed
    ? 0
    : getMissedChallengeDays(habitChallenge, logs, today, input.timeZone);
  const catalog = challengeOfHabits(challenge.habits);
  const title = catalog?.name ?? 'Core 33';
  const left = Math.max(0, CORE33_TOTAL_DAYS - closed);
  const lastDay = day >= CORE33_TOTAL_DAYS;
  const remaining = total - doneCount;

  const capsules = Array.from({ length: CORE33_TOTAL_DAYS }, (_, index) => {
    if (index < closed) {
      return todayClosed && !completed && index === closed - 1
        ? ('closedToday' as const)
        : ('closed' as const);
    }
    return !completed && !todayClosed && index === closed
      ? ('today' as const)
      : ('open' as const);
  });

  return {
    title,
    completed,
    day,
    closed,
    total: CORE33_TOTAL_DAYS,
    streak: getCurrentChallengeStreak(habitChallenge, logs, today, CORE33_TOTAL_DAYS, input.timeZone),
    longest: getLongestChallengeStreak(habitChallenge, logs),
    left,
    missed,
    habits: challenge.habits.map((habit, index) => ({
      index,
      pillar: pillarOf(challenge.habits, index),
      text: habit.name,
      done: Boolean(todayLogs[index]),
    })),
    doneCount,
    todayClosed,
    overline: completed
      ? 'Reto completado'
      : lastDay
      ? 'Último día'
      : `${catalog ? `${catalog.name} · ` : ''}Día ${day}`,
    sub: completed
      ? ''
      : todayClosed
      ? `Día ${day} cerrado. Mañana sigue.`
      : `${remaining} ${plural(remaining, 'hábito', 'hábitos')} para cerrar ${
          lastDay ? 'el último día' : 'el día'
        }.`,
    todayTitle: completed || todayClosed ? 'Día cerrado' : 'Hoy',
    todayHint: completed
      ? `Día ${CORE33_TOTAL_DAYS} cerrado. Vuelve a empezar cuando quieras.`
      : todayClosed
      ? `Día ${day} cerrado. Vuelve mañana.`
      : 'Toca cada hábito al completarlo.',
    missedLine:
      missed > 0 && !completed
        ? `Llevas ${missed} ${plural(missed, 'día', 'días')} sin cerrar. El reto termina cuando cierres 33.`
        : null,
    capsules,
  };
}

// "10.000 pasos" → unchanged; "días" / "día" of "Por cerrar".
export const leftUnit = (left: number) => plural(left, 'día', 'días');

// Starting a challenge while another is active is not allowed (until the
// backend guarantees one active participation, BT-36): the active one is
// left only from "Dejar este reto".
export function startGuard(
  participations: { status: string }[],
): 'ok' | 'alreadyActive' {
  return participations.some(item => item.status === 'active')
    ? 'alreadyActive'
    : 'ok';
}

// `reference_id` of the Core 33 gamification events (the server catalogue,
// BACKEND_SUMMARY §6/§8): one per participation and day (reference_kind
// participation_date, once per reference, daily limit 1) and one per
// participation (reference_kind challenge_participation).
export const core33DayReference = (participationId: string, date: string) =>
  `${participationId}:${date}`;
export const core33ParticipationReference = (participationId: string) =>
  participationId;

// A tap on a habit: the logs of the day with that habit flipped.
export function flipHabit(
  logs: boolean[] | undefined,
  index: number,
  total: number,
): boolean[] {
  const next = Array.from({ length: total }, (_, i) => Boolean(logs?.[i]));
  next[index] = !next[index];
  return next;
}
