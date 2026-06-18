import { useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '@app/hooks/useAuth';
import {
  fetchWorkoutLibraryPage,
  type WorkoutLibraryPageParams,
} from '@app/services/supabase/fitness';

type Params = Omit<WorkoutLibraryPageParams, 'page' | 'userId'> & {
  enabled?: boolean;
};

export function usePaginatedWorkoutLibrary(params: Params) {
  const { profile } = useAuth();
  const userId = profile?.id;

  return useInfiniteQuery({
    queryKey: [
      'workouts',
      'browse',
      userId ?? 'guest',
      params.source,
      params.search,
      params.type,
      params.favoriteIds,
      params.pageSize,
    ],
    enabled: params.enabled !== false,
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      fetchWorkoutLibraryPage({
        ...params,
        userId,
        page: pageParam,
      }),
    getNextPageParam: lastPage => lastPage.nextPage,
  });
}
