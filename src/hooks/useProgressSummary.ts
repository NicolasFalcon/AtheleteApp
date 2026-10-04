import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { trainingSinceKey } from '@app/features/progress/progressModel';
import { useAuth } from '@app/hooks/useAuth';
import { useProgressData } from '@app/hooks/useProgressData';
import {
  emptySummary,
  summaryToSessions,
} from '@app/features/progress/summaryAdapter';
import { fetchProgressSummary } from '@app/services/supabase/progressSummary';

// Everything the Progreso Resumen reads: the existing overview (nutrition,
// hydration, challenge), personal records, the exercise library and the
// completed sessions with pauses and server volume.
export function useProgressSummary() {
  const { profile } = useAuth();
  const userId = profile?.id;
  const progress = useProgressData();
  const since = trainingSinceKey(new Date());
  const trainingQuery = useQuery({
    queryKey: ['progress', 'training', userId, since],
    enabled: Boolean(userId),
    queryFn: () => fetchProgressSummary(since),
  });
  // The model takes sessions: the aggregates are expressed as such.
  const sessions = useMemo(
    () => summaryToSessions(trainingQuery.data ?? emptySummary),
    [trainingQuery.data],
  );

  return {
    ...progress,
    trainingQuery,
    sessions,
    isLoading: progress.isLoading || trainingQuery.isLoading,
    error: progress.error || trainingQuery.error || null,
    refetchAll: () =>
      Promise.all([
        progress.overviewQuery.refetch(),
        progress.recordsQuery.refetch(),
        progress.exercisesQuery.refetch(),
        trainingQuery.refetch(),
      ]),
  };
}
