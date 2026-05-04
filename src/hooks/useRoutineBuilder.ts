import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@app/hooks/useAuth';
import {invalidateWorkoutQueries} from '@app/lib/queryInvalidation';
import {
  appendExerciseToRoutine,
  createRoutine,
  deleteRoutine,
  fetchEditableWorkouts,
  updateRoutine,
} from '@app/services/supabase/routines';
import type {Workout} from '@app/shared';

type RoutineDraft = Omit<Workout, 'id'>;

export function useRoutineBuilder() {
  const {profile} = useAuth();
  const queryClient = useQueryClient();
  const userId = profile?.id;

  const editableWorkoutsQuery = useQuery({
    queryKey: ['workouts', 'editable', userId],
    enabled: Boolean(userId),
    queryFn: async () => fetchEditableWorkouts(userId!),
  });

  const createMutation = useMutation({
    mutationFn: async (workout: RoutineDraft) => {
      if (!userId) {
        throw new Error('No hay una sesión activa.');
      }

      return createRoutine(userId, workout);
    },
    onSuccess: async () => {
      if (userId) {
        await invalidateWorkoutQueries(queryClient, userId);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (params: {workoutId: string; workout: RoutineDraft}) => {
      if (!userId) {
        throw new Error('No hay una sesión activa.');
      }

      return updateRoutine(userId, params.workoutId, params.workout);
    },
    onSuccess: async () => {
      if (userId) {
        await invalidateWorkoutQueries(queryClient, userId);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (workoutId: string) => {
      if (!userId) {
        throw new Error('No hay una sesión activa.');
      }

      await deleteRoutine(userId, workoutId);
    },
    onSuccess: async () => {
      if (userId) {
        await invalidateWorkoutQueries(queryClient, userId);
      }
    },
  });

  const appendExerciseMutation = useMutation({
    mutationFn: async (params: {
      workoutId: string;
      exerciseId: string;
      exerciseName: string;
    }) => {
      if (!userId) {
        throw new Error('No hay una sesión activa.');
      }

      await appendExerciseToRoutine({
        userId,
        workoutId: params.workoutId,
        exerciseId: params.exerciseId,
        exerciseName: params.exerciseName,
      });
    },
    onSuccess: async () => {
      if (userId) {
        await invalidateWorkoutQueries(queryClient, userId);
      }
    },
  });

  return {
    editableWorkouts: editableWorkoutsQuery.data || [],
    isLoadingEditableWorkouts: editableWorkoutsQuery.isLoading,
    createRoutine: createMutation.mutateAsync,
    isCreatingRoutine: createMutation.isPending,
    updateRoutine: updateMutation.mutateAsync,
    isUpdatingRoutine: updateMutation.isPending,
    deleteRoutine: deleteMutation.mutateAsync,
    isDeletingRoutine: deleteMutation.isPending,
    appendExerciseToRoutine: appendExerciseMutation.mutateAsync,
    isAppendingExercise: appendExerciseMutation.isPending,
  };
}
