import type { LoggedSet, PlannedExercise } from '@app/features/session/sessionModel';

// The app numbers exercises and sets from 0 (as `template_exercises.sort_order`
// does); the session tables number them from 1 (CHECK position >= 1 and
// set_index >= 1, and `exercise_position` must equal the exercise's
// `position`). Every conversion lives here, applied only when sending or
// reading: what the local queue keeps stays in the app's base 0.
export const toDbPosition = (position: number): number => position + 1;
export const fromDbPosition = (position: number): number => position - 1;
export const toDbSetIndex = (setIndex: number): number => setIndex + 1;
export const fromDbSetIndex = (setIndex: number): number => setIndex - 1;

// The rows of `workout_session_exercises` still to insert: every planned
// exercise (done or skipped) whose DB position is not there yet.
export function buildExerciseRows(
  sessionId: string,
  plan: readonly PlannedExercise[],
  existingDbPositions: Iterable<number>,
) {
  const have = new Set(existingDbPositions);
  return plan
    .filter(exercise => !have.has(toDbPosition(exercise.position)))
    .map(exercise => ({
      session_id: sessionId,
      position: toDbPosition(exercise.position),
      exercise_id: exercise.exerciseId,
      template_exercise_id: exercise.templateExerciseId,
      name: exercise.name,
      planned_sets: exercise.sets,
      planned_reps: exercise.reps,
      planned_duration_sec: exercise.durationSec,
      planned_rest_sec: exercise.restSec,
      planned_weight_kg: exercise.plannedWeightKg,
    }));
}

export type SetPayloadInput = {
  sessionId: string;
  userId: string;
  exerciseId: string | null;
  set: LoggedSet;
  restActualSec?: number | null;
  completedAt: string;
};

// The row of `workout_session_sets`: `exercise_position` is the exercise's DB
// position, so it links to (session_id, position).
export function buildSetRow(write: SetPayloadInput) {
  return {
    session_id: write.sessionId,
    user_id: write.userId,
    exercise_id: write.exerciseId,
    exercise_position: toDbPosition(write.set.position),
    set_index: toDbSetIndex(write.set.setIndex),
    reps: write.set.reps,
    weight_kg: write.set.weightKg,
    duration_sec: write.set.durationSec,
    distance_m: write.set.distanceM,
    rest_actual_sec: write.restActualSec ?? null,
    completed_at: write.completedAt,
  };
}

// Reading back: sorted by the DB numbers, returned in the app's base 0.
export function mapSetRows(
  rows: ReadonlyArray<{
    id: string;
    exercise_position: number;
    set_index: number;
    reps: number | null;
    weight_kg: number | null;
    duration_sec: number | null;
    distance_m: number | null;
  }>,
): LoggedSet[] {
  return [...rows]
    .sort((a, b) => a.exercise_position - b.exercise_position || a.set_index - b.set_index)
    .map(row => ({
      id: row.id,
      position: fromDbPosition(row.exercise_position),
      setIndex: fromDbSetIndex(row.set_index),
      reps: row.reps,
      weightKg: row.weight_kg,
      durationSec: row.duration_sec,
      distanceM: row.distance_m,
    }));
}
