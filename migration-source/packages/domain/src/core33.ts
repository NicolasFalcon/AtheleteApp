import { HabitChallenge } from './types';

export type HabitLogMap = Record<string, boolean[]>;

export function getChallengeDay(
  challenge: HabitChallenge | null,
  today: Date = new Date(),
  totalDays = 33,
): number {
  if (!challenge) return 0;
  const start = new Date(challenge.startDate);
  const diffTime = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return Math.min(Math.max(diffDays, 1), totalDays);
}

export function isChallengeDayCompleted(habitLogs: HabitLogMap, date: string): boolean {
  const logs = habitLogs[date];
  if (!logs) return false;
  return logs.every(Boolean);
}

export function getCompletedChallengeDays(habitLogs: HabitLogMap): number {
  return Object.values(habitLogs).filter((logs) => logs.every(Boolean)).length;
}

export function getCurrentChallengeStreak(
  challenge: HabitChallenge | null,
  habitLogs: HabitLogMap,
  today: Date = new Date(),
  totalDays = 33,
): number {
  if (!challenge) return 0;

  let streak = 0;
  for (let i = 0; i < totalDays; i += 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    if (isChallengeDayCompleted(habitLogs, dateStr)) {
      streak += 1;
    } else if (i > 0) {
      break;
    }
  }

  return streak;
}

export function getLongestChallengeStreak(
  challenge: HabitChallenge | null,
  habitLogs: HabitLogMap,
  totalDays = 33,
): number {
  if (!challenge) return 0;

  let longest = 0;
  let current = 0;
  const start = new Date(challenge.startDate);
  for (let i = 0; i < totalDays; i += 1) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    if (isChallengeDayCompleted(habitLogs, dateStr)) {
      current += 1;
      if (current > longest) longest = current;
    } else {
      current = 0;
    }
  }

  return longest;
}
