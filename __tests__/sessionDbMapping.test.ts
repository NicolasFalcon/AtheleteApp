import {
  buildExerciseRows,
  buildSetRow,
  fromDbPosition,
  fromDbSetIndex,
  mapSetRows,
  toDbPosition,
  toDbSetIndex,
} from '../src/features/session/sessionDbMapping';
import type { LoggedSet, PlannedExercise } from '../src/features/session/sessionModel';

const exercise = (position: number): PlannedExercise =>
  ({
    position,
    templateExerciseId: `te-${position}`,
    exerciseId: `ex-${position}`,
    name: `Ejercicio ${position}`,
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
  }) as PlannedExercise;

const logged = (position: number, setIndex: number): LoggedSet => ({
  position,
  setIndex,
  reps: 10,
  weightKg: 20,
  durationSec: null,
  distanceM: null,
});

describe('session DB numbering (base 1 in the database, base 0 in the app)', () => {
  it('converts both ways', () => {
    expect(toDbPosition(0)).toBe(1);
    expect(fromDbPosition(1)).toBe(0);
    expect(toDbSetIndex(0)).toBe(1);
    expect(fromDbSetIndex(1)).toBe(0);
    [0, 1, 6].forEach(n => {
      expect(fromDbPosition(toDbPosition(n))).toBe(n);
      expect(fromDbSetIndex(toDbSetIndex(n))).toBe(n);
    });
  });

  it('never sends position < 1 with one exercise', () => {
    const rows = buildExerciseRows('s1', [exercise(0)], []);
    expect(rows).toHaveLength(1);
    expect(rows[0].position).toBe(1);
    expect(rows[0].session_id).toBe('s1');
  });

  it('numbers several exercises 1..n, skipped ones included', () => {
    // Only the first was done, the other three are skipped: all are inserted.
    const rows = buildExerciseRows('s1', [exercise(0), exercise(1), exercise(2), exercise(3)], []);
    expect(rows.map(row => row.position)).toEqual([1, 2, 3, 4]);
    expect(rows.every(row => row.position >= 1)).toBe(true);
    expect(rows.map(row => row.template_exercise_id)).toEqual(['te-0', 'te-1', 'te-2', 'te-3']);
  });

  it('inserts only the DB positions that are missing (a repeated send)', () => {
    const plan = [exercise(0), exercise(1), exercise(2)];
    expect(buildExerciseRows('s1', plan, [1, 2]).map(row => row.position)).toEqual([3]);
    expect(buildExerciseRows('s1', plan, [1, 2, 3])).toEqual([]);
  });

  it('links each set to its exercise with the same DB position and starts set_index at 1', () => {
    const write = (position: number, setIndex: number) =>
      buildSetRow({
        sessionId: 's1',
        userId: 'u1',
        exerciseId: `ex-${position}`,
        set: logged(position, setIndex),
        completedAt: '2026-10-13T10:00:00Z',
      });
    const first = write(0, 0);
    expect(first.exercise_position).toBe(1);
    expect(first.set_index).toBe(1);
    const rows = buildExerciseRows('s1', [exercise(0), exercise(1)], []);
    const second = write(1, 2);
    expect(rows.map(row => row.position)).toContain(second.exercise_position);
    expect(second.set_index).toBe(3);
  });

  it('does not change what the local queue keeps (the write stays in base 0)', () => {
    const set = logged(0, 0);
    buildSetRow({ sessionId: 's', userId: 'u', exerciseId: null, set, completedAt: 'x' });
    expect(set).toMatchObject({ position: 0, setIndex: 0 });
  });

  it('send then read gives the same order and the same numbers', () => {
    const sets = [logged(1, 1), logged(0, 0), logged(0, 1), logged(2, 0), logged(1, 0)];
    const sent = sets.map(set =>
      buildSetRow({ sessionId: 's', userId: 'u', exerciseId: null, set, completedAt: 'x' }),
    );
    // What the server returns (any order): rebuild the app's sets.
    const read = mapSetRows(
      [...sent].reverse().map((row, index) => ({
        id: `id-${index}`,
        exercise_position: row.exercise_position,
        set_index: row.set_index,
        reps: row.reps,
        weight_kg: row.weight_kg,
        duration_sec: row.duration_sec,
        distance_m: row.distance_m,
      })),
    );
    expect(read.map(set => [set.position, set.setIndex])).toEqual([
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
      [2, 0],
    ]);
    expect(read[0]).toMatchObject({ reps: 10, weightKg: 20 });
  });
});
