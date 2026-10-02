import {
  allDoneLine,
  bestMarkParts,
  buildDayRings,
  homeDateLine,
  formatThousands,
  prCurve,
  quizMastery,
  resolveHomeMode,
  toGlasses,
  type DayRingsInput,
  type HomeModeInput,
} from '../src/features/home/homePriority';
import type { PersonalRecord } from '../src/shared';

const openCore = { active: true, completedToday: 1, totalHabits: 3 };
const closedCore = { active: true, completedToday: 3, totalHabits: 3 };

function mode(patch: Partial<HomeModeInput>) {
  return resolveHomeMode({
    hasCompletedEver: true,
    workoutDoneToday: false,
    hasResumableSession: false,
    challenge: null,
    ...patch,
  });
}

describe('resolveHomeMode', () => {
  it('shows the new-user hero before anything else', () => {
    expect(
      mode({
        hasCompletedEver: false,
        hasResumableSession: true,
        challenge: openCore,
      }),
    ).toBe('new');
  });

  it('closes the day when the workout is done and Core 33 is closed or absent', () => {
    expect(mode({ workoutDoneToday: true, challenge: closedCore })).toBe(
      'allDone',
    );
    expect(mode({ workoutDoneToday: true, challenge: null })).toBe('allDone');
  });

  it('keeps "workout done" while Core 33 is still open', () => {
    expect(mode({ workoutDoneToday: true, challenge: openCore })).toBe(
      'workoutDone',
    );
  });

  it('offers to resume a saved session before the daily priority', () => {
    expect(mode({ hasResumableSession: true, challenge: openCore })).toBe(
      'resume',
    );
  });

  it('prioritises an open Core 33 day, otherwise the workout', () => {
    expect(mode({ challenge: openCore })).toBe('core33');
    expect(mode({ challenge: closedCore })).toBe('workout');
    expect(mode({ challenge: null })).toBe('workout');
    expect(
      mode({ challenge: { active: false, completedToday: 0, totalHabits: 3 } }),
    ).toBe('workout');
  });
});

const ringsInput: DayRingsInput = {
  mode: 'workout',
  challenge: openCore,
  workout: { doneMinutes: null, resumeFraction: null, targetMinutes: 35 },
  nutrition: { hasPlan: true, calories: 1425, targetCalories: 2850 },
  hydration: { todayMl: 1750, goalGlasses: 14 },
};

describe('buildDayRings', () => {
  it('uses Core 33 as first ring while training is pending', () => {
    const { rings, dayPct } = buildDayRings(ringsInput);

    expect(rings.map(ring => ring.kind)).toEqual([
      'core33',
      'nutrition',
      'hydration',
    ]);
    expect(rings[0].value).toBe('1/3');
    expect(rings[1].value).toBe('1.425');
    expect(rings[1].progress).toBeCloseTo(0.5);
    expect(rings[2].value).toBe('7');
    expect(rings[2].unit).toBe('de 14 vasos');
    expect(dayPct).toBe(Math.round(((1 / 3 + 0.5 + 0.5) / 3) * 100));
  });

  it('uses the workout ring in Core 33 mode and without a challenge', () => {
    expect(buildDayRings({ ...ringsInput, mode: 'core33' }).rings[0].kind).toBe(
      'workout',
    );
    expect(
      buildDayRings({ ...ringsInput, challenge: null }).rings[0],
    ).toMatchObject({ kind: 'workout', value: '0', unit: 'de 35 min' });
  });

  it('fills the workout ring with a saved session or a finished one', () => {
    const base = { ...ringsInput, mode: 'allDone' as const };
    expect(
      buildDayRings({
        ...base,
        workout: { doneMinutes: 42, resumeFraction: null, targetMinutes: 35 },
      }).rings[0],
    ).toMatchObject({ value: '42', progress: 1, done: true });
    expect(
      buildDayRings({
        ...base,
        mode: 'core33',
        workout: { doneMinutes: null, resumeFraction: 0.5, targetMinutes: 35 },
      }).rings[0].progress,
    ).toBe(0.5);
  });

  it('shows empty rings for a new user and no nutrition without a plan', () => {
    const fresh = buildDayRings({ ...ringsInput, mode: 'new' });
    expect(fresh.dayPct).toBe(0);
    expect(fresh.rings.every(ring => ring.progress === 0)).toBe(true);

    const noPlan = buildDayRings({
      ...ringsInput,
      nutrition: { hasPlan: false, calories: 900, targetCalories: 0 },
    });
    expect(noPlan.rings[1]).toMatchObject({
      label: 'Nutrición · sin plan',
      progress: 0,
    });
  });

  it('marks hydration as met at the goal', () => {
    expect(
      buildDayRings({
        ...ringsInput,
        hydration: { todayMl: 3500, goalGlasses: 14 },
      }).rings[2],
    ).toMatchObject({ label: 'Hidratación · cumplida', done: true });
  });
});

describe('helpers', () => {
  it('converts ml to 250 ml glasses', () => {
    expect(toGlasses(0)).toBe(0);
    expect(toGlasses(750)).toBe(3);
    expect(toGlasses(-10)).toBe(0);
  });

  it('formats thousands with a dot', () => {
    expect(formatThousands(18420)).toBe('18.420');
    expect(formatThousands(980)).toBe('980');
  });

  it('lists only what is closed in the all-done line', () => {
    expect(
      allDoneLine({ coreActive: true, coreClosed: true, waterDone: true }),
    ).toBe('Entreno, Core 33 y agua cerrados.');
    expect(
      allDoneLine({ coreActive: false, coreClosed: false, waterDone: true }),
    ).toBe('Entreno y agua cerrados.');
    expect(
      allDoneLine({ coreActive: false, coreClosed: false, waterDone: false }),
    ).toBe('Entreno cerrado.');
  });

  it('draws the record curve oldest to newest', () => {
    const record = (value: number, day: number): PersonalRecord => ({
      id: `pr-${day}`,
      userId: 'u',
      exerciseId: 'e',
      prType: 'max_weight',
      valueWeight: value,
      valueReps: 1,
      valueDurationSec: null,
      valueDistanceM: null,
      unit: 'kg',
      notes: null,
      recordedAt: `2026-09-${String(day).padStart(2, '0')}T10:00:00Z`,
      createdAt: '',
    });

    const curve = prCurve([record(100, 20), record(90, 10)], 'max_weight');
    expect(curve?.points.split(' ')).toHaveLength(2);
    expect(curve?.last[0]).toBeCloseTo(104);
    // The newest (higher) value sits above the oldest.
    const [, firstY] = curve!.points.split(' ')[0].split(',').map(Number);
    expect(curve!.last[1]).toBeLessThan(firstY);

    expect(
      prCurve([record(80, 1)], 'max_weight')?.points.split(' '),
    ).toHaveLength(2);
    expect(prCurve([], 'max_weight')).toBeNull();
  });

  it('measures progress towards Quiz Master', () => {
    expect(
      quizMastery([{ bestScore: 100 }, { bestScore: 70 }, {}]),
    ).toMatchObject({
      mastered: 1,
      total: 3,
      line: '1 de 3 categorías al 100 %',
    });
    expect(quizMastery([{ bestScore: 100 }]).line).toBe(
      'Quiz Master desbloqueado',
    );
    expect(quizMastery([]).progress).toBe(0);
  });
});

describe('formatting', () => {
  const now = new Date(2026, 8, 24, 18, 0); // Thursday 24 Sep 2026

  it('builds the hero date line with the streak', () => {
    expect(homeDateLine(now, 6)).toBe('Jueves 24 sep · Racha de 6 días');
    expect(homeDateLine(now, 1)).toBe('Jueves 24 sep · Racha de 1 día');
    expect(homeDateLine(now, 0)).toBe('Jueves 24 sep');
  });

  it('formats the best mark by record type', () => {
    const base: PersonalRecord = {
      id: 'pr',
      userId: 'u',
      exerciseId: 'e',
      prType: 'max_weight',
      valueWeight: 140,
      valueReps: 1,
      valueDurationSec: null,
      valueDistanceM: null,
      unit: 'kg',
      notes: null,
      recordedAt: new Date(2026, 3, 9, 10).toISOString(),
      createdAt: '',
    };

    expect(bestMarkParts(base, now)).toEqual({
      value: '140',
      unit: 'kg × 1 · 9 abr',
      isNew: false,
    });
    expect(
      bestMarkParts({ ...base, recordedAt: now.toISOString() }, now).isNew,
    ).toBe(true);
    expect(
      bestMarkParts({ ...base, prType: 'max_reps', valueReps: 18 }, now).value,
    ).toBe('18');
    expect(
      bestMarkParts({ ...base, prType: 'duration', valueDurationSec: 95 }, now)
        .value,
    ).toBe('1:35');
  });
});
