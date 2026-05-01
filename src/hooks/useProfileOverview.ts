import {useQuery} from '@tanstack/react-query';
import {useAuth} from '@app/hooks/useAuth';
import {fetchProfileOverview} from '@app/services/supabase/profile-overview';

export function useProfileOverview() {
  const {profile} = useAuth();

  return useQuery({
    queryKey: ['profile', 'overview', profile?.id],
    enabled: Boolean(profile?.id),
    queryFn: async () => fetchProfileOverview(profile!.id),
  });
}
