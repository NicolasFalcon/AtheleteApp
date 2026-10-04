import type { HabitChallenge } from '@app/shared/domain/types';

export type HabitLogMap = Record<string, boolean[]>;

export const CORE33_TOTAL_DAYS = 33;

// ── Dates as keys (YYYY-MM-DD) ──────────────────────────────────────────────
// The day of the challenge is counted between date keys, never between
// timestamps: a 23 or 25 hour day (daylight saving) cannot move it, and the
// time zone only decides what "today" is.
function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// The calendar day of `date` in `timeZone` (default: the device's).
export function dateKeyInZone(date: Date, timeZone?: string): string {
  if (!timeZone) {
    return toDateKey(date);
  }
  try {
    // en-CA formats as YYYY-MM-DD.
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return toDateKey(date);
  }
}

const keyToUtcMs = (key: string) => {
  const [year, month, day] = key.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
};

export function addDaysToKey(key: string, days: number): string {
  const date = new Date(keyToUtcMs(key) + days * 86400000);
  return `${date.getUTCFullYear()}-${`${date.getUTCMonth() + 1}`.padStart(
    2,
    '0',
  )}-${`${date.getUTCDate()}`.padStart(2, '0')}`;
}

export function daysBetweenKeys(from: string, to: string): number {
  return Math.round((keyToUtcMs(to) - keyToUtcMs(from)) / 86400000);
}

// Day of the challenge today: 1 on the start date, up to `totalDays`.
export function getChallengeDay(
  challenge: HabitChallenge | null,
  today: Date = new Date(),
  totalDays = CORE33_TOTAL_DAYS,
  timeZone?: string,
): number {
  if (!challenge) {
    return 0;
  }

  const day =
    daysBetweenKeys(challenge.startDate, dateKeyInZone(today, timeZone)) + 1;
  return Math.min(Math.max(day, 1), totalDays);
}

export function isChallengeDayCompleted(
  habitLogs: HabitLogMap,
  date: string,
): boolean {
  const logs = habitLogs[date];

  if (!logs) {
    return false;
  }

  return logs.length > 0 && logs.every(Boolean);
}

export function getCompletedChallengeDays(habitLogs: HabitLogMap): number {
  return Object.keys(habitLogs).filter(date =>
    isChallengeDayCompleted(habitLogs, date),
  ).length;
}

// Consecutive closed days ending today (or yesterday while today is open).
export function getCurrentChallengeStreak(
  challenge: HabitChallenge | null,
  habitLogs: HabitLogMap,
  today: Date = new Date(),
  lookbackDays = CORE33_TOTAL_DAYS,
  timeZone?: string,
): number {
  if (!challenge) {
    return 0;
  }

  const todayKey = dateKeyInZone(today, timeZone);
  let streak = 0;

  for (let index = 0; index < lookbackDays; index += 1) {
    if (isChallengeDayCompleted(habitLogs, addDaysToKey(todayKey, -index))) {
      streak += 1;
    } else if (index > 0) {
      break;
    }
  }

  return streak;
}

// Longest run of closed days in the 33 days from the start.
export function getLongestChallengeStreak(
  challenge: HabitChallenge | null,
  habitLogs: HabitLogMap,
  totalDays = CORE33_TOTAL_DAYS,
): number {
  if (!challenge) {
    return 0;
  }

  let longest = 0;
  let current = 0;

  for (let index = 0; index < totalDays; index += 1) {
    if (
      isChallengeDayCompleted(habitLogs, addDaysToKey(challenge.startDate, index))
    ) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }

  return longest;
}

// Days that went by (before today, from the start) without closing. Missing
// a day does not end the challenge: it only breaks the streak and the
// challenge needs 33 closed days in total.
export function getMissedChallengeDays(
  challenge: HabitChallenge | null,
  habitLogs: HabitLogMap,
  today: Date = new Date(),
  timeZone?: string,
): number {
  if (!challenge) {
    return 0;
  }

  const todayKey = dateKeyInZone(today, timeZone);
  const elapsed = Math.max(0, daysBetweenKeys(challenge.startDate, todayKey));
  let missed = 0;

  for (let index = 0; index < elapsed; index += 1) {
    if (
      !isChallengeDayCompleted(habitLogs, addDaysToKey(challenge.startDate, index))
    ) {
      missed += 1;
    }
  }

  return missed;
}
