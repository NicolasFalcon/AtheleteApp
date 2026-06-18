import { useInfiniteQuery } from '@tanstack/react-query';
import {
  fetchExerciseLibraryPage,
  type ExerciseLibraryPageParams,
} from '@app/services/supabase/fitness';

type Params = Omit<ExerciseLibraryPageParams, 'page'> & {
  enabled?: boolean;
};

export function usePaginatedExerciseLibrary(params: Params) {
  return useInfiniteQuery({
    queryKey: [
      'exercises',
      'browse',
      params.search,
      params.equipment,
      params.bodyPart,
      params.level,
      params.favoriteIds,
      params.pageSize,
    ],
    enabled: params.enabled !== false,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      fetchExerciseLibraryPage({ ...params, page: pageParam }),
    getNextPageParam: lastPage => lastPage.nextPage,
  });
}
