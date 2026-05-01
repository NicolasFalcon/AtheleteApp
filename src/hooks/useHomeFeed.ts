import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {fetchHomeOverview, addHydrationAmount} from '@app/services/supabase/fitness';
import {useAuth} from '@app/hooks/useAuth';

export function useHomeFeed() {
  const queryClient = useQueryClient();
  const {profile} = useAuth();

  const overviewQuery = useQuery({
    queryKey: ['home', 'overview', profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () =>
      fetchHomeOverview({
        userId: profile!.id,
        dailyWaterGoal: profile?.dailyWaterGoal,
      }),
  });

  const hydrationMutation = useMutation({
    mutationFn: async (amountMl: number) => {
      if (!profile?.id) {
        throw new Error('No hay sesión activa.');
      }

      await addHydrationAmount({
        userId: profile.id,
        amountMl,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['home', 'overview', profile?.id],
      });
    },
  });

  return {
    ...overviewQuery,
    addHydration: hydrationMutation.mutateAsync,
    isAddingHydration: hydrationMutation.isPending,
  };
}
