import { useEffect, useMemo } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { deviceTimezone } from '@app/features/profile/timezoneSync';
import { useAuth } from '@app/hooks/useAuth';
import { favoritesKey } from '@app/hooks/useUserFavorites';
import { getLocalDateKey } from '@app/lib/date';
import { prefetchMediaKeys } from '@app/lib/media/mediaUrls';
import { awardGamificationEventBestEffort } from '@app/services/supabase/gamification';
import {
  RoutineError,
  routinesService,
  type RoutineInput,
  type RoutineScopeParam,
} from '@app/services/routines/routinesService';
import type { Workout } from '@app/shared';

// Routines through the RPCs of docs/backend/ROUTINES_SHAPES.md. The detail
// and "Comenzar" always read get_routine(id), never a cached list (B-03).

export const routineKeys = {
  all: ['routines'] as const,
  detail: (id: string) => ['routines', 'detail', id] as const,
  lists: ['routines', 'list'] as const,
  list: (userId: string | undefined, scope: RoutineScopeParam) =>
    ['routines', 'list', userId ?? 'guest', scope] as const,
  categoryList: (userId: string | undefined, scope: RoutineScopeParam, category: string) =>
    ['routines', 'list', userId ?? 'guest', scope, category] as const,
  categories: (userId: string | undefined) =>
    ['routines', 'categories', userId ?? 'guest'] as const,
  today: ['routines', 'today'] as const,
};

const LIST_PAGE_SIZE = 50;

export function useRoutineCategories() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: routineKeys.categories(profile?.id),
    enabled: Boolean(profile?.id),
    queryFn: () => routinesService.listRoutineCategories(),
  });
}

// get_routine. routine_not_found is an answer (null), not an error to retry.
export function useRoutine(
  id: string | null | undefined,
  options: { refetchOnMount?: boolean | 'always' } = {},
) {
  const query = useQuery({
    queryKey: routineKeys.detail(id ?? ''),
    enabled: Boolean(id),
    refetchOnMount: options.refetchOnMount ?? 'always',
    retry: (count, error) =>
      !(error instanceof RoutineError && error.code === 'routine_not_found') && count < 1,
    queryFn: async (): Promise<Workout | null> => {
      try {
        const routine = await routinesService.getRoutine(id!);
        prefetchMediaKeys(routine.exercises.map(exercise => exercise.thumbKey)).catch(
          () => undefined,
        );
        return routine;
      } catch (error) {
        if (error instanceof RoutineError && error.code === 'routine_not_found') {
          return null;
        }
        throw error;
      }
    },
  });
  return { ...query, notFound: query.isSuccess && query.data === null };
}

// list_routines (newest first, archived ones never come). `exhaust` keeps
// asking for the next page until the end: the root of Entrenos counts
// collections over every routine, and category lists read all matches.
export function useRoutineList(
  scope: RoutineScopeParam,
  options: { exhaust?: boolean; enabled?: boolean; category?: string } = {},
) {
  const { profile } = useAuth();
  const userId = profile?.id;
  const query = useInfiniteQuery({
    queryKey: options.category
      ? routineKeys.categoryList(userId, scope, options.category)
      : routineKeys.list(userId, scope),
    enabled: Boolean(userId) && options.enabled !== false,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const page = await routinesService.listRoutines({
        scope,
        limit: LIST_PAGE_SIZE,
        cursor: pageParam,
        ...(options.category ? { category: options.category } : {}),
      });
      // One signing call per page, before the rows ask for their thumbs.
      prefetchMediaKeys(page.items.map(item => item.thumbKey)).catch(() => undefined);
      return page;
    },
    getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
  });

  const { hasNextPage, isFetchingNextPage, fetchNextPage, isError } = query;
  // The page count is a dependency too: a page can arrive without a render in
  // between where isFetchingNextPage was true.
  const pageCount = query.data?.pages.length ?? 0;
  useEffect(() => {
    if (options.exhaust && hasNextPage && !isFetchingNextPage && !isError) {
      fetchNextPage().catch(() => undefined);
    }
  }, [fetchNextPage, hasNextPage, isError, isFetchingNextPage, options.exhaust, pageCount]);

  const items = useMemo(
    () => (query.data?.pages ?? []).flatMap(page => page.items),
    [query.data],
  );
  return { ...query, items };
}

// get_today_suggestion with the device's zone. One answer per local day
// (the server keeps it for the whole day); saving a session drops it.
export function useTodaySuggestion(enabled = true) {
  const { profile } = useAuth();
  const userId = profile?.id;
  const tz = deviceTimezone();
  const day = getLocalDateKey();
  return useQuery({
    queryKey: [...routineKeys.today, userId ?? 'guest', day, tz ?? ''],
    enabled: Boolean(userId) && enabled,
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
    queryFn: () => routinesService.getTodaySuggestion(tz),
  });
}

// After saving, editing or deleting a routine: the lists and today's
// suggestion.
export async function invalidateRoutineLists(queryClient: QueryClient) {
  await Promise.allSettled([
    queryClient.invalidateQueries({ queryKey: routineKeys.lists }),
    queryClient.invalidateQueries({ queryKey: ['routines', 'categories'] }),
    queryClient.invalidateQueries({ queryKey: routineKeys.today }),
  ]);
}

export function useRoutineMutations() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const userId = profile?.id;

  const afterWrite = (routine: Workout) => {
    queryClient.setQueryData(routineKeys.detail(routine.id), routine);
    invalidateRoutineLists(queryClient).catch(() => undefined);
  };

  const create = useMutation({
    mutationFn: (input: RoutineInput) =>
      routinesService.saveRoutine(input, { origin: 'user' }),
    onSuccess: result => {
      afterWrite(result.routine);
      // Points and the first_custom_workout medal (idempotent per routine id).
      awardGamificationEventBestEffort({
        source: 'routine-create',
        eventType: 'custom_workout_created',
        referenceId: result.routine.id,
        points: 150,
        badgeIds: ['first_custom_workout'],
        metadata: { workoutId: result.routine.id, title: result.routine.title, source: 'custom' },
      }).catch(() => undefined);
    },
  });

  const update = useMutation({
    mutationFn: (params: { id: string; input: RoutineInput }) =>
      routinesService.updateRoutine(params.id, params.input),
    onSuccess: afterWrite,
  });

  const remove = useMutation({
    mutationFn: (id: string) => routinesService.deleteRoutine(id),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: routineKeys.detail(id) });
      invalidateRoutineLists(queryClient).catch(() => undefined);
      // The server also takes it out of favourites.
      queryClient.invalidateQueries({ queryKey: favoritesKey(userId) }).catch(() => undefined);
    },
  });

  return {
    createRoutine: create.mutateAsync,
    isCreating: create.isPending,
    updateRoutine: update.mutateAsync,
    isUpdating: update.isPending,
    deleteRoutine: remove.mutateAsync,
    isDeleting: remove.isPending,
  };
}
