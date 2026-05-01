import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
export type { LibraryExercise } from '@athelete/data/exercises';
export {
  bodyPartLabels,
  equipmentLabels,
  findExerciseByName,
  levelLabels,
  mapDbExerciseRow,
} from '@athelete/data/exercises';
import { mapDbExerciseRow, type LibraryExercise } from '@athelete/data/exercises';

export function useExercises() {
  const [exercises, setExercises] = useState<LibraryExercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchExercises() {
      setIsLoading(true);
      setError(null);

      let allRows: any[] = [];
      let from = 0;
      const pageSize = 500;
      let hasMore = true;

      while (hasMore) {
        const { data, error: fetchError } = await supabase
          .from('exercises')
          .select('*')
          .order('name')
          .range(from, from + pageSize - 1);

        if (fetchError) {
          if (!cancelled) {
            setError(fetchError.message);
            setIsLoading(false);
          }
          return;
        }

        allRows = allRows.concat(data || []);
        hasMore = (data?.length || 0) === pageSize;
        from += pageSize;
      }

      if (!cancelled) {
        setExercises(allRows.map(mapDbExerciseRow));
        setIsLoading(false);
      }
    }

    fetchExercises();
    return () => { cancelled = true; };
  }, []);

  return { exercises, isLoading, error };
}
