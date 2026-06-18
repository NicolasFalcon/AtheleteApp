import type {QueryClient} from '@tanstack/react-query';

export async function invalidatePersonalRecordQueries(
  queryClient: QueryClient,
  userId: string,
) {
  await Promise.allSettled([
    queryClient.invalidateQueries({
      queryKey: ['personal-records', userId],
    }),
    queryClient.invalidateQueries({
      queryKey: ['profile', 'overview', userId],
    }),
    queryClient.invalidateQueries({
      queryKey: ['ellie', 'overview', userId],
    }),
    queryClient.invalidateQueries({
      queryKey: ['home', 'overview', userId],
    }),
    queryClient.invalidateQueries({
      queryKey: ['progress', 'overview', userId],
    }),
  ]);
}

export async function invalidateWorkoutQueries(
  queryClient: QueryClient,
  userId: string,
) {
  await Promise.allSettled([
    queryClient.invalidateQueries({
      queryKey: ['workouts', 'library', userId],
    }),
    queryClient.invalidateQueries({
      queryKey: ['workouts', 'browse'],
    }),
    queryClient.invalidateQueries({
      queryKey: ['workouts', 'editable', userId],
    }),
    queryClient.invalidateQueries({
      queryKey: ['workouts', 'detail'],
    }),
    queryClient.invalidateQueries({
      queryKey: ['workout-session', userId],
    }),
    queryClient.invalidateQueries({
      queryKey: ['profile', 'overview', userId],
    }),
    queryClient.invalidateQueries({
      queryKey: ['ellie', 'overview', userId],
    }),
    queryClient.invalidateQueries({
      queryKey: ['home', 'overview', userId],
    }),
    queryClient.invalidateQueries({
      queryKey: ['progress', 'overview', userId],
    }),
  ]);
}

export async function invalidateQuizQueries(
  queryClient: QueryClient,
  userId: string,
) {
  await Promise.allSettled([
    queryClient.invalidateQueries({
      queryKey: ['quiz-categories', userId],
    }),
    queryClient.invalidateQueries({
      queryKey: ['profile', 'overview', userId],
    }),
    queryClient.invalidateQueries({
      queryKey: ['ellie', 'overview', userId],
    }),
    queryClient.invalidateQueries({
      queryKey: ['home', 'overview', userId],
    }),
    queryClient.invalidateQueries({
      queryKey: ['progress', 'overview', userId],
    }),
  ]);
}

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

export async function invalidateCore33Queries(
  queryClient: QueryClient,
  userId: string,
) {
  await Promise.allSettled([
    queryClient.invalidateQueries({
      queryKey: ['core33', userId],
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
