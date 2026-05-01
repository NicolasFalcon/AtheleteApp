import {useQuery} from '@tanstack/react-query';
import {fetchExerciseLibrary} from '@app/services/supabase/fitness';

export function useExerciseLibrary() {
  return useQuery({
    queryKey: ['exercises', 'library'],
    queryFn: fetchExerciseLibrary,
  });
}
