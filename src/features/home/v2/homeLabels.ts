import type { WorkoutDifficulty, WorkoutType } from '@app/shared';

const DIFFICULTY: Record<WorkoutDifficulty, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
};

const TYPE: Record<WorkoutType, string> = {
  strength: 'Fuerza',
  cardio: 'Cardio',
  fullbody: 'Cuerpo completo',
  mobility: 'Movilidad',
  hiit: 'HIIT',
};

export function difficultyLabel(value?: string | null): string {
  return (value && DIFFICULTY[value as WorkoutDifficulty]) || 'Rutina';
}

export function workoutTypeLabel(value?: string | null): string {
  return (value && TYPE[value as WorkoutType]) || 'Entreno';
}
