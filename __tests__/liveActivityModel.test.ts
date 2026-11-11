import {
  ACTION_TTL_MS,
  actionDecision,
  exerciseLine,
  liveActivityKey,
  liveActivityRestEndState,
  liveActivityState,
  restEndNotification,
  setLine,
  setReadiness,
  type ActionTarget,
  type LiveActivityInput,
} from '../src/features/session/liveActivityModel';
import type { LoggedSet, PlannedExercise } from '../src/features/session/sessionModel';

const exercise = (patch: Partial<PlannedExercise> = {}): PlannedExercise => ({
  position: 0,
  templateExerciseId: null,
  exerciseId: 'e1',
  name: 'Press de banca',
  sets: 3,
  unit: 'reps',
  perSide: false,
  amount: 10,
  amountMax: 10,
  restSec: 60,
  plannedWeightKg: null,
  reps: 10,
  durationSec: null,
  distanceM: null,
  ...patch,
});

const logged = (patch: Partial<LoggedSet> = {}): LoggedSet => ({
  position: 0,
  setIndex: 0,
  reps: 10,
  weightKg: null,
  durationSec: null,
  distanceM: null,
  ...patch,
});

const input = (patch: Partial<LiveActivityInput> = {}): LiveActivityInput => ({
  rest: null,
  paused: false,
  current: exercise(),
  setIndex: 1,
  doneCount: 2,
  total: 6,
  draft: { reps: 10, weightKg: 40 },
  sets: [],
  ...patch,
});

const NOW = 1_700_000_000_000;

describe('set line (the set in course)', () => {
  it('writes the set with reps and weight', () => {
    expect(setLine(exercise(), 1, { reps: 10, weightKg: 40 }, 'es')).toBe('Serie 2 de 3 · 10 × 40 kg');
    expect(setLine(exercise(), 1, { reps: 8, weightKg: 42.5 }, 'en')).toBe('Set 2 of 3 · 8 × 42.5 kg');
  });
  it('is only the reps for bodyweight, and never has a dash', () => {
    const line = setLine(exercise(), 0, { reps: 12, weightKg: null }, 'es');
    expect(line).toBe('Serie 1 de 3 · 12 reps');
    expect(line).not.toContain('—');
  });
  it('uses the target reps when the runner has none loaded', () => {
    expect(setLine(exercise(), 0, { reps: null, weightKg: 20 }, 'es')).toBe('Serie 1 de 3 · 10 × 20 kg');
  });
  it('writes a timed set with its seconds', () => {
    const plank = exercise({ unit: 'sec', amount: 40, amountMax: 40, reps: null, durationSec: 40 });
    expect(setLine(plank, 0, { reps: null, weightKg: null }, 'es')).toBe('Serie 1 de 3 · 40 s');
  });
});

describe('exercise line (the next exercise during a rest)', () => {
  it('is "3 × 10 · 40 kg" with a weight and "3 × 10" without', () => {
    expect(exerciseLine(exercise(), { reps: 10, weightKg: 40 }, 'es')).toBe('3 × 10 · 40 kg');
    expect(exerciseLine(exercise(), { reps: 10, weightKg: null }, 'es')).toBe('3 × 10');
  });
  it('takes the loaded reps when the exercise has no target, and never writes a dash', () => {
    const none = exercise({ amount: null, amountMax: null, reps: null });
    expect(exerciseLine(none, { reps: 8, weightKg: null }, 'es')).toBe('3 × 8');
    const empty = exerciseLine(none, { reps: null, weightKg: null }, 'es');
    expect(empty).toBe('3 series');
    expect(empty).not.toContain('—');
    expect(exerciseLine(none, { reps: null, weightKg: null }, 'en')).toBe('3 sets');
  });
  it('keeps a rep range', () => {
    expect(exerciseLine(exercise({ amount: 6, amountMax: 9 }), { reps: 6, weightKg: null }, 'es')).toBe('3 × 6–9');
  });
  it('writes a timed exercise and "máx"', () => {
    expect(exerciseLine(exercise({ unit: 'sec', amount: 40, reps: null }), { reps: null, weightKg: null }, 'es')).toBe(
      '3 × 40 s',
    );
    expect(exerciseLine(exercise({ unit: 'max', amount: null, reps: null }), { reps: null, weightKg: null }, 'en')).toBe(
      '3 × max',
    );
  });
});

describe('set readiness (what "Serie hecha" can save)', () => {
  it('is ready with the reps and the weight the runner has loaded', () => {
    expect(setReadiness(exercise(), { reps: 10, weightKg: 40 }, [])).toEqual({ ready: true });
  });
  it('needs the weight when nothing was loaded for an ordinary exercise', () => {
    expect(setReadiness(exercise(), { reps: 10, weightKg: null }, [])).toEqual({ ready: false, needs: 'weight' });
  });
  it('is ready without weight once an earlier set of the exercise was logged with none', () => {
    expect(setReadiness(exercise(), { reps: 10, weightKg: null }, [logged()])).toEqual({ ready: true });
    // …but not if an earlier set did have a weight.
    expect(setReadiness(exercise(), { reps: 10, weightKg: null }, [logged({ weightKg: 40 })])).toEqual({
      ready: false,
      needs: 'weight',
    });
  });
  it('treats a calibration set as needing the weight, and a bodyweight plan exercise as ready', () => {
    const plan = (calibrate: boolean, recommendedKg: number | null) =>
      exercise({ plan: { repMin: 6, repMax: 9, rir: 2, recommendedKg, calibrate, lastTime: null } });
    expect(setReadiness(plan(true, null), { reps: 6, weightKg: null }, [])).toEqual({ ready: false, needs: 'weight' });
    expect(setReadiness(plan(false, null), { reps: 6, weightKg: null }, [])).toEqual({ ready: true });
    expect(setReadiness(plan(false, 80), { reps: 6, weightKg: 80 }, [])).toEqual({ ready: true });
  });
  it('does not need a weight for a timed or distance set', () => {
    const plank = exercise({ unit: 'sec', amount: 40, reps: null });
    expect(setReadiness(plank, { reps: null, weightKg: null }, [])).toEqual({ ready: true });
  });
  it('never needs the reps, not even for "máx" with none loaded', () => {
    const max = exercise({ unit: 'max', amount: null, reps: null });
    expect(setReadiness(max, { reps: null, weightKg: 20 }, [])).toEqual({ ready: true });
    expect(setLine(max, 0, { reps: null, weightKg: 20 }, 'es')).toBe('Serie 1 de 3 · máx × 20 kg');
  });
  it('falls back to the routine target when the runner has no reps', () => {
    expect(setLine(exercise({ reps: null, amount: 8 }), 0, { reps: null, weightKg: 20 }, 'es')).toBe(
      'Serie 1 de 3 · 8 × 20 kg',
    );
    expect(setReadiness(exercise(), { reps: null, weightKg: 20 }, [])).toEqual({ ready: true });
  });
});

describe('liveActivityState', () => {
  const rest = { kind: 'set' as const, remainingMs: 45_000, phase: 'run' };

  it('rest: countdown, "Siguiente", the set that follows and "Serie hecha ✓"', () => {
    const state = liveActivityState(input({ rest, current: exercise(), setIndex: 1 }), NOW, 'es');
    expect(state).toMatchObject({
      phase: 'rest',
      headline: 'Descanso',
      prefix: 'Siguiente: ',
      scheme: 'Serie 2 de 3 · 10 × 40 kg',
      progress: '2 de 6',
      action: 'completeSet',
      restEndsAt: Math.round((NOW + 45_000) / 1000) * 1000,
    });
  });
  it('a rest already carries the set that follows, for the staleDate (iOS draws it by itself)', () => {
    const state = liveActivityState(input({ rest, current: exercise({ position: 2 }), setIndex: 1 }), NOW, 'es');
    expect(state).toMatchObject({
      action: 'completeSet',
      nowHeadline: 'Ahora',
      setScheme: 'Serie 2 de 3 · 10 × 40 kg',
      setCompact: 'Serie 2',
      setAction: 'completeSet',
      position: 2,
      setIndex: 1,
      hint: '',
    });
    expect(liveActivityState(input({ rest }), NOW, 'en')).toMatchObject({
      nowHeadline: 'Now',
      setScheme: 'Set 2 of 3 · 10 × 40 kg',
    });
  });
  it('the set after a rest without a weight to log is not markable from the activity', () => {
    const state = liveActivityState(input({ rest, draft: { reps: 10, weightKg: null } }), NOW, 'es');
    expect(state).toMatchObject({
      action: 'chooseInApp',
      setAction: 'chooseInApp',
      hint: 'Elige tu peso en la app',
      setScheme: 'Serie 2 de 3 · 10 reps',
    });
    // Reps never produce a hint; only a missing weight does.
    expect(
      liveActivityState(input({ rest, draft: { reps: null, weightKg: 40 } }), NOW, 'es'),
    ).toMatchObject({ action: 'completeSet', hint: '' });
  });
  it('paused: the following set offers no button either', () => {
    expect(liveActivityState(input({ rest, paused: true }), NOW, 'es').setAction).toBe('none');
  });
  it('rest between exercises previews the next one without dashes', () => {
    const state = liveActivityState(
      input({ rest: { ...rest, kind: 'exercise' }, current: exercise({ name: 'Remo', amount: null, amountMax: null, reps: null }), draft: { reps: null, weightKg: null } }),
      NOW,
      'es',
    );
    expect(state.scheme).toBe('Serie 2 de 3');
    expect(state.scheme).not.toContain('—');
  });
  it('set in course: "Ahora", the line and "Serie hecha ✓" aimed at that set', () => {
    const state = liveActivityState(input({ current: exercise({ position: 2 }), setIndex: 1 }), NOW, 'es');
    expect(state).toMatchObject({
      phase: 'exercise',
      headline: 'Ahora',
      scheme: 'Serie 2 de 3 · 10 × 40 kg',
      action: 'completeSet',
      position: 2,
      setIndex: 1,
      restEndsAt: null,
      hint: '',
      compact: 'Serie 2',
    });
    expect(state.labels.setDone).toBe('Serie hecha ✓');
  });
  it('without a weight to log it offers the app instead of the button', () => {
    const state = liveActivityState(input({ draft: { reps: 10, weightKg: null } }), NOW, 'es');
    expect(state.action).toBe('chooseInApp');
    expect(state.hint).toBe('Elige tu peso en la app');
    expect(liveActivityState(input({ draft: { reps: 10, weightKg: null } }), NOW, 'en').hint).toBe(
      'Pick your weight in the app',
    );
  });
  it('last set of the session: "Sesión completa · Abre la app para terminar"', () => {
    const state = liveActivityState(input({ current: null, doneCount: 6 }), NOW, 'es');
    expect(state).toMatchObject({ phase: 'done', headline: 'Sesión completa', action: 'openApp' });
    expect(state.labels.doneHint).toBe('Abre la app para terminar');
    expect(liveActivityState(input({ current: null }), NOW, 'en').headline).toBe('Session complete');
  });
  it('paused: no button and the frozen time', () => {
    const state = liveActivityState(input({ rest, paused: true }), NOW, 'es');
    expect(state).toMatchObject({ action: 'none', headline: 'En pausa', restEndsAt: null, pausedRemainingSec: 45 });
    expect(liveActivityState(input({ paused: true }), NOW, 'es').action).toBe('none');
  });
  it('is written in English too', () => {
    const state = liveActivityState(input({ rest }), NOW, 'en');
    expect(state).toMatchObject({ headline: 'Rest', prefix: 'Next: ', progress: '2 of 6' });
    expect(state.labels.skip).toBe('Skip');
  });
  it('the rest end state is the same state with no rest, ready for the set', () => {
    const end = liveActivityRestEndState(input({ rest, setIndex: 1 }), NOW, 'es');
    expect(end).toMatchObject({ phase: 'exercise', action: 'completeSet', setIndex: 1, restEndsAt: null });
  });
  it('keeps the same key while nothing changes', () => {
    const a = liveActivityState(input({ rest }), NOW, 'es');
    const b = liveActivityState(input({ rest }), NOW + 300, 'es');
    expect(liveActivityKey(a, null)).toBe(liveActivityKey(b, null));
  });
});

describe('restEndNotification', () => {
  it('says "¡Vamos!" and the next exercise with its scheme, never a dash', () => {
    const state = liveActivityState(
      input({ rest: { kind: 'exercise', remainingMs: 30_000, phase: 'run' }, draft: { reps: null, weightKg: null }, current: exercise({ amount: null, amountMax: null, reps: null }) }),
      NOW,
      'es',
    );
    const note = restEndNotification(state, 'es');
    expect(note?.title).toBe('¡Vamos!');
    expect(note?.body).toBe('Siguiente: Press de banca · Serie 2 de 3');
    expect(note?.body).not.toContain('—');
    expect(restEndNotification(state, 'en')?.title).toBe("Let's go!");
  });
  it('is none outside a running rest', () => {
    expect(restEndNotification(liveActivityState(input(), NOW, 'es'), 'es')).toBeNull();
  });
});

describe('actionDecision', () => {
  const action = (patch = {}) => ({
    id: 'a1',
    kind: 'completeSet' as const,
    sessionId: 's1',
    position: 0,
    setIndex: 1,
    at: NOW,
    ...patch,
  });
  const target = (patch: Partial<ActionTarget> = {}): ActionTarget => ({
    sessionId: 's1',
    loaded: true,
    paused: false,
    cursor: { position: 0, setIndex: 1 },
    resting: false,
    readiness: { ready: true },
    ...patch,
  });

  it('logs the set that is the current one', () => {
    expect(actionDecision(action(), target(), NOW + 500)).toBe('logSet');
  });
  it('ignores a set that is no longer the current one (a second tap)', () => {
    expect(actionDecision(action(), target({ cursor: { position: 0, setIndex: 2 } }), NOW)).toBe('ignore');
    expect(actionDecision(action(), target({ cursor: { position: 1, setIndex: 1 } }), NOW)).toBe('ignore');
  });
  it('logs the set the card shows during a rest too', () => {
    expect(actionDecision(action(), target({ resting: true }), NOW)).toBe('logSet');
  });
  it('ignores another session, a pause, an unloaded runner and an incomplete set', () => {
    expect(actionDecision(action({ sessionId: 'other' }), target(), NOW)).toBe('ignore');
    expect(actionDecision(action(), target({ paused: true }), NOW)).toBe('ignore');
    expect(actionDecision(action(), target({ loaded: false }), NOW)).toBe('ignore');
    expect(actionDecision(action(), target({ readiness: { ready: false, needs: 'weight' } }), NOW)).toBe('ignore');
  });
  it('ignores an old action', () => {
    expect(actionDecision(action(), target(), NOW + ACTION_TTL_MS + 1)).toBe('ignore');
  });
  it('skips a rest only while there is one', () => {
    const skip = action({ kind: 'skipRest' });
    expect(actionDecision(skip, target({ resting: true }), NOW)).toBe('skipRest');
    expect(actionDecision(skip, target({ resting: false }), NOW)).toBe('ignore');
  });
});
