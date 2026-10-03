import { routineTypeLabel } from '@app/features/workouts/workoutsModel';
import type { Workout, WorkoutDifficulty } from '@app/shared';

const DIFFICULTY: Record<WorkoutDifficulty, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
};

export function difficultyLabel(value?: string | null): string {
  return (value && DIFFICULTY[value as WorkoutDifficulty]) || 'Rutina';
}

// The routine's category (server-computed), or its raw type as a fallback.
export function workoutTypeLabel(
  workout?: Pick<Workout, 'routineCategory' | 'type'> | null,
): string {
  return workout ? routineTypeLabel(workout) : 'Entreno';
}
