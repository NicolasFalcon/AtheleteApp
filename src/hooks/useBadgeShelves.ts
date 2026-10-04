import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { buildShelves } from '@app/features/progress/badgesModel';
import { useAuth } from '@app/hooks/useAuth';
import { useProfileOverview } from '@app/hooks/useProfileOverview';
import { fetchBadgeProgress } from '@app/services/supabase/badgeProgress';

// The medals with their progress, as the server measures them (BT-24):
// Logros and the Perfil showcase read the same thing.
export function useBadgeShelves() {
  const { profile } = useAuth();
  const overviewQuery = useProfileOverview();
  const progressQuery = useQuery({
    queryKey: ['progress', 'badges', profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: fetchBadgeProgress,
  });
  const overview = overviewQuery.data;

  const result = useMemo(() => {
    const earnedAt: Record<string, string | undefined> = {};
    (overview?.badges ?? []).forEach(badge => {
      earnedAt[badge.id] = badge.earnedAt;
    });
    return buildShelves(progressQuery.data ?? [], earnedAt);
  }, [overview?.badges, progressQuery.data]);

  return {
    ...result,
    overview,
    isLoading: overviewQuery.isLoading || progressQuery.isLoading,
    error: overviewQuery.error || progressQuery.error || null,
    refetchAll: () =>
      Promise.all([overviewQuery.refetch(), progressQuery.refetch()]),
  };
}
