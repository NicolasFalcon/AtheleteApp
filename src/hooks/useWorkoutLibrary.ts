import {useQuery} from '@tanstack/react-query';
import {useAuth} from '@app/hooks/useAuth';
import {fetchWorkoutLibrary} from '@app/services/supabase/fitness';

export function useWorkoutLibrary() {
  const {profile} = useAuth();

  return useQuery({
    queryKey: ['workouts', 'library', profile?.id ?? 'guest'],
    queryFn: async () => fetchWorkoutLibrary(profile?.id),
  });
}
