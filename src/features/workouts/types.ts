import type {LibraryExercise} from '@app/shared/data/exercises';
import type {Workout, WorkoutExercise} from '@app/shared/domain/types';

export type RoutineBuilderStep = 'details' | 'exercises' | 'configure';
export type ExerciseMetricMode = 'reps' | 'duration';

export type BuilderExercise = WorkoutExercise & {
  notes: string;
  libraryExercise?: LibraryExercise;
};

export type RoutineDraft = Omit<Workout, 'id'>;
