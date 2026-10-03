import {
  formatSetsReps,
  parseSetsReps,
  recommendationFor,
} from '../src/shared/domain/setsReps';

const show = (input: unknown) => formatSetsReps(parseSetsReps(input));

describe('parseSetsReps', () => {
  it('reads the plain and ranged formats', () => {
    expect(parseSetsReps('3x12-15')).toMatchObject({
      parsed: true,
      sets: 3,
      min: 12,
      max: 15,
      unit: 'reps',
      perSide: false,
    });
    expect(show('3x12-15')).toBe('3 × 12–15');
    expect(show('3 x 10')).toBe('3 × 10');
    expect(show('4×8')).toBe('4 × 8');
  });

  it('reads every outlier format of the library', () => {
    expect(show('2x15 each direction')).toBe('2 × 15 · por lado');
    expect(show('2x30 sec each side')).toBe('2 × 30 s · por lado');
    expect(show('2x20m')).toBe('2 × 20 m');
    expect(show('3x max')).toBe('3 × máx');
    expect(show('3x12 each')).toBe('3 × 12 · por lado');
    expect(show('3x40m')).toBe('3 × 40 m');
    expect(parseSetsReps('2x30 sec each side')).toMatchObject({
      unit: 'sec',
      min: 30,
      perSide: true,
    });
    expect(parseSetsReps('3x max')).toMatchObject({ unit: 'max', min: null });
    expect(parseSetsReps('3x40m')).toMatchObject({ unit: 'm', min: 40 });
  });

  it('reads other spellings of time, distance and sides', () => {
    expect(show('3x45s')).toBe('3 × 45 s');
    expect(show('2x1 min')).toBe('2 × 60 s');
    expect(show('3x30-45 seconds')).toBe('3 × 30–45 s');
    expect(show('3x8-10 each leg')).toBe('3 × 8–10 · por lado');
    expect(show('3x AMRAP')).toBe('3 × máx');
  });

  it('reads the {sets, reps} object, with or without goal keys', () => {
    expect(show({ sets: 3, reps: '12' })).toBe('3 × 12');
    expect(show({ sets: '3', reps: '30 sec' })).toBe('3 × 30 s');
    expect(show({ sets: 3, reps: 10 })).toBe('3 × 10');
    expect(recommendationFor({ sets: 3, reps: '8-10' }, 'hypertrophy')).toMatchObject(
      { parsed: true, min: 8, max: 10 },
    );
    expect(
      formatSetsReps(
        recommendationFor({ hypertrophy: '3x12-15', strength: '5x5' }, 'strength'),
      ),
    ).toBe('5 × 5');
    // Missing goal: falls back to another one.
    expect(
      formatSetsReps(recommendationFor({ endurance: '2x20m' }, 'hypertrophy')),
    ).toBe('2 × 20 m');
  });

  it('returns the original text, without throwing, for what it cannot read', () => {
    expect(parseSetsReps('hasta el fallo')).toEqual({
      parsed: false,
      raw: 'hasta el fallo',
    });
    expect(show('3x lots')).toBe('3x lots');
    expect(show('')).toBe('');
    expect(show(null)).toBe('');
    expect(show(undefined)).toBe('');
    expect(show(42)).toBe('42');
    expect(show([1, 2])).toBe('1,2');
    expect(show({ foo: 'bar' })).toBe('{"foo":"bar"}');
    expect(formatSetsReps(recommendationFor(null, 'hypertrophy'))).toBe('');
  });
});
