import {useMemo} from 'react';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import type {Workout, WorkoutSession} from '@app/shared';
import {useAuth} from '@app/hooks/useAuth';
import {invalidateWorkoutQueries} from '@app/lib/queryInvalidation';
import {
  cancelWorkoutSession,
  completeWorkoutSession,
  fetchEffectiveWorkoutSession,
  persistWorkoutSessionExercises,
  resumeWorkoutSession,
  startWorkoutSession,
} from '@app/services/supabase/fitness';

// One entry per routine: the pending session is chosen per routine.
function buildSessionKey(userId: string | undefined, workoutId?: string) {
  return ['workout-session', userId, workoutId];
}

export function useWorkoutSession(workout: Workout | null) {
  const {profile} = useAuth();
  const queryClient = useQueryClient();
  const userId = profile?.id;

  const sessionQuery = useQuery({
    queryKey: buildSessionKey(userId, workout?.id),
    // The pending session is chosen per routine: wait for it.
    enabled: Boolean(userId && workout),
    queryFn: async () => fetchEffectiveWorkoutSession(userId!, workout?.id),
  });

  const syncSessionSurfaces = (nextSession: WorkoutSession) => {
    queryClient.setQueryData(buildSessionKey(userId, workout?.id), nextSession);
    queryClient.setQueryData(
      ['home', 'overview', userId],
      (current: any) =>
        current ? {...current, todaySession: nextSession} : current,
    );

    if (userId) {
      invalidateWorkoutQueries(queryClient, userId).catch(error => {
        console.warn(
          '[workout-session] No se pudieron refrescar todas las superficies.',
          error,
        );
      });
    }
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
    onSuccess: nextSession => {
      syncSessionSurfaces(nextSession);
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
      queryClient.setQueryData(buildSessionKey(userId, workout?.id), nextSession);
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
    onSuccess: nextSession => {
      syncSessionSurfaces(nextSession);
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
    onSuccess: nextSession => {
      syncSessionSurfaces(nextSession);
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
    onSuccess: nextSession => {
      syncSessionSurfaces(nextSession);
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
