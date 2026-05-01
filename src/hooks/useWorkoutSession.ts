import {useMemo} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import type {Workout} from '@app/shared';
import {useAuth} from '@app/hooks/useAuth';
import {
  cancelWorkoutSession,
  completeWorkoutSession,
  fetchEffectiveWorkoutSession,
  persistWorkoutSessionExercises,
  resumeWorkoutSession,
  startWorkoutSession,
} from '@app/services/supabase/fitness';

function buildSessionKey(userId: string | undefined) {
  return ['workout-session', userId];
}

export function useWorkoutSession(workout: Workout | null) {
  const {profile} = useAuth();
  const queryClient = useQueryClient();
  const userId = profile?.id;

  const sessionQuery = useQuery({
    queryKey: buildSessionKey(userId),
    enabled: Boolean(userId),
    queryFn: async () => fetchEffectiveWorkoutSession(userId!),
  });

  const invalidateSurfaceQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({queryKey: ['home', 'overview', userId]}),
      queryClient.invalidateQueries({queryKey: buildSessionKey(userId)}),
    ]);
  };

  const startMutation = useMutation({
    mutationFn: async () => {
      if (!userId || !workout) {
        throw new Error('No pudimos iniciar esta sesión.');
      }

      return startWorkoutSession({
        userId,
        workout,
      });
    },
    onSuccess: async nextSession => {
      queryClient.setQueryData(buildSessionKey(userId), nextSession);
      await invalidateSurfaceQueries();
    },
  });

  const persistExercisesMutation = useMutation({
    mutationFn: async (completedExercises: string[]) => {
      const session = sessionQuery.data;

      if (!session) {
        throw new Error('No hay una sesión activa para actualizar.');
      }

      return persistWorkoutSessionExercises({
        sessionId: session.id,
        completedExercises,
      });
    },
    onSuccess: nextSession => {
      queryClient.setQueryData(buildSessionKey(userId), nextSession);
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (completedExercises: string[]) => {
      const session = sessionQuery.data;

      if (!session || !workout) {
        throw new Error('No pudimos completar la sesión.');
      }

      return completeWorkoutSession({
        session,
        workout,
        completedExercises,
      });
    },
    onSuccess: async nextSession => {
      queryClient.setQueryData(buildSessionKey(userId), nextSession);
      await invalidateSurfaceQueries();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (completedExercises: string[]) => {
      const session = sessionQuery.data;

      if (!session || !workout) {
        throw new Error('No pudimos guardar tu sesión.');
      }

      return cancelWorkoutSession({
        session,
        workout,
        completedExercises,
      });
    },
    onSuccess: async nextSession => {
      queryClient.setQueryData(buildSessionKey(userId), nextSession);
      await invalidateSurfaceQueries();
    },
  });

  const resumeMutation = useMutation({
    mutationFn: async () => {
      const session = sessionQuery.data;

      if (!session) {
        throw new Error('No hay una sesión para reanudar.');
      }

      return resumeWorkoutSession(session);
    },
    onSuccess: async nextSession => {
      queryClient.setQueryData(buildSessionKey(userId), nextSession);
      await invalidateSurfaceQueries();
    },
  });

  const workoutSession = useMemo(() => {
    if (!workout || !sessionQuery.data) {
      return null;
    }

    return sessionQuery.data.workoutId === workout.id ? sessionQuery.data : null;
  }, [sessionQuery.data, workout]);

  return {
    session: sessionQuery.data || null,
    workoutSession,
    isLoading: sessionQuery.isLoading,
    isRefreshing: sessionQuery.isRefetching,
    refreshSession: sessionQuery.refetch,
    startSession: startMutation.mutateAsync,
    isStartingSession: startMutation.isPending,
    persistCompletedExercises: persistExercisesMutation.mutateAsync,
    isPersistingExercises: persistExercisesMutation.isPending,
    completeSession: completeMutation.mutateAsync,
    isCompletingSession: completeMutation.isPending,
    saveSessionForLater: cancelMutation.mutateAsync,
    isSavingSession: cancelMutation.isPending,
    resumeSession: resumeMutation.mutateAsync,
    isResumingSession: resumeMutation.isPending,
  };
}
