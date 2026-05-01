import type { HabitChallenge } from '@app/shared/domain/types';

export type HabitLogMap = Record<string, boolean[]>;

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getChallengeDay(
  challenge: HabitChallenge | null,
  today: Date = new Date(),
  totalDays = 33,
): number {
  if (!challenge) {
    return 0;
  }

  const start = new Date(`${challenge.startDate}T00:00:00`);
  const diffTime = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return Math.min(Math.max(diffDays, 1), totalDays);
}

export function isChallengeDayCompleted(
  habitLogs: HabitLogMap,
  date: string,
): boolean {
  const logs = habitLogs[date];

  if (!logs) {
    return false;
  }

  return logs.every(Boolean);
}

export function getCompletedChallengeDays(habitLogs: HabitLogMap): number {
  return Object.values(habitLogs).filter(logs => logs.every(Boolean)).length;
}

export function getCurrentChallengeStreak(
  challenge: HabitChallenge | null,
  habitLogs: HabitLogMap,
  today: Date = new Date(),
  lookbackDays = 33,
): number {
  if (!challenge) {
    return 0;
  }

  let streak = 0;

  for (let index = 0; index < lookbackDays; index += 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - index);

    if (isChallengeDayCompleted(habitLogs, toDateKey(date))) {
      streak += 1;
    } else if (index > 0) {
      break;
    }
  }

  return streak;
}
