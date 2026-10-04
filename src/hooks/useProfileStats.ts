import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@app/hooks/useAuth';
import { fetchProfileStats } from '@app/services/supabase/profile-stats';

export function useProfileStats() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['profile', 'stats', profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: () => fetchProfileStats(profile!.id),
  });
}
