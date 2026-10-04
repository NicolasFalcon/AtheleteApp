import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  buildDayTotals,
  DEFAULT_WATER_GOAL_GLASSES,
} from '@app/features/nutrition/nutritionModel';
import { useAuth } from '@app/hooks/useAuth';
import { useNutritionPlan } from '@app/hooks/useNutritionPlan';
import { fetchTodayWaterMl } from '@app/services/supabase/nutrition';

// The day of Nutrición: active plan, what was logged today and the water,
// reduced by the shared model (buildDayTotals).
export function useNutritionDay() {
  const { profile } = useAuth();
  const plan = useNutritionPlan();
  const water = useQuery({
    queryKey: ['nutrition', 'hydration', profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: () => fetchTodayWaterMl(profile!.id),
  });

  const goalGlasses = profile?.dailyWaterGoal || DEFAULT_WATER_GOAL_GLASSES;
  const totals = useMemo(
    () =>
      buildDayTotals({
        plan: plan.data?.plan ?? null,
        log: plan.data?.todayLog ?? null,
        waterMl: water.data ?? 0,
        goalGlasses,
      }),
    [goalGlasses, plan.data, water.data],
  );

  return {
    totals,
    plan: plan.data?.plan ?? null,
    todayLog: plan.data?.todayLog ?? null,
    isLoading: plan.isLoading || water.isLoading,
    error: plan.error || water.error || null,
    refetch: () => Promise.all([plan.refetch(), water.refetch()]),
    saveTodayLog: plan.saveTodayLog,
    isSaving: plan.isSavingTodayLog,
  };
}
