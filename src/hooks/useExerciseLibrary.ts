import {useQuery} from '@tanstack/react-query';
import {fetchExerciseLibrary} from '@app/services/supabase/fitness';

export function useExerciseLibrary() {
  return useQuery({
    queryKey: ['exercises', 'library', 'normalized-v1', 'es'],
    queryFn: fetchExerciseLibrary,
    // The signed poster URLs last about an hour: reuse the list for half of it.
    staleTime: 30 * 60_000,
  });
}
