import { inQuietHours } from '@app/features/push/pushPrefsModel';
import type { EllieLanguage } from '@app/features/ellie/ellieCopy';
import type { QuietHours } from '@app/services/push/pushService';
import type { WeekPlan } from '@app/features/week/weekModel';

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
  // The active week plan (Tu semana): its 7 dates (YYYY-MM-DD) and its
  // session days. Inside those dates it decides the days and the minutes;
  // outside them (next week) the usual pattern applies. null: no active plan.
  weekPlan: ReminderWeekPlan | null;
  trainedToday: boolean;
  waterMl: number;
  waterGoalMl: number | null;
};

// ISO weekdays (1 = Monday … 7 = Sunday) that count as training days for a
// weekly frequency. The profile only stores HOW MANY days a week, not which:
// this is the usual spread (rest days between sessions).
// With an active week plan its session days win (see `weekPlan`).
// TODO(design): the hour the person usually trains instead of WORKOUT_HOUR.
const TRAINING_DAYS: Record<number, number[]> = {
  1: [3],
  2: [2, 5],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 5],
  6: [1, 2, 3, 4, 5, 6],
  7: [1, 2, 3, 4, 5, 6, 7],
};

export type ReminderWeekPlan = {
  dates: string[];
  sessions: Record<string, { minutes: number | null; title: string | null }>;
};

// The active week plan as the reminders read it (null: no active plan).
export function reminderWeekPlan(week: WeekPlan | null | undefined): ReminderWeekPlan | null {
  if (!week?.plan?.active) {
    return null;
  }
  const sessions: ReminderWeekPlan['sessions'] = {};
  week.days.forEach(day => {
    if (day.kind === 'session') {
      sessions[day.date] = { minutes: day.minutes, title: day.routine?.title ?? null };
    }
  });
  return { dates: week.days.map(day => day.date), sessions };
}

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

const pad = (value: number) => String(value).padStart(2, '0');
const isoDate = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

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
    planBody: (title: string | null, minutes: number | null) =>
      `${title ?? 'Tu sesión'}${minutes ? ` · ${minutes} min` : ''}. Está en tu plan de la semana.`,
  },
  en: {
    hydrationTitle: 'Hydration',
    hydrationBody: "You're a bit behind on today's water. A glass now catches you up.",
    workoutTitle: 'Training day',
    workoutBody: "Today's session is waiting. Even a short one counts.",
    planBody: (title: string | null, minutes: number | null) =>
      `${title ?? 'Your session'}${minutes ? ` · ${minutes} min` : ''}. It's in your week plan.`,
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
  const plan = input.weekPlan;
  if (input.workouts && (perWeek || plan)) {
    const days = perWeek ? TRAINING_DAYS[perWeek] : [];
    for (let offset = 0; offset < WORKOUT_DAYS_AHEAD; offset += 1) {
      const day = new Date(input.now.getFullYear(), input.now.getMonth(), input.now.getDate() + offset);
      const date = isoDate(day);
      const inPlan = Boolean(plan && plan.dates.includes(date));
      const session = inPlan ? plan?.sessions[date] ?? null : null;
      const trains = inPlan ? Boolean(session) : days.includes(isoWeekday(day));
      if (!trains || (offset === 0 && input.trainedToday)) {
        continue;
      }
      const fireAt = outsideQuiet(at(day, WORKOUT_HOUR), input.quiet);
      if (fireAt && fireAt > input.now) {
        planned.push({
          id: `${REMINDER_PREFIX}workout-${dayKey(day)}`,
          fireAt,
          title: copy.workoutTitle,
          body: session ? copy.planBody(session.title, session.minutes) : copy.workoutBody,
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
