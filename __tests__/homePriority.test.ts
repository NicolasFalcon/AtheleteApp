import {
  allDoneLine,
  bestMarkParts,
  homeSectionOrder,
  buildDayRings,
  homeDateLine,
  formatThousands,
  hasCompletedEver,
  prCurve,
  quizMastery,
  resolveHomeMode,
  resolveHomeSlides,
  slidesKey,
  sessionActiveSeconds,
  toGlasses,
  trainedMinutesToday,
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
  it('puts a pending session (saved or in progress) before every mode', () => {
    // New user who left the first session halfway.
    expect(
      mode({
        hasCompletedEver: false,
        hasResumableSession: true,
        challenge: openCore,
      }),
    ).toBe('resume');
    // Already trained today and another session is pending.
    expect(
      mode({
        hasResumableSession: true,
        workoutDoneToday: true,
        challenge: closedCore,
      }),
    ).toBe('resume');
  });

  it('shows the new-user hero when nothing is pending', () => {
    expect(mode({ hasCompletedEver: false, challenge: openCore })).toBe('new');
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
  workout: { minutesToday: 0, completedToday: false, targetMinutes: 35 },
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

  it('fills the workout ring with the minutes trained today', () => {
    const base = { ...ringsInput, mode: 'allDone' as const };
    expect(
      buildDayRings({
        ...base,
        workout: { minutesToday: 42, completedToday: true, targetMinutes: 35 },
      }).rings[0],
    ).toMatchObject({ value: '42', progress: 1, done: true });
    expect(
      buildDayRings({
        ...base,
        mode: 'core33',
        workout: { minutesToday: 14, completedToday: false, targetMinutes: 35 },
      }).rings[0],
    ).toMatchObject({ value: '14', progress: 0.4, done: false });
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
      source: 'manual',
      workoutSessionId: null,
      sessionSetId: null,
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
    expect(homeDateLine(now, Number.NaN)).toBe('Jueves 24 sep');
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
      source: 'manual',
      workoutSessionId: null,
      sessionSetId: null,
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

describe('trainedMinutesToday', () => {
  const t0 = Date.parse('2026-10-03T10:00:00Z');
  const at = (sec: number) => new Date(t0 + sec * 1000).toISOString();
  const base = {
    id: 'a',
    status: 'in_progress',
    startedAt: at(0),
    endedAt: null,
    pausedAt: null,
    pausedTotalSec: 60,
    duration: 0,
  };

  it('counts a running session only up to its last recorded activity', () => {
    // Last activity wrote 3 active minutes; it does not grow with the clock,
    // so closing the app or locking the phone adds nothing.
    const running = { ...base, duration: 3 };
    expect(sessionActiveSeconds(running)).toBe(180);
    expect(trainedMinutesToday([running])).toBe(3);
    // No activity recorded yet (just started): nothing to count.
    expect(sessionActiveSeconds(base)).toBe(0);
  });

  it('counts paused, saved and completed sessions from their timestamps', () => {
    // Paused: up to the pause, minus earlier pauses.
    expect(sessionActiveSeconds({ ...base, pausedAt: at(273) })).toBe(213);
    // Saved: frozen at paused_at.
    expect(
      sessionActiveSeconds({ ...base, status: 'saved', pausedAt: at(600) }),
    ).toBe(540);
    // Completed: ended − started − pauses.
    expect(
      sessionActiveSeconds({ ...base, status: 'completed', endedAt: at(1860) }),
    ).toBe(1800);
    // Discarded sessions do not count; legacy rows use the stored minutes.
    expect(sessionActiveSeconds({ ...base, status: 'canceled' })).toBe(0);
    expect(
      sessionActiveSeconds({
        ...base,
        status: 'completed',
        startedAt: null,
        duration: 12,
      }),
    ).toBe(720);
  });

  it('sums today sessions once each (a resumed session is the same row)', () => {
    const completed = {
      ...base,
      id: 'c',
      status: 'completed',
      endedAt: at(1260),
      pausedTotalSec: 60,
    };
    const resumed = { ...base, id: 'r', duration: 5 };
    expect(trainedMinutesToday([completed, resumed, resumed])).toBe(25);
    expect(trainedMinutesToday([])).toBe(0);
  });
});

describe('hasCompletedEver', () => {
  it('looks at the whole history, not at today, a routine or logged sets', () => {
    // Any history counts: a user with completed sessions (even old ones and
    // without rows in workout_session_sets) and nothing today is not new.
    expect(hasCompletedEver(29, false)).toBe(true);
    expect(hasCompletedEver(1, false)).toBe(true);
    // Only a session completed today (count not refreshed yet) also counts.
    expect(hasCompletedEver(0, true)).toBe(true);
    // Really nothing completed.
    expect(hasCompletedEver(0, false)).toBe(false);
    expect(hasCompletedEver(null, false)).toBe(false);
  });
});

describe('homeSectionOrder', () => {
  it('follows v2.12: Tu día → Tu ruta → ELLIE → Para entrenar → Quiz → Wear', () => {
    expect(homeSectionOrder({ core33Invite: false, challenge: false })).toEqual([
      'rings',
      'route',
      'ellie',
      'routines',
      'quiz',
      'wear',
    ]);
  });

  it('puts the Core 33 invitation after the route and the challenge after ELLIE', () => {
    expect(homeSectionOrder({ core33Invite: true, challenge: true })).toEqual([
      'rings',
      'route',
      'core33Invite',
      'ellie',
      'challenge',
      'routines',
      'quiz',
      'wear',
    ]);
  });

  it('never has a best-mark section', () => {
    expect(homeSectionOrder({ core33Invite: true, challenge: true })).not.toContain(
      'bestMark' as never,
    );
  });
});

describe('resolveHomeSlides · carrusel de estados', () => {
  const kinds = (patch: Partial<HomeModeInput & { core33FirstPriority: boolean }>) =>
    resolveHomeSlides({
      hasCompletedEver: true,
      workoutDoneToday: false,
      hasResumableSession: false,
      challenge: null,
      ...patch,
    }).map(slide => slide.kind);

  it('a new user gets a single "Primera sesión"', () => {
    expect(kinds({ hasCompletedEver: false })).toEqual(['new']);
    // Even with an open Core 33: one slide.
    expect(kinds({ hasCompletedEver: false, challenge: openCore })).toEqual(['new']);
  });

  it('a half-done session goes first, even for a new user', () => {
    expect(kinds({ hasResumableSession: true })).toEqual(['resume']);
    expect(kinds({ hasResumableSession: true, hasCompletedEver: false })).toEqual(['resume']);
    expect(kinds({ hasResumableSession: true, challenge: openCore })).toEqual([
      'resume',
      'core33',
    ]);
  });

  it('a pending workout alone is one slide; with an open Core 33 it comes first', () => {
    expect(kinds({})).toEqual(['workout']);
    expect(kinds({ challenge: openCore })).toEqual(['workout', 'core33']);
  });

  it('a closed Core 33 goes to the end, marked as closed', () => {
    const slides = resolveHomeSlides({
      hasCompletedEver: true,
      workoutDoneToday: false,
      hasResumableSession: false,
      challenge: closedCore,
    });
    expect(slides.map(slide => slide.kind)).toEqual(['workout', 'core33Closed']);
    expect(slides.map(slide => slide.closed)).toEqual([false, true]);
  });

  it('the pinned Core 33 goes first, but not before a saved session', () => {
    expect(kinds({ challenge: openCore, core33FirstPriority: true })).toEqual([
      'core33',
      'workout',
    ]);
    expect(
      kinds({ challenge: openCore, core33FirstPriority: true, hasResumableSession: true }),
    ).toEqual(['resume', 'core33']);
  });

  it('a finished workout moves to the closed group', () => {
    expect(kinds({ workoutDoneToday: true, challenge: openCore })).toEqual([
      'core33',
      'workoutDone',
    ]);
    // A session saved after finishing one: pending first, closed last.
    expect(
      kinds({ workoutDoneToday: true, hasResumableSession: true, challenge: openCore }),
    ).toEqual(['resume', 'core33', 'workoutDone']);
  });

  it('nothing pending is a single "Día completo"', () => {
    expect(kinds({ workoutDoneToday: true })).toEqual(['allDone']);
    expect(kinds({ workoutDoneToday: true, challenge: closedCore })).toEqual(['allDone']);
  });

  it('completing something changes the set and the first slide is the next action', () => {
    const before = resolveHomeSlides({
      hasCompletedEver: true,
      workoutDoneToday: false,
      hasResumableSession: false,
      challenge: openCore,
    });
    const after = resolveHomeSlides({
      hasCompletedEver: true,
      workoutDoneToday: true,
      hasResumableSession: false,
      challenge: openCore,
    });
    expect(slidesKey(before)).not.toBe(slidesKey(after));
    expect(before[0].kind).toBe('workout');
    expect(after[0].kind).toBe('core33');
    expect(after[after.length - 1]).toMatchObject({ kind: 'workoutDone', closed: true });
  });

  it('names the capsules', () => {
    expect(
      resolveHomeSlides({
        hasCompletedEver: true,
        workoutDoneToday: false,
        hasResumableSession: true,
        challenge: openCore,
      }).map(slide => slide.label),
    ).toEqual(['Retomar', 'Core 33']);
  });
});
