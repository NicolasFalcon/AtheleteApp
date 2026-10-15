import { inQuietHours } from '@app/features/push/pushPrefsModel';
import type { EllieLanguage } from '@app/features/ellie/ellieCopy';
import type { QuietHours } from '@app/services/push/pushService';

// Local reminders (PUSH_SHAPES: workouts and hydration never go through the
// backend). Pure planner: from what the app knows now it says which
// notifications to leave scheduled; the scheduler below applies the plan.

export const REMINDER_PREFIX = 'reminder-';

export type PlannedReminder = {
  id: string;
  fireAt: Date;
  title: string;
  body: string;
};

export type ReminderInput = {
  now: Date;
  language: EllieLanguage;
  workouts: boolean;
  hydration: boolean;
  quiet: QuietHours;
  trainingDaysPerWeek: number | null;
  trainedToday: boolean;
  waterMl: number;
  waterGoalMl: number | null;
};

// ISO weekdays (1 = Monday … 7 = Sunday) that count as training days for a
// weekly frequency. The profile only stores HOW MANY days a week, not which:
// this is the usual spread (rest days between sessions).
// TODO(design): once the plan has real training days and the hour the person
// usually trains, use those instead of this pattern and WORKOUT_HOUR.
const TRAINING_DAYS: Record<number, number[]> = {
  1: [3],
  2: [2, 5],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 5],
  6: [1, 2, 3, 4, 5, 6],
  7: [1, 2, 3, 4, 5, 6, 7],
};

export const WORKOUT_HOUR = 18;
// A hydration reminder fires only if, at that hour, the person is behind the
// share of the goal expected by then.
export const HYDRATION_CHECKS = [
  { hour: 15, expected: 0.5 },
  { hour: 19, expected: 0.8 },
] as const;
const WORKOUT_DAYS_AHEAD = 3;

const isoWeekday = (date: Date): number => ((date.getDay() + 6) % 7) + 1;

const at = (day: Date, hour: number): Date =>
  new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0, 0, 0);

const dayKey = (date: Date): string =>
  `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

// A reminder that would land inside the quiet hours waits for them to end
// (only if that is still the same day; otherwise it is dropped).
function outsideQuiet(date: Date, quiet: QuietHours): Date | null {
  if (!inQuietHours(quiet, date.getHours())) {
    return date;
  }
  const moved = at(date, quiet.end);
  if (moved <= date) {
    moved.setDate(moved.getDate() + 1);
  }
  return dayKey(moved) === dayKey(date) ? moved : null;
}

const COPY = {
  es: {
    hydrationTitle: 'Hidratación',
    hydrationBody: 'Vas un poco por detrás con el agua de hoy. Un vaso ahora te pone al día.',
    workoutTitle: 'Hoy toca entrenar',
    workoutBody: 'Tu sesión de hoy te espera. Aunque sea corta, cuenta.',
  },
  en: {
    hydrationTitle: 'Hydration',
    hydrationBody: "You're a bit behind on today's water. A glass now catches you up.",
    workoutTitle: 'Training day',
    workoutBody: "Today's session is waiting. Even a short one counts.",
  },
} as const;

export function planReminders(input: ReminderInput): PlannedReminder[] {
  const copy = COPY[input.language];
  const planned: PlannedReminder[] = [];

  if (input.hydration && input.waterGoalMl && input.waterGoalMl > 0) {
    const goal = input.waterGoalMl;
    HYDRATION_CHECKS.forEach(check => {
      const fireAt = at(input.now, check.hour);
      // Not in the past, not already on track, and never inside quiet hours.
      if (
        fireAt > input.now &&
        input.waterMl < goal * check.expected &&
        !inQuietHours(input.quiet, check.hour)
      ) {
        planned.push({
          id: `${REMINDER_PREFIX}hydration-${check.hour}`,
          fireAt,
          title: copy.hydrationTitle,
          body: copy.hydrationBody,
        });
      }
    });
  }

  const perWeek = input.trainingDaysPerWeek ? Math.min(7, Math.max(1, input.trainingDaysPerWeek)) : null;
  if (input.workouts && perWeek) {
    const days = TRAINING_DAYS[perWeek];
    for (let offset = 0; offset < WORKOUT_DAYS_AHEAD; offset += 1) {
      const day = new Date(input.now.getFullYear(), input.now.getMonth(), input.now.getDate() + offset);
      if (!days.includes(isoWeekday(day)) || (offset === 0 && input.trainedToday)) {
        continue;
      }
      const fireAt = outsideQuiet(at(day, WORKOUT_HOUR), input.quiet);
      if (fireAt && fireAt > input.now) {
        planned.push({
          id: `${REMINDER_PREFIX}workout-${dayKey(day)}`,
          fireAt,
          title: copy.workoutTitle,
          body: copy.workoutBody,
        });
      }
    }
  }
  return planned;
}

export type ReminderScheduler = {
  scheduled: () => Promise<string[]>;
  cancel: (id: string) => Promise<void>;
  schedule: (reminder: PlannedReminder) => Promise<void>;
};

// Leaves exactly `planned` scheduled: the app's old reminders are cancelled
// first (only ours: by prefix), then the new ones are scheduled.
export async function applyReminders(
  scheduler: ReminderScheduler,
  planned: readonly PlannedReminder[],
): Promise<void> {
  const existing = (await scheduler.scheduled()).filter(id => id.startsWith(REMINDER_PREFIX));
  await Promise.all(existing.map(id => scheduler.cancel(id)));
  for (const reminder of planned) {
    await scheduler.schedule(reminder);
  }
}
