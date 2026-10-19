import { useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  keepPreviousData,
  useInfiniteQuery,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useAuth } from '@app/hooks/useAuth';
import { useProfileLanguage } from '@app/hooks/useProfileLanguage';
import { createCatalogCache } from '@app/lib/catalog/catalogCache';
import {
  INITIAL_STREAM_STATE,
  flattenUnique,
  nextMergedPage,
  streamPageSize,
  streamsFor,
  type ExerciseBrowseFilters,
  type StreamState,
} from '@app/lib/catalog/exerciseStreams';
import { mediaUrls, prefetchMediaKeys } from '@app/lib/media/mediaUrls';
import { catalogPerf } from '@app/lib/perf/catalogPerf';
import {
  catalogService,
  type CatalogLocale,
} from '@app/services/catalog/catalogService';
import type { LibraryExercise } from '@app/shared';

// The exercise catalog, page by page (list_exercises) and one exercise at a
// time (get_exercise), kept on the phone per catalog_version().

export const catalogCache = createCatalogCache({ storage: AsyncStorage });

export const catalogKeys = {
  all: ['catalog'] as const,
  version: ['catalog', 'version'] as const,
  browse: (locale: CatalogLocale, filters: ExerciseBrowseFilters) =>
    [
      'catalog',
      'browse',
      locale,
      filters.zone ?? '',
      [...filters.equipment].sort().join(','),
      filters.level ?? '',
      filters.q.trim().toLowerCase(),
    ] as const,
  exercise: (locale: CatalogLocale, id: string) => ['catalog', 'exercise', locale, id] as const,
};

export function useCatalogLocale(): CatalogLocale {
  return useProfileLanguage();
}

// catalog_version() once per launch (with a session). A new version drops the
// saved catalog and the pages on screen ask again.
export function useCatalogVersion() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: catalogKeys.version,
    enabled: Boolean(profile?.id),
    staleTime: Infinity,
    queryFn: async () => {
      const result = await catalogService.catalogVersion();
      const changed = await catalogCache.applyVersion(result.version, result.exercises);
      if (changed) {
        queryClient
          .invalidateQueries({
            queryKey: catalogKeys.all,
            predicate: query => query.queryKey[1] !== 'version',
          })
          .catch(() => undefined);
      }
      return result;
    },
  });
}

// Mounted once at the root: reads the saved catalog and URLs from the phone
// and checks the version.
export function useCatalogBoot(): void {
  useEffect(() => {
    catalogCache.load().catch(() => undefined);
    mediaUrls.hydrate().catch(() => undefined);
  }, []);
  useCatalogVersion();
}

// Total of exercises of the catalog ("Buscar entre 582 ejercicios").
export function useCatalogTotal(): number | null {
  const version = useCatalogVersion();
  return version.data?.exercises ?? catalogCache.exerciseCount();
}

const listId = (
  locale: CatalogLocale,
  query: { muscles: string[] | null; equipments: string[] | null; level: string | null; q: string },
  cursor: string | null,
  limit: number,
) =>
  `list:${locale}:${query.muscles ? query.muscles.join('+') : '*'}:${
    query.equipments ? query.equipments.join('+') : '*'
  }:${query.level ?? '*'}:${query.q
    .trim()
    .toLowerCase()}:${cursor ?? '0'}:${limit}`;

export type ExerciseBrowsePage = {
  items: LibraryExercise[];
  state: StreamState;
  hasMore: boolean;
};

// list_exercises with infinite scroll: 30 per page, filters and search on the
// server. Several muscles (a zone) or equipments are merged in name order.
export function useExerciseBrowse(
  filters: ExerciseBrowseFilters,
  options: { enabled?: boolean } = {},
) {
  const { profile } = useAuth();
  const locale = useCatalogLocale();
  const streams = useMemo(
    () => streamsFor(filters),
    // The key below is the identity of the filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters.zone, filters.equipment.join(',')],
  );
  const limit = streamPageSize(streams.length);

  const query = useInfiniteQuery({
    queryKey: catalogKeys.browse(locale, filters),
    enabled: Boolean(profile?.id) && options.enabled !== false,
    staleTime: Infinity,
    // While a new search or filter loads, the previous rows stay.
    placeholderData: keepPreviousData,
    initialPageParam: INITIAL_STREAM_STATE,
    queryFn: async ({ pageParam }): Promise<ExerciseBrowsePage> => {
      const page = await nextMergedPage(
        streams,
        pageParam,
        (stream, cursor) => {
          const args = {
            muscles: stream.muscles,
            equipments: stream.equipments,
            level: filters.level,
            q: filters.q,
          };
          let asked = false;
          const ask = () => {
            asked = true;
            return catalogService
              .listExercises({
                muscles: args.muscles,
                equipments: args.equipments,
                difficulty: args.level,
                q: args.q,
                locale,
                cursor,
                limit,
              })
              .then(result => ({ items: result.items, nextCursor: result.nextCursor }));
          };
          // Searches are not kept on the phone (each one is different).
          if (args.q.trim()) {
            return ask();
          }
          return catalogCache.cached(listId(locale, args, cursor, limit), ask).then(result => {
            if (!asked) {
              catalogPerf.fromDisk('list_exercises');
            }
            return result;
          });
        },
        locale,
      );
      // One signing call for the thumbs of the page.
      prefetchMediaKeys(page.items.map(item => item.thumbKey)).catch(() => undefined);
      return page;
    },
    getNextPageParam: lastPage => (lastPage.hasMore ? lastPage.state : undefined),
  });

  const items = useMemo(() => flattenUnique(query.data?.pages ?? []), [query.data]);
  return { ...query, items };
}

const exerciseQuery = (locale: CatalogLocale, id: string) => ({
  queryKey: catalogKeys.exercise(locale, id),
  staleTime: Infinity,
  queryFn: () =>
    catalogCache.cached(`exercise:${locale}:${id}`, () => catalogService.getExercise(id, locale)),
});

// Several exercises by id outside a render (an answer that brings ids):
// get_exercise each, from the phone when already there. Missing ones are left
// out.
export async function loadExercises(
  ids: readonly string[],
  locale: CatalogLocale,
): Promise<LibraryExercise[]> {
  const results = await Promise.allSettled(
    ids.map(id =>
      catalogCache.cached(`exercise:${locale}:${id}`, () => catalogService.getExercise(id, locale)),
    ),
  );
  return results.flatMap(result => (result.status === 'fulfilled' ? [result.value] : []));
}

// get_exercise (the detail).
export function useExercise(id: string | null | undefined) {
  const locale = useCatalogLocale();
  return useQuery({
    ...exerciseQuery(locale, id ?? ''),
    enabled: Boolean(id),
  });
}

// Several exercises by id (machine scan, routine detail pills, names).
export function useExercises(ids: readonly (string | null | undefined)[]) {
  const locale = useCatalogLocale();
  const unique = useMemo(
    () => [...new Set(ids.filter((id): id is string => Boolean(id)))],
    // A new array with the same ids is the same request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ids.join(',')],
  );
  const results = useQueries({
    queries: unique.map(id => exerciseQuery(locale, id)),
  });
  const byId = useMemo(() => {
    const map: Record<string, LibraryExercise> = {};
    results.forEach(result => {
      if (result.data) {
        map[result.data.id] = result.data;
      }
    });
    return map;
    // results is a new array on every render; its data is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results.map(result => result.dataUpdatedAt).join(',')]);
  return {
    byId,
    isLoading: results.some(result => result.isLoading),
    error: results.find(result => result.error)?.error ?? null,
    refetch: () => Promise.all(results.map(result => result.refetch())),
  };
}

// Names of exercises by id (records, summary, ELLIE). Never blocks a screen:
// while loading the caller shows its fallback.
export function useExerciseNames(ids: readonly (string | null | undefined)[]) {
  const exercises = useExercises(ids);
  const names = useMemo(() => {
    const map: Record<string, string> = {};
    Object.values(exercises.byId).forEach(exercise => {
      map[exercise.id] = exercise.name;
    });
    return map;
  }, [exercises.byId]);
  return { ...exercises, names };
}
