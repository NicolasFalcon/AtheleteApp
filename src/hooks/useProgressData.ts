import {useMemo} from 'react';
import {useQuery} from '@tanstack/react-query';
import {useAuth} from '@app/hooks/useAuth';
import {useExerciseNames} from '@app/hooks/useCatalog';
import {usePersonalRecords} from '@app/hooks/usePersonalRecords';
import {fetchProgressOverview} from '@app/services/supabase/progress';
import {generateProgressInsights} from '@app/shared';

export function useProgressData() {
  const {profile} = useAuth();
  const overviewQuery = useQuery({
    queryKey: ['progress', 'overview', profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () =>
      fetchProgressOverview({
        userId: profile!.id,
        dailyWaterGoal: profile?.dailyWaterGoal,
      }),
  });
  const recordsQuery = usePersonalRecords();
  // Names of the exercises with records only (get_exercise, kept on the
  // phone); never the whole catalog. They do not block the screen.
  const exerciseNames = useExerciseNames(
    useMemo(
      () => recordsQuery.records.map(record => record.exerciseId),
      [recordsQuery.records],
    ),
  );
  const names = exerciseNames.names;

  const recordSummaries = useMemo(() => {
    if (!recordsQuery.records.length) {
      return [];
    }

    return recordsQuery.records.map(record => ({
      ...record,
      exerciseName: names[record.exerciseId] || 'Ejercicio',
    }));
  }, [names, recordsQuery.records]);

  const insights = useMemo(() => {
    if (!overviewQuery.data || !profile) {
      return [];
    }

    return generateProgressInsights({
      workoutSessions: overviewQuery.data.workoutSessions,
      trainingDaysPerWeek: profile.trainingDaysPerWeek || 0,
      dailyNutritionLogs: overviewQuery.data.dailyNutritionLogs,
      personalRecords: recordSummaries,
    });
  }, [
    overviewQuery.data,
    profile,
    recordSummaries,
  ]);

  return {
    overviewQuery,
    recordsQuery,
    exerciseNames: names,
    refetchExerciseNames: exerciseNames.refetch,
    recordSummaries,
    insights,
    isLoading: overviewQuery.isLoading || recordsQuery.isLoading,
    error: overviewQuery.error || recordsQuery.error || null,
  };
}
