import {useQuery} from '@tanstack/react-query';
import {fetchWorkoutLibrary} from '@app/services/supabase/fitness';

export function useWorkoutLibrary() {
  return useQuery({
    queryKey: ['workouts', 'library'],
    queryFn: fetchWorkoutLibrary,
  });
}
