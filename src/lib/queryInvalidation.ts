import type {QueryClient} from '@tanstack/react-query';

export async function invalidateNutritionPlanQueries(
  queryClient: QueryClient,
  userId: string,
) {
  await Promise.allSettled([
    queryClient.invalidateQueries({
      queryKey: ['nutrition', 'plan', userId],
    }),
    queryClient.invalidateQueries({
      queryKey: ['home', 'overview', userId],
    }),
    queryClient.invalidateQueries({
      queryKey: ['ellie', 'overview', userId],
    }),
    queryClient.invalidateQueries({
      queryKey: ['profile', 'overview', userId],
    }),
    queryClient.invalidateQueries({
      queryKey: ['progress', 'overview', userId],
    }),
  ]);
}
