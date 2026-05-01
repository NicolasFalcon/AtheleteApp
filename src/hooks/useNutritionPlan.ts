import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@app/hooks/useAuth';
import {invalidateNutritionPlanQueries} from '@app/lib/queryInvalidation';
import {
  deactivateNutritionPlan,
  fetchNutritionPlanScreenData,
} from '@app/services/supabase/nutrition';

export function useNutritionPlan() {
  const {profile} = useAuth();
  const queryClient = useQueryClient();

  const planQuery = useQuery({
    queryKey: ['nutrition', 'plan', profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => fetchNutritionPlanScreenData(profile!.id),
  });

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) {
        throw new Error('No hay una sesión activa.');
      }

      await deactivateNutritionPlan(profile.id);
    },
    onSuccess: async () => {
      if (!profile?.id) {
        return;
      }

      await invalidateNutritionPlanQueries(queryClient, profile.id);
    },
  });

  return {
    ...planQuery,
    deactivatePlan: deactivateMutation.mutateAsync,
    isDeactivating: deactivateMutation.isPending,
  };
}
