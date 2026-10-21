import { applyReminders, planReminders, type ReminderInput } from '../src/features/push/localReminders';
import { deviationAction } from '../src/features/push/routeDeviationNotice';

// Wednesday 14 Oct 2026, 10:00 local.
const base: ReminderInput = {
  now: new Date(2026, 9, 14, 10, 0),
  language: 'es',
  workouts: true,
  hydration: true,
  quiet: { enabled: true, start: 22, end: 8 },
  trainingDaysPerWeek: 3,
  weekPlan: null,
  trainedToday: false,
  waterMl: 0,
  waterGoalMl: 3500,
};

const ids = (input: Partial<ReminderInput>) => planReminders({ ...base, ...input }).map(item => item.id);

describe('local reminders', () => {
  it('hydration: only the checks still to come in which the person is behind', () => {
    expect(ids({ workouts: false })).toEqual(['reminder-hydration-15', 'reminder-hydration-19']);
    expect(ids({ workouts: false, waterMl: 2000 })).toEqual(['reminder-hydration-19']);
    expect(ids({ workouts: false, waterMl: 3200 })).toEqual([]);
    expect(ids({ workouts: false, now: new Date(2026, 9, 14, 16, 0) })).toEqual(['reminder-hydration-19']);
  });

  it('respects the switches and the missing data', () => {
    expect(ids({ hydration: false, workouts: false })).toEqual([]);
    expect(ids({ workouts: false, waterGoalMl: null })).toEqual([]);
    expect(ids({ hydration: false, trainingDaysPerWeek: null })).toEqual([]);
  });

  it('quiet hours: no hydration reminder inside them, and a workout one waits for their end', () => {
    expect(ids({ workouts: false, quiet: { enabled: true, start: 14, end: 16 } })).toEqual(['reminder-hydration-19']);
    const moved = planReminders({ ...base, hydration: false, quiet: { enabled: true, start: 17, end: 20 } });
    expect(moved[0].fireAt.getHours()).toBe(20);
  });

  it('workouts: training days of the week, none for today if already trained', () => {
    // 3 days a week → Mon, Wed, Fri; today is Wednesday.
    expect(ids({ hydration: false })).toEqual(['reminder-workout-2026-10-14', 'reminder-workout-2026-10-16']);
    expect(ids({ hydration: false, trainedToday: true })).toEqual(['reminder-workout-2026-10-16']);
  });

  it('with an active week plan, its session days and minutes win inside its week', () => {
    // Week of Mon 12 – Sun 18 Oct; today is Wednesday 14. The plan trains on
    // Thursday 15 only (not Wednesday or Friday as the pattern would).
    const weekPlan = {
      dates: ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18'],
      sessions: { '2026-10-15': { minutes: 40, title: 'Empuje' } },
    };
    const planned = planReminders({ ...base, hydration: false, weekPlan });
    expect(planned.map(item => item.id)).toEqual(['reminder-workout-2026-10-15']);
    expect(planned[0].body).toBe('Empuje · 40 min. Está en tu plan de la semana.');
    // Without a frequency in the profile the plan still reminds.
    expect(ids({ hydration: false, weekPlan, trainingDaysPerWeek: null })).toEqual(['reminder-workout-2026-10-15']);
  });

  it('outside the plan week (next Monday) the usual pattern applies', () => {
    // Saturday 17: the window reaches Monday 19, which is outside the plan.
    const weekPlan = {
      dates: ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18'],
      sessions: {},
    };
    expect(ids({ hydration: false, weekPlan, now: new Date(2026, 9, 17, 10, 0) })).toEqual([
      'reminder-workout-2026-10-19',
    ]);
  });

  it('leaves exactly the plan scheduled: old reminders of the app go, others stay', async () => {
    const cancelled: string[] = [];
    const scheduled: string[] = [];
    await applyReminders(
      {
        scheduled: async () => ['reminder-hydration-15', 'something-else'],
        cancel: async id => { cancelled.push(id); },
        schedule: async reminder => { scheduled.push(reminder.id); },
      },
      planReminders({ ...base, workouts: false, waterMl: 2000 }),
    );
    expect(cancelled).toEqual(['reminder-hydration-15']);
    expect(scheduled).toEqual(['reminder-hydration-19']);
  });
});

describe('route deviation notice', () => {
  it('warns only in the background, and clears when back on the route', () => {
    expect(deviationAction({ off: true, wasOff: false, appState: 'background' })).toBe('notify');
    expect(deviationAction({ off: true, wasOff: false, appState: 'active' })).toBeNull();
    expect(deviationAction({ off: false, wasOff: true, appState: 'background' })).toBe('clear');
    expect(deviationAction({ off: true, wasOff: true, appState: 'background' })).toBeNull();
    expect(deviationAction({ off: false, wasOff: false, appState: 'background' })).toBeNull();
  });
});
