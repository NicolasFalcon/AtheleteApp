import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@app/hooks/useAuth';
import {invalidateNutritionPlanQueries} from '@app/lib/queryInvalidation';
import {
  deactivateNutritionPlan,
  fetchNutritionPlanScreenData,
  upsertTodayNutritionLog,
  type NutritionPlanScreenData,
  type NutritionLogInput,
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
    onSuccess: () => {
      if (!profile?.id) {
        return;
      }

      invalidateNutritionPlanQueries(queryClient, profile.id).catch(error => {
        console.warn(
          '[nutrition-plan] No se pudieron refrescar todas las superficies.',
          error,
        );
      });
    },
  });

  const logMutation = useMutation({
    mutationFn: async (input: NutritionLogInput) => {
      if (!profile?.id) {
        throw new Error('No hay una sesión activa.');
      }

      return upsertTodayNutritionLog(profile.id, input);
    },
    onSuccess: log => {
      if (!profile?.id) {
        return;
      }

      queryClient.setQueryData<NutritionPlanScreenData>(
        ['nutrition', 'plan', profile.id],
        current => (current ? {...current, todayLog: log} : current),
      );
      queryClient.setQueryData(
        ['home', 'overview', profile.id],
        (current: any) =>
          current ? {...current, todayNutritionLog: log} : current,
      );

      invalidateNutritionPlanQueries(queryClient, profile.id).catch(error => {
        console.warn(
          '[nutrition-log] No se pudieron refrescar todas las superficies.',
          error,
        );
      });
    },
  });

  return {
    ...planQuery,
    deactivatePlan: deactivateMutation.mutateAsync,
    isDeactivating: deactivateMutation.isPending,
    saveTodayLog: logMutation.mutateAsync,
    isSavingTodayLog: logMutation.isPending,
  };
}
