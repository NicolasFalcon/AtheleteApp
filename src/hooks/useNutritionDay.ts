import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { dayTotalsFromDay, DEFAULT_WATER_GOAL_GLASSES } from '@app/features/nutrition/nutritionModel';
import { useAuth } from '@app/hooks/useAuth';
import { mealKeys, useNutritionDayMeals } from '@app/hooks/useMeals';
import { getLocalDateKey } from '@app/lib/date';
import { mealsService } from '@app/services/nutrition/mealsService';
import { fetchTodayWaterMl } from '@app/services/supabase/nutrition';

// The day of Calorías: the meals, totals and goal come from get_nutrition_day
// (the server adds the meals and picks the goal); the water is read apart.
export function useNutritionDay(date: string | null = null) {
  const { profile } = useAuth();
  const meals = useNutritionDayMeals(date);
  const water = useQuery({
    queryKey: ['nutrition', 'hydration', profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: () => fetchTodayWaterMl(profile!.id),
  });

  const goalGlasses = profile?.dailyWaterGoal || DEFAULT_WATER_GOAL_GLASSES;
  const totals = useMemo(
    () => (meals.data ? dayTotalsFromDay(meals.data, water.data ?? 0, goalGlasses) : null),
    [goalGlasses, meals.data, water.data],
  );

  return {
    day: meals.data ?? null,
    totals,
    isLoading: meals.isLoading || water.isLoading,
    error: meals.error || water.error || null,
    refetch: () => Promise.all([meals.refetch(), water.refetch()]),
  };
}

// The last 7 days for the history bars (today last).
export function useWeekHistory() {
  const { profile } = useAuth();
  const keys = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const offset = 6 - index;
        return {
          date: getLocalDateKey(new Date(Date.now() - offset * 86_400_000)),
          isToday: offset === 0,
        };
      }),
    [],
  );
  const results = useQueries({
    queries: keys.map(({ date, isToday }) => ({
      queryKey: mealKeys.day(profile?.id, isToday ? null : date),
      enabled: Boolean(profile?.id),
      staleTime: 60_000,
      queryFn: () => mealsService.getDay(isToday ? undefined : date),
    })),
  });
  return keys.map((key, index) => ({
    date: key.date,
    isToday: key.isToday,
    kcal: results[index].data?.totals.kcal ?? 0,
    goal: results[index].data?.goal.kcal ?? null,
    loading: results[index].isLoading,
  }));
}
