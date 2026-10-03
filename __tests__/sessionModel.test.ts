import {
  activeSeconds,
  addRestTime,
  buildPlan,
  completedExerciseIds,
  currentCursor,
  formatCountdown,
  freezeRest,
  parseNumberInput,
  pauseClock,
  restAfter,
  restElapsedSec,
  restPhase,
  restRemainingMs,
  selectPendingSession,
  resumeClock,
  startRest,
  suggestedSet,
  thawRest,
  withSet,
  type LoggedSet,
} from '../src/features/session/sessionModel';

const plan = buildPlan([
  { id: 't1', exerciseId: 'e1', name: 'Goblet', sets: 2, reps: 12, restTime: 45 },
  { id: 't2', exerciseId: 'e2', name: 'Plancha', duration: 40, restTime: 0 },
]);

const log = (position: number, setIndex: number, extra = {}): LoggedSet => ({
  position,
  setIndex,
  reps: 12,
  weightKg: 16,
  durationSec: null,
  distanceM: null,
  ...extra,
});

describe('session plan and sets', () => {
  it('fills defaults from the template', () => {
    expect(plan[0]).toMatchObject({ sets: 2, reps: 12, restSec: 45 });
    // No sets → 3; time based → no reps; no rest → 60 s.
    expect(plan[1]).toMatchObject({
      sets: 3,
      reps: null,
      durationSec: 40,
      restSec: 60,
    });
  });

  it('walks the cursor set by set and exercise by exercise', () => {
    expect(currentCursor(plan, [])).toEqual({ position: 0, setIndex: 0 });
    const one = [log(0, 0)];
    expect(currentCursor(plan, one)).toEqual({ position: 0, setIndex: 1 });
    expect(restAfter(plan, one, { position: 0, setIndex: 0 })).toEqual({
      kind: 'set',
      restSec: 45,
    });
    const two = withSet(one, log(0, 1));
    expect(currentCursor(plan, two)).toEqual({ position: 1, setIndex: 0 });
    expect(restAfter(plan, two, { position: 0, setIndex: 1 })).toEqual({
      kind: 'exercise',
      restSec: 45,
    });
    expect(completedExerciseIds(plan, two)).toEqual(['t1']);
    const all = [...two, log(1, 0), log(1, 1), log(1, 2)];
    expect(currentCursor(plan, all)).toBeNull();
    expect(restAfter(plan, all, { position: 1, setIndex: 2 })).toBeNull();
  });

  it('replaces a set with the same index and suggests the last values', () => {
    const edited = withSet([log(0, 0)], log(0, 0, { reps: 10, weightKg: 18 }));
    expect(edited).toHaveLength(1);
    expect(suggestedSet(plan[0], edited)).toEqual({ reps: 10, weightKg: 18 });
    expect(suggestedSet(plan[0], [], 14)).toEqual({ reps: 12, weightKg: 14 });
  });

  it('parses reps and kg inputs', () => {
    expect(parseNumberInput('16,5')).toBe(16.5);
    expect(parseNumberInput('')).toBeNull();
    expect(parseNumberInput('-2')).toBeNull();
  });
});

describe('session clock', () => {
  it('does not count paused time', () => {
    let clock = { startedAt: 0, pausedTotalSec: 0, pausedAt: null as number | null };
    expect(activeSeconds(clock, 60_000)).toBe(60);
    clock = pauseClock(clock, 60_000);
    expect(activeSeconds(clock, 90_000)).toBe(60); // frozen while paused
    clock = resumeClock(clock, 90_000);
    expect(clock.pausedTotalSec).toBe(30);
    expect(activeSeconds(clock, 100_000)).toBe(70);
  });
});

describe('rest timer', () => {
  it('counts down, adds 30 s and freezes during a pause', () => {
    let rest = startRest('set', 45, 0);
    expect(restRemainingMs(rest, 15_000)).toBe(30_000);
    expect(formatCountdown(restRemainingMs(rest, 15_000))).toBe('00:30');
    rest = addRestTime(rest, 15_000);
    expect(rest.totalSec).toBe(75);
    expect(restRemainingMs(rest, 15_000)).toBe(60_000);
    rest = freezeRest(rest, 20_000);
    expect(restRemainingMs(rest, 80_000)).toBe(55_000);
    rest = thawRest(rest, 80_000);
    expect(restRemainingMs(rest, 81_000)).toBe(54_000);
  });

  it('switches to the warning and to "Tu turno"', () => {
    expect(restPhase(10_000)).toBe('counting');
    expect(restPhase(3_000)).toBe('warning');
    expect(restPhase(0)).toBe('go');
  });
});

describe('pending session (one rule for Inicio and the detail)', () => {
  const row = (id: string, patch = {}) => ({
    id,
    workoutId: 'w1',
    workoutTitle: 'Rutina',
    userId: 'u',
    date: '2026-10-03',
    completed: false,
    duration: 0,
    caloriesBurned: 0,
    status: 'in_progress' as const,
    startedAt: null,
    endedAt: null,
    completedExercises: [],
    totalExercises: 6,
    createdAt: '2026-10-03T10:00:00Z',
    ...patch,
  });
  const today = '2026-10-03';

  it('prefers today in progress, then the latest saved of any day', () => {
    const saved = row('s', { status: 'saved', date: '2026-09-30', createdAt: '2026-09-30T10:00:00Z' });
    const running = row('r');
    expect(selectPendingSession([saved, running], today)?.id).toBe('r');
    expect(selectPendingSession([saved], today)?.id).toBe('s');
    expect(selectPendingSession([], today)).toBeNull();
    // An in-progress row from another day is not pending today.
    expect(selectPendingSession([row('old', { date: '2026-10-01' })], today)).toBeNull();
  });

  it('gives the detail the same answer, restricted to its routine', () => {
    const a = row('a', { workoutId: 'w1' });
    const b = row('b', { workoutId: 'w2', status: 'saved', createdAt: '2026-10-02T10:00:00Z' });
    expect(selectPendingSession([a, b], today)?.id).toBe('a');
    expect(selectPendingSession([a, b], today, 'w1')?.id).toBe('a');
    expect(selectPendingSession([a, b], today, 'w2')?.id).toBe('b');
    expect(selectPendingSession([a, b], today, 'w3')).toBeNull();
  });
});

describe('real rest taken (rest_actual_sec)', () => {
  it('excludes a pause in the middle of the rest', () => {
    // 60 s rest; paused at 20 s for 100 s; skipped 10 s after resuming.
    let rest = startRest('set', 60, 0);
    rest = freezeRest(rest, 20_000);
    expect(restElapsedSec(rest, 90_000)).toBe(20); // still frozen
    rest = thawRest(rest, 120_000);
    expect(restElapsedSec(rest, 130_000)).toBe(30); // 20 + 10, not 130
  });

  it('counts "+30 s" and the full duration when the rest runs out', () => {
    // 45 s planned, +30 s at 10 s: it ends at 75 s.
    let rest = startRest('exercise', 45, 0);
    rest = addRestTime(rest, 10_000);
    expect(restElapsedSec(rest, 40_000)).toBe(40);
    expect(restElapsedSec(rest, 75_000)).toBe(75);
    expect(restElapsedSec(rest, 90_000)).toBe(75); // never above the total
  });

  it('combines +30 s and a pause', () => {
    let rest = startRest('set', 60, 0);
    rest = addRestTime(rest, 5_000); // total 90, ends at 90 s
    rest = freezeRest(rest, 30_000); // 30 s elapsed, 60 s left
    rest = thawRest(rest, 200_000); // paused 170 s
    expect(restElapsedSec(rest, 230_000)).toBe(60); // skipped 30 s later
  });
});
