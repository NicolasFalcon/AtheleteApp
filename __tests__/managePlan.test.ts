import {
  canSaveDays,
  detailFromState,
  durationOptions,
  endSummary,
  goalDurationChanged,
  initialDuration,
  isPlanPaywalled,
  manageActions,
  manageErrorKey,
  pauseOptions,
  pauseWeeksUsed,
  requestKey,
  toggleDay,
} from '../src/features/trainingPlan/managePlanModel';
import {
  NO_TRAINING_PLAN,
  parseTrainingPlanDetail,
  parseTrainingPlanState,
  type TrainingPlanState,
} from '../src/services/supabase/trainingPlan';

const plan = (patch: Partial<TrainingPlanState> = {}): TrainingPlanState => ({
  ...NO_TRAINING_PLAN,
  state: 'active',
  planId: 'p1',
  name: 'Plan',
  weekIndex: 3,
  weeks: 8,
  endDate: '2026-12-20',
  ...patch,
});

describe('manageActions', () => {
  it('offers pause, days, goal and end on an active plan', () => {
    expect(manageActions(plan())).toEqual({ pause: true, resume: false, days: true, goal: true, end: true });
  });
  it('swaps pause for resume when paused', () => {
    expect(manageActions(plan({ state: 'paused' }))).toEqual({
      pause: false,
      resume: true,
      days: true,
      goal: true,
      end: true,
    });
  });
  it('only offers ending a read_only plan', () => {
    expect(manageActions(plan({ readOnly: true }))).toEqual({
      pause: false,
      resume: false,
      days: false,
      goal: false,
      end: true,
    });
  });
  it('offers nothing without a live plan', () => {
    expect(Object.values(manageActions(plan({ state: 'completed' }))).some(Boolean)).toBe(false);
    expect(Object.values(manageActions(null)).some(Boolean)).toBe(false);
  });
});

describe('pause', () => {
  it('moves the end date by the weeks of the pause', () => {
    expect(pauseOptions(0, '2026-12-20')).toEqual([
      { weeks: 1, enabled: true, newEnd: '2026-12-27' },
      { weeks: 2, enabled: true, newEnd: '2027-01-03' },
    ]);
  });
  it('disables what goes over 2 weeks in total', () => {
    expect(pauseOptions(1, '2026-12-20').map(option => option.enabled)).toEqual([true, false]);
    expect(pauseOptions(2, '2026-12-20').map(option => option.enabled)).toEqual([false, false]);
  });
  it('keeps the options without an end date', () => {
    expect(pauseOptions(0, null).map(option => option.newEnd)).toEqual([null, null]);
  });
  it('reads the weeks used from the plan of get_training_plan, 0 until it is read', () => {
    const detail = parseTrainingPlanDetail({ plan: { pause_weeks_used: 1 } });
    expect(pauseWeeksUsed(detail)).toBe(1);
    expect(pauseWeeksUsed(parseTrainingPlanDetail({ plan: { pause_weeks_used: 5 } }))).toBe(2);
    expect(pauseWeeksUsed(parseTrainingPlanDetail({ plan: {} }))).toBe(0);
    expect(pauseWeeksUsed(null)).toBe(0);
  });
});

describe('days', () => {
  it('toggles a chip and keeps them sorted', () => {
    expect(toggleDay([1, 3], 2)).toEqual([1, 2, 3]);
    expect(toggleDay([1, 2, 3], 2)).toEqual([1, 3]);
  });
  it('ignores a seventh day', () => {
    expect(toggleDay([1, 2, 3, 4, 5, 6], 7)).toEqual([1, 2, 3, 4, 5, 6]);
  });
  it('saves only 2 to 6 days that differ from the current ones', () => {
    expect(canSaveDays([1], [1, 3])).toBe(false);
    expect(canSaveDays([1, 2, 3, 4, 5, 6, 7], [1, 3])).toBe(false);
    expect(canSaveDays([3, 1], [1, 3])).toBe(false);
    expect(canSaveDays([1, 4], [1, 3])).toBe(true);
  });
});

describe('goal and duration', () => {
  it('hides durations shorter than the week the athlete is in', () => {
    expect(durationOptions(null)).toEqual([4, 8, 12]);
    expect(durationOptions(4)).toEqual([4, 8, 12]);
    expect(durationOptions(5)).toEqual([8, 12]);
    expect(durationOptions(9)).toEqual([12]);
  });
  it('starts from the plan duration when still offered', () => {
    expect(initialDuration(8, [8, 12])).toBe(8);
    expect(initialDuration(4, [8, 12])).toBe(8);
    expect(initialDuration(4, [])).toBeNull();
  });
  it('detects a change', () => {
    expect(goalDurationChanged({ goal: 'gain_muscle', weeks: 8 }, { goal: 'gain_muscle', weeks: 8 })).toBe(false);
    expect(goalDurationChanged({ goal: 'gain_muscle', weeks: 8 }, { goal: 'gain_muscle', weeks: 12 })).toBe(true);
    expect(goalDurationChanged({ goal: null, weeks: 8 }, { goal: 'gain_strength', weeks: 8 })).toBe(true);
  });
});

describe('end summary', () => {
  it('counts the weeks done (not the one in course) and the sessions', () => {
    const detail = parseTrainingPlanDetail({ sessions_done: 9, sessions_total: 24, plan: { weeks: 8 } });
    expect(endSummary(plan({ weekIndex: 4 }), detail)).toEqual({
      weeksDone: 3,
      weeks: 8,
      sessionsDone: 9,
      sessionsTotal: 24,
    });
  });
});

describe('errors', () => {
  it('has a message of its own for each code and a generic one', () => {
    expect(manageErrorKey('pause_limit')).toBe('manage.err.pauseLimit');
    expect(manageErrorKey('invalid_days')).toBe('manage.err.invalidDays');
    expect(manageErrorKey('invalid_duration')).toBe('manage.err.invalidDuration');
    expect(manageErrorKey('plan_not_active')).toBe('manage.err.notActive');
    expect(manageErrorKey('offline')).toBe('manage.err.generic');
    expect(manageErrorKey('unknown')).toBe('manage.err.generic');
  });
});

describe('client id per request', () => {
  it('is the same key for the same request, whatever the order of the days', () => {
    expect(requestKey({ kind: 'days', days: [3, 1] })).toBe(requestKey({ kind: 'days', days: [1, 3] }));
    expect(requestKey({ kind: 'pause', weeks: 1 })).not.toBe(requestKey({ kind: 'pause', weeks: 2 }));
    expect(requestKey({ kind: 'goal', goal: 'gain_muscle', weeks: 8 })).not.toBe(
      requestKey({ kind: 'goal', goal: 'gain_muscle', weeks: 12 }),
    );
  });
});

describe('paywall', () => {
  it('is off with the flag off and multi_week true (today)', () => {
    expect(isPlanPaywalled(plan())).toBe(false);
    expect(isPlanPaywalled(null)).toBe(false);
  });
  it('locks when the state has no multi-week entitlement', () => {
    expect(isPlanPaywalled(plan({ multiWeek: false }))).toBe(true);
  });
});

describe('state parsing', () => {
  it('reads read_only and multi_week false', () => {
    const state = parseTrainingPlanState({
      state: 'active',
      read_only: true,
      entitlement: { multi_week: false },
    });
    expect(state.readOnly).toBe(true);
    expect(state.multiWeek).toBe(false);
  });
  it('builds a stand-in detail from the state', () => {
    const detail = detailFromState(plan());
    expect(detail.weeks).toBe(8);
    expect(detail.blocks).toEqual([]);
  });
});
