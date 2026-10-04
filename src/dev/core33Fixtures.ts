import { challengeOfHabits, habitsForChallenge, findChallenge } from '@app/features/core33/core33Catalog';
import { addDaysToKey, dateKeyInZone } from '@app/shared/domain/core33';

// Development only: Core 33 samples (athelete://dev/core33?screen=…).
// Nothing is read or written.
export type Core33FixtureKind = 'day1' | 'day17' | 'missed' | 'day33' | 'completed';

const FULL = [true, true, true];

export function core33Fixture(kind: Core33FixtureKind, now = new Date()) {
  const today = dateKeyInZone(now);
  const habits = habitsForChallenge(findChallenge('fuerza')!);
  const logs: Record<string, boolean[]> = {};
  const close = (from: number, to: number, skip: number[] = []) => {
    for (let offset = from; offset <= to; offset += 1) {
      if (!skip.includes(offset)) {
        logs[addDaysToKey(today, -offset)] = FULL;
      }
    }
  };
  let status: 'active' | 'completed' = 'active';
  let startOffset = 0;

  switch (kind) {
    case 'day1':
      startOffset = 0;
      break;
    case 'day17':
      // Day 17: 16 days closed and today with one habit.
      startOffset = 16;
      close(1, 16);
      logs[today] = [true, false, false];
      break;
    case 'missed':
      // Day 10 with two days missed (3 and 4 days ago).
      startOffset = 9;
      close(1, 9, [3, 4]);
      logs[today] = [true, true, false];
      break;
    case 'day33':
      startOffset = 32;
      close(1, 32);
      logs[today] = [true, false, false];
      break;
    case 'completed':
      status = 'completed';
      startOffset = 32;
      close(0, 32);
      break;
  }

  return {
    challenge: {
      status,
      startDate: addDaysToKey(today, -startOffset),
      habits,
    },
    habitLogs: logs,
    catalog: challengeOfHabits(habits),
  };
}
