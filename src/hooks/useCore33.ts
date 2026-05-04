import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {invalidateCore33Queries} from '@app/lib/queryInvalidation';
import {useAuth} from '@app/hooks/useAuth';
import {
  fetchCore33State,
  restartCore33Challenge,
  startCore33Challenge,
  toggleCore33Habit,
  type Core33HabitSelection,
} from '@app/services/supabase/core33';

export function useCore33() {
  const queryClient = useQueryClient();
  const {profile} = useAuth();

  const stateQuery = useQuery({
    queryKey: ['core33', profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => fetchCore33State(profile!.id),
  });

  const startMutation = useMutation({
    mutationFn: async (habits: Core33HabitSelection) => {
      if (!profile?.id) {
        throw new Error('No hay sesión activa.');
      }

      await startCore33Challenge({
        userId: profile.id,
        habits,
      });
    },
    onSuccess: async () => {
      if (!profile?.id) {
        return;
      }

      await invalidateCore33Queries(queryClient, profile.id);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (params: {date: string; habitIndex: number}) => {
      if (!profile?.id || !stateQuery.data?.challenge) {
        throw new Error('No hay un reto activo.');
      }

      await toggleCore33Habit({
        userId: profile.id,
        challenge: stateQuery.data.challenge,
        habitLogs: stateQuery.data.habitLogs,
        date: params.date,
        habitIndex: params.habitIndex,
      });
    },
    onSuccess: async () => {
      if (!profile?.id) {
        return;
      }

      await invalidateCore33Queries(queryClient, profile.id);
    },
  });

  const restartMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id || !stateQuery.data?.challenge) {
        throw new Error('No hay un reto para reiniciar.');
      }

      await restartCore33Challenge({
        userId: profile.id,
        challengeId: stateQuery.data.challenge.id,
      });
    },
    onSuccess: async () => {
      if (!profile?.id) {
        return;
      }

      await invalidateCore33Queries(queryClient, profile.id);
    },
  });

  return {
    stateQuery,
    startChallenge: startMutation.mutateAsync,
    isStarting: startMutation.isPending,
    toggleHabit: toggleMutation.mutateAsync,
    isToggling: toggleMutation.isPending,
    restartChallenge: restartMutation.mutateAsync,
    isRestarting: restartMutation.isPending,
  };
}
