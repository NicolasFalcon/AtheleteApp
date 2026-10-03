import { typeLabel } from '@app/features/workouts/workoutsModel';
import type { WorkoutDifficulty } from '@app/shared';

const DIFFICULTY: Record<WorkoutDifficulty, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
};

export function difficultyLabel(value?: string | null): string {
  return (value && DIFFICULTY[value as WorkoutDifficulty]) || 'Rutina';
}

// Database types are free text (e.g. "full_body"): normalized in the Entrenos
// model.
export function workoutTypeLabel(value?: string | null): string {
  return value ? typeLabel(value) : 'Entreno';
}
