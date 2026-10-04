import { useMemo } from 'react';
import {
  buildBadgeStats,
  buildShelves,
} from '@app/features/progress/badgesModel';
import { currentStreak } from '@app/features/progress/progressModel';
import { useProfileOverview } from '@app/hooks/useProfileOverview';
import { useProgressSummary } from '@app/hooks/useProgressSummary';

// The medals with their progress, measured as in Logros (same stats): used by
// the Perfil showcase.
export function useBadgeShelves() {
  const overviewQuery = useProfileOverview();
  const summary = useProgressSummary();
  const now = useMemo(() => new Date(), []);
  const overview = overviewQuery.data;
  const overviewData = summary.overviewQuery.data;

  const result = useMemo(() => {
    const stats = buildBadgeStats({
      sessions: summary.sessions,
      streakDays: overview?.currentStreak ?? currentStreak(summary.sessions, now),
      hydrationLogs: overviewData?.hydrationLogs ?? [],
      goalGlasses: overviewData?.dailyWaterGoal ?? 14,
      challengeDays: overview?.challenge?.completedDays ?? 0,
      today: now,
    });
    return buildShelves(overview?.badges ?? [], stats);
  }, [now, overview, overviewData, summary.sessions]);

  return {
    ...result,
    overview,
    summary,
    isLoading: overviewQuery.isLoading || summary.isLoading,
    error: overviewQuery.error || summary.error || null,
    refetchAll: () =>
      Promise.all([overviewQuery.refetch(), summary.refetchAll()]),
  };
}
