import {useMemo} from 'react';
import {useQuery} from '@tanstack/react-query';
import {useAuth} from '@app/hooks/useAuth';
import {useExerciseLibrary} from '@app/hooks/useExerciseLibrary';
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
  const exercisesQuery = useExerciseLibrary();

  const recordSummaries = useMemo(() => {
    if (!recordsQuery.records.length || !exercisesQuery.data?.length) {
      return [];
    }

    return recordsQuery.records.map(record => ({
      ...record,
      exerciseName:
        exercisesQuery.data?.find(exercise => exercise.id === record.exerciseId)
          ?.name || 'Ejercicio',
    }));
  }, [exercisesQuery.data, recordsQuery.records]);

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
    exercisesQuery,
    recordSummaries,
    insights,
    isLoading:
      overviewQuery.isLoading || recordsQuery.isLoading || exercisesQuery.isLoading,
    error:
      overviewQuery.error || recordsQuery.error || exercisesQuery.error || null,
  };
}
