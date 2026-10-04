import {
  buildBadgeStats,
  buildShelves,
  badgeProgress,
  hydrationStreak,
  SHELVES,
} from '../src/features/progress/badgesModel';
import {
  compareDraft,
  curvePoints,
  defaultDraft,
  deltaSinceFirst,
  draftToInsert,
  formatRecord,
  groupRecords,
  isDraftValid,
  recordDelta,
  recordSource,
} from '../src/features/progress/recordsModel';
import { ALL_BADGES, type PersonalRecord } from '../src/shared';

const today = new Date(2026, 9, 3, 12);
let seq = 0;

function pr(patch: Partial<PersonalRecord>): PersonalRecord {
  seq += 1;
  return {
    id: `r${seq}`,
    userId: 'u',
    exerciseId: 'rdl',
    prType: 'weight_reps',
    valueWeight: 100,
    valueReps: 1,
    valueDurationSec: null,
    valueDistanceM: null,
    unit: 'kg',
    notes: null,
    recordedAt: '2026-04-09T12:00:00',
    createdAt: '',
    source: 'manual',
    workoutSessionId: null,
    sessionSetId: null,
    ...patch,
  };
}

describe('records', () => {
  const history = [
    pr({ valueWeight: 170, valueReps: 3, recordedAt: '2026-01-10T12:00:00' }),
    pr({ valueWeight: 180, valueReps: 3, recordedAt: '2026-02-02T12:00:00' }),
    pr({ valueWeight: 190, valueReps: 2, recordedAt: '2026-03-12T12:00:00' }),
    pr({ valueWeight: 200, valueReps: 1, recordedAt: '2026-04-09T12:00:00', sessionSetId: 's1', source: 'session' }),
  ];
  const other = pr({
    exerciseId: 'arnold',
    prType: 'max_reps',
    valueWeight: null,
    valueReps: 12,
    recordedAt: '2026-09-23T12:00:00',
  });
  const names = (id: string) => (id === 'rdl' ? 'Peso muerto rumano' : 'Arnold press');

  it('groups by exercise, newest first, with the best mark and deltas', () => {
    const groups = groupRecords([...history, other], names, today);
    expect(groups.map(group => group.exerciseName)).toEqual([
      'Arnold press',
      'Peso muerto rumano',
    ]);
    const rdl = groups[1];
    expect(formatRecord(rdl.best)).toEqual({ value: '200', unit: 'kg × 1' });
    expect(rdl.history.map(row => row.delta.text)).toEqual([
      '+10 kg',
      '+10 kg',
      '+10 kg',
      'Primera marca',
    ]);
    expect(rdl.history[0].isLatest).toBe(true);
    expect(deltaSinceFirst(rdl)).toBe('+30 kg desde 10 ene');
    expect(rdl.isNew).toBe(false);
    expect(curvePoints(rdl).map(point => point.label)).toEqual(['170', '180', '190', '200']);
  });

  it('shows whether a mark came from a session or was manual', () => {
    expect(recordSource(history[3])).toBe('session');
    expect(recordSource(history[0])).toBe('manual');
  });

  it('flags a record registered today', () => {
    const fresh = pr({ valueWeight: 210, recordedAt: '2026-10-03T08:00:00' });
    expect(groupRecords([...history, fresh], names, today)[0].isNew).toBe(true);
  });

  it('formats every pr_type with its unit', () => {
    expect(formatRecord(pr({ prType: 'max_weight', valueWeight: 32.5, valueReps: null }))).toEqual({ value: '32,5', unit: 'kg' });
    expect(formatRecord(pr({ prType: 'max_reps', valueReps: 15, valueWeight: null }))).toEqual({ value: '15', unit: 'reps' });
    expect(formatRecord(pr({ prType: 'duration', valueDurationSec: 95, valueWeight: null }))).toEqual({ value: '1:35', unit: 'min' });
    expect(formatRecord(pr({ prType: 'duration', valueDurationSec: 45, valueWeight: null }))).toEqual({ value: '45', unit: 's' });
    expect(formatRecord(pr({ prType: 'distance', valueDistanceM: 1500, valueWeight: null }))).toEqual({ value: '1.500', unit: 'm' });
    expect(formatRecord(pr({ valueWeight: 200, valueReps: 2 }), true).unit).toBe('kg × 2 reps');
  });

  it('uses the reps as the difference at the same weight', () => {
    const a = pr({ valueWeight: 100, valueReps: 5 });
    const b = pr({ valueWeight: 100, valueReps: 3 });
    expect(recordDelta(a, b)).toEqual({ text: '+2 reps', positive: true });
    expect(recordDelta(b, a)).toEqual({ text: '−2 reps', positive: false });
    expect(recordDelta(a, a)).toEqual({ text: 'Igual', positive: false });
  });

  it('builds the manual record and compares it with the best', () => {
    const best = history[3];
    const draft = defaultDraft('weight_reps', best);
    expect(draft).toMatchObject({ weight: 205, reps: 1 });
    expect(compareDraft(draft, best)).toEqual({
      beats: true,
      text: 'Supera tu mejor marca por 5 kg',
    });
    expect(compareDraft({ ...draft, weight: 190 }, best)?.beats).toBe(false);
    expect(compareDraft({ ...draft, prType: 'max_reps' }, best)).toBeNull();
    expect(draftToInsert('rdl', draft, '  buen día  ', '2026-10-03T10:00:00Z')).toEqual({
      exerciseId: 'rdl',
      prType: 'weight_reps',
      valueWeight: 205,
      valueReps: 1,
      unit: 'kg',
      notes: 'buen día',
      recordedAt: '2026-10-03T10:00:00Z',
    });
    expect(draftToInsert('rdl', { ...draft, prType: 'duration', durationSec: 75 }, '', 'x')).toMatchObject({
      prType: 'duration',
      valueDurationSec: 75,
      unit: 's',
    });
    expect(isDraftValid({ ...draft, weight: 0 })).toBe(false);
    expect(isDraftValid({ ...draft, prType: 'max_weight', reps: 0 })).toBe(true);
  });
});

describe('badges', () => {
  it('puts the 12 badges of the app on the four shelves exactly once', () => {
    const ids = SHELVES.flatMap(shelf => shelf.ids);
    expect(ids).toHaveLength(12);
    expect(new Set(ids).size).toBe(12);
    expect(ids.slice().sort()).toEqual(ALL_BADGES.map(badge => badge.id).sort());
  });

  const stats = {
    streakDays: 3,
    workoutsThisWeek: 2,
    challengeDays: 20,
    hydrationStreak: 2,
    hydrationDaysThisWeek: 4,
  };

  it('measures the progress towards the next badge', () => {
    expect(badgeProgress('streak_7_days', stats)).toEqual({ current: 3, target: 7, ratio: 3 / 7 });
    expect(badgeProgress('core33_finisher', stats)?.current).toBe(20);
    expect(badgeProgress('week_consistency', stats)?.target).toBe(3);
    expect(badgeProgress('weekly_hydration_master', stats)?.current).toBe(4);
    // Never above the target; badges done once have no progress.
    expect(badgeProgress('streak_7_days', { ...stats, streakDays: 30 })?.ratio).toBe(1);
    expect(badgeProgress('first_workout', stats)).toBeNull();
  });

  it('builds the shelves with earned dates and "n de m" for locked ones', () => {
    const result = buildShelves(
      [
        { id: 'first_workout', earnedAt: '2026-01-12T10:00:00' },
        { id: 'first_pr', earnedAt: '2026-01-10T10:00:00' },
        { id: 'not_a_badge', earnedAt: '2026-01-10T10:00:00' },
      ],
      stats,
    );
    expect(result.total).toBe(12);
    expect(result.earnedCount).toBe(2); // unknown ids do not count
    const constancia = result.shelves[0];
    expect(constancia.earnedCount).toBe(1);
    expect(constancia.items[0]).toMatchObject({ earned: true, sub: '12 ene' });
    expect(constancia.items[2]).toMatchObject({ earned: false, sub: '3 de 7' });
    expect(result.shelves[1].items[0].sub).toBe('20 de 33');
    expect(result.shelves[2].items[0]).toMatchObject({ earned: true, sub: '10 ene' });
    expect(result.shelves[3].items[0]).toMatchObject({ earned: false, sub: '', progress: null });
  });

  it('counts the hydration streak and the week for the stats', () => {
    const logs = [
      { date: '2026-10-03', waterMl: 3500 },
      { date: '2026-10-02', waterMl: 3750 },
      { date: '2026-10-01', waterMl: 1000 },
      { date: '2026-09-30', waterMl: 3500 },
    ];
    expect(hydrationStreak(logs, 14, today)).toBe(2);
    // Today not met yet: the streak ends yesterday.
    expect(hydrationStreak(logs.slice(1), 14, today)).toBe(1);
    const built = buildBadgeStats({
      sessions: [],
      streakDays: 0,
      hydrationLogs: logs,
      goalGlasses: 14,
      challengeDays: 5,
      today,
    });
    expect(built).toMatchObject({
      hydrationStreak: 2,
      hydrationDaysThisWeek: 3, // Wed 30, Fri 2, Sat 3
      workoutsThisWeek: 0,
      challengeDays: 5,
    });
  });
});
