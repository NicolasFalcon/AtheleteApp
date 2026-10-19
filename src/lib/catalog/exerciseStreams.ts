import type { LibraryExercise } from '@app/shared/data/exercises';
import type {
  EquipmentKey,
  LevelKey,
  ZoneKey,
} from '@app/features/workouts/workoutsModel';

// list_exercises takes the muscles of a zone (`_muscles`, Lote 2) and the
// equipments selected in Filtros (`_equipments`, Lote 3) as lists: an
// exercise enters if it works any of those muscles and uses any of those
// equipments. So every combination of filters is ONE paginated call (one
// "stream"). The merge of several streams below stays as a general tool.

// Zones → muscles.slug (the inverse of muscleGroupToBodyPart).
export const ZONE_MUSCLES: Record<ZoneKey, string[]> = {
  chest: ['chest'],
  back: ['back'],
  shoulders: ['shoulders', 'trapezius', 'neck'],
  arms: ['biceps', 'triceps', 'forearms'],
  core: ['core', 'lower-back'],
  legs: ['quadriceps', 'hamstrings', 'calves', 'adductors', 'tibialis'],
  glutes: ['glutes'],
};

// Equipment chips → equipment.slug.
export const EQUIPMENT_SLUGS: Record<EquipmentKey, string> = {
  bodyweight: 'bodyweight',
  dumbbells: 'dumbbell',
  barbell: 'barbell',
  cable: 'cable-machine',
  machines: 'machine',
};

export type ExerciseBrowseFilters = {
  zone: ZoneKey | null;
  equipment: EquipmentKey[];
  level: LevelKey | null;
  q: string;
};

export type ExerciseStream = {
  key: string;
  muscles: string[] | null;
  equipments: string[] | null;
};

export function streamsFor(filters: Pick<ExerciseBrowseFilters, 'zone' | 'equipment'>): ExerciseStream[] {
  const muscles = filters.zone ? ZONE_MUSCLES[filters.zone] : null;
  const equipments =
    filters.equipment.length > 0
      ? [...new Set(filters.equipment.map(key => EQUIPMENT_SLUGS[key]))].sort()
      : null;
  return [
    {
      key: `${muscles ? muscles.join('+') : '*'}|${equipments ? equipments.join('+') : '*'}`,
      muscles,
      equipments,
    },
  ];
}

// 30 per page with one stream; with several, each asks for less (≥ 10).
export function streamPageSize(count: number, target = 30): number {
  return count <= 1 ? target : Math.max(10, Math.ceil(target / count));
}

export type StreamState = {
  // Cursor of the next page of each stream; null = first page.
  cursors: Record<string, string | null>;
  done: Record<string, boolean>;
  // Items fetched and not shown yet, in the stream's own (name) order.
  buffers: Record<string, LibraryExercise[]>;
};

export const INITIAL_STREAM_STATE: StreamState = { cursors: {}, done: {}, buffers: {} };

export type StreamFetch = (
  stream: ExerciseStream,
  cursor: string | null,
) => Promise<{ items: LibraryExercise[]; nextCursor: string | null }>;

// One page: one call per stream that has nothing buffered, then a merge in
// name order that stops when a stream that still has pages runs out of
// buffered items (its next item could come before the rest).
export async function nextMergedPage(
  streams: ExerciseStream[],
  state: StreamState,
  fetchPage: StreamFetch,
  locale: string,
): Promise<{ items: LibraryExercise[]; state: StreamState; hasMore: boolean }> {
  const cursors = { ...state.cursors };
  const done = { ...state.done };
  const buffers: Record<string, LibraryExercise[]> = {};
  streams.forEach(stream => {
    buffers[stream.key] = [...(state.buffers[stream.key] ?? [])];
  });

  await Promise.all(
    streams
      .filter(stream => !done[stream.key] && buffers[stream.key].length === 0)
      .map(async stream => {
        const page = await fetchPage(stream, cursors[stream.key] ?? null);
        buffers[stream.key].push(...page.items);
        cursors[stream.key] = page.nextCursor;
        done[stream.key] = page.nextCursor === null;
      }),
  );

  const items: LibraryExercise[] = [];
  const seen = new Set<string>();
  for (;;) {
    const live = streams.filter(stream => buffers[stream.key].length > 0);
    if (live.length === 0) {
      break;
    }
    // A stream with more pages and an empty buffer: stop here.
    if (streams.some(stream => !done[stream.key] && buffers[stream.key].length === 0)) {
      break;
    }
    let pick = live[0];
    live.forEach(stream => {
      if (buffers[stream.key][0].name.localeCompare(buffers[pick.key][0].name, locale) < 0) {
        pick = stream;
      }
    });
    const item = buffers[pick.key].shift()!;
    if (!seen.has(item.id)) {
      seen.add(item.id);
      items.push(item);
    }
  }

  const hasMore = streams.some(stream => !done[stream.key] || buffers[stream.key].length > 0);
  return { items, state: { cursors, done, buffers }, hasMore };
}

// Every page flattened, without repeats (an exercise can be in two streams).
export function flattenUnique(pages: { items: LibraryExercise[] }[]): LibraryExercise[] {
  const seen = new Set<string>();
  const result: LibraryExercise[] = [];
  pages.forEach(page =>
    page.items.forEach(item => {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        result.push(item);
      }
    }),
  );
  return result;
}
