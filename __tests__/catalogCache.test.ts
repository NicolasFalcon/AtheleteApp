import { createCatalogCache } from '../src/lib/catalog/catalogCache';
import {
  INITIAL_STREAM_STATE,
  flattenUnique,
  nextMergedPage,
  streamPageSize,
  streamsFor,
  type ExerciseStream,
} from '../src/lib/catalog/exerciseStreams';
import {
  createCatalogService,
  mapExerciseDetail,
  mapExerciseListItem,
} from '../src/services/catalog/catalogService';
import type { LibraryExercise } from '../src/shared';

// An AsyncStorage stand-in shared by two "launches" of the app.
function memoryStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: jest.fn(async (key: string) => data.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      data.set(key, value);
    }),
  };
}
const flush = () => new Promise<void>(resolve => setTimeout(resolve, 900));

describe('catalog kept on the phone per catalog_version()', () => {
  it('second launch with the same version: no request', async () => {
    const storage = memoryStorage();
    const fetchPage = jest.fn(async () => ({ items: ['a', 'b'], nextCursor: 'c1' }));

    const first = createCatalogCache({ storage });
    await first.applyVersion('v1', 582);
    expect(await first.cached('list:es:*', fetchPage)).toEqual({ items: ['a', 'b'], nextCursor: 'c1' });
    await flush();

    const second = createCatalogCache({ storage });
    expect(await second.cached('list:es:*', fetchPage)).toEqual({ items: ['a', 'b'], nextCursor: 'c1' });
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(await second.applyVersion('v1', 582)).toBe(false);
    expect(await second.cached('list:es:*', fetchPage)).toBeDefined();
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(second.exerciseCount()).toBe(582);
  });

  it('a new version drops what was saved and asks again', async () => {
    const storage = memoryStorage();
    const fetchPage = jest.fn(async () => ({ items: [], nextCursor: null }));
    const first = createCatalogCache({ storage });
    await first.applyVersion('v1', 582);
    await first.cached('exercise:es:e1', fetchPage);
    await flush();

    const second = createCatalogCache({ storage });
    expect(await second.applyVersion('v2', 590)).toBe(true);
    await second.cached('exercise:es:e1', fetchPage);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('first launch: what is downloaded before the version arrives is kept', async () => {
    const cache = createCatalogCache({ storage: memoryStorage() });
    const fetchPage = jest.fn(async () => 'page');
    await cache.cached('list:es:*', fetchPage);
    expect(await cache.applyVersion('v1', 582)).toBe(false);
    await cache.cached('list:es:*', fetchPage);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('two screens asking the same page at once share one request', async () => {
    const cache = createCatalogCache();
    const fetchPage = jest.fn(async () => 'page');
    await Promise.all([cache.cached('p', fetchPage), cache.cached('p', fetchPage)]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});

const exercise = (id: string, name: string): LibraryExercise =>
  mapExerciseListItem({ id, name, slug: id, difficulty: 'beginner', primary_muscle: 'chest', equipment: ['dumbbell'], thumb_key: `movekit/thumbs/${id}.webp` }, 'es');

describe('list_exercises pages (cursor)', () => {
  it('one stream: 30 per page following next_cursor until null', async () => {
    const pages: Record<string, { items: LibraryExercise[]; nextCursor: string | null }> = {
      start: { items: [exercise('1', 'A'), exercise('2', 'B')], nextCursor: 'c1' },
      c1: { items: [exercise('3', 'C')], nextCursor: null },
    };
    const fetchPage = jest.fn(async (_stream: ExerciseStream, cursor: string | null) => pages[cursor ?? 'start']);
    const streams = streamsFor({ zone: 'chest', equipment: [] });
    expect(streams).toEqual([{ key: 'chest|*', muscles: ['chest'], equipments: null }]);
    expect(streamPageSize(streams.length)).toBe(30);

    const first = await nextMergedPage(streams, INITIAL_STREAM_STATE, fetchPage, 'es');
    expect(first.items.map(item => item.id)).toEqual(['1', '2']);
    expect(first.hasMore).toBe(true);
    const second = await nextMergedPage(streams, first.state, fetchPage, 'es');
    expect(fetchPage.mock.calls.map(call => call[1])).toEqual([null, 'c1']);
    expect(second.items.map(item => item.id)).toEqual(['3']);
    expect(second.hasMore).toBe(false);
  });

  it('a zone of several muscles is ONE call with all its muscles (_muscles)', () => {
    expect(streamsFor({ zone: 'arms', equipment: [] })).toEqual([
      { key: 'biceps+triceps+forearms|*', muscles: ['biceps', 'triceps', 'forearms'], equipments: null },
    ]);
    expect(streamsFor({ zone: 'legs', equipment: [] })).toHaveLength(1);
    expect(streamsFor({ zone: null, equipment: [] })).toEqual([{ key: '*|*', muscles: null, equipments: null }]);
  });

  it('several equipments are ONE call too (_equipments)', () => {
    expect(streamsFor({ zone: 'arms', equipment: ['dumbbells', 'barbell', 'cable'] })).toEqual([
      {
        key: 'biceps+triceps+forearms|barbell+cable-machine+dumbbell',
        muscles: ['biceps', 'triceps', 'forearms'],
        equipments: ['barbell', 'cable-machine', 'dumbbell'],
      },
    ]);
    expect(streamPageSize(1)).toBe(30);
  });

  it('the general merge of several streams keeps name order without repeats', async () => {
    const data: Record<string, Record<string, { items: LibraryExercise[]; nextCursor: string | null }>> = {
      dumbbell: {
        start: { items: [exercise('b1', 'Curl'), exercise('x', 'Dominada')], nextCursor: 'b-c1' },
        'b-c1': { items: [exercise('b3', 'Martillo')], nextCursor: null },
      },
      barbell: { start: { items: [exercise('t1', 'Copa'), exercise('x', 'Dominada'), exercise('t2', 'Fondos')], nextCursor: null } },
      'cable-machine': { start: { items: [], nextCursor: null } },
    };
    const fetchPage = jest.fn(async (stream: ExerciseStream, cursor: string | null) => data[stream.key][cursor ?? 'start']);
    const streams: ExerciseStream[] = ['dumbbell', 'barbell', 'cable-machine'].map(key => ({
      key,
      muscles: null,
      equipments: [key],
    }));

    const first = await nextMergedPage(streams, INITIAL_STREAM_STATE, fetchPage, 'es');
    // Stops when dumbbell (more pages) runs out of buffered rows.
    expect(first.items.map(item => item.name)).toEqual(['Copa', 'Curl', 'Dominada']);
    const second = await nextMergedPage(streams, first.state, fetchPage, 'es');
    expect(second.items.map(item => item.name)).toEqual(['Dominada', 'Fondos', 'Martillo']);
    expect(second.hasMore).toBe(false);
    expect(flattenUnique([first, second]).map(item => item.id)).toEqual(['t1', 'b1', 'x', 't2', 'b3']);
  });

  it('list_exercises arguments and mapping', async () => {
    const rpc = jest.fn(async () => ({
      ok: true,
      locale: 'es',
      items: [{ id: 'e1', slug: 'press', name: 'Press banca', difficulty: 'intermediate', primary_muscle: 'chest', equipment: ['bench', 'barbell'], thumb_key: 'movekit/thumbs/press.webp' }],
      next_cursor: 'c1',
    }));
    const page = await createCatalogService(rpc).listExercises({
      muscles: ['biceps', 'triceps'],
      equipments: ['dumbbell', 'barbell'],
      q: ' press ',
      locale: 'es',
      cursor: 'c0',
    });
    expect(rpc).toHaveBeenCalledWith('list_exercises', {
      _muscle: null, _equipment: null, _pattern: null, _difficulty: null, _q: 'press', _locale: 'es', _cursor: 'c0', _limit: 30,
      _muscles: ['biceps', 'triceps'],
      _equipments: ['dumbbell', 'barbell'],
    });
    expect(page.nextCursor).toBe('c1');
    expect(page.items[0]).toMatchObject({ name: 'Press banca', bodyPart: 'chest', equipment: 'barbell', thumbKey: 'movekit/thumbs/press.webp', musclesWorked: { primary: ['Pecho'] } });
  });

  it('get_exercise media: poster and video keys for the detail, thumb for lists', () => {
    const detail = mapExerciseDetail({
      id: 'e1', slug: 'press', difficulty: 'advanced', locale: 'en', name: 'Bench press', instructions: ['Press'],
      muscles: [{ slug: 'chest', role: 'primary', name: 'Chest' }, { slug: 'triceps', role: 'secondary', name: 'Triceps' }],
      equipment: [{ slug: 'barbell', name: 'Barbell' }],
      media: [
        { kind: 'video', key: 'movekit/videos/press.mp4', width: 720, height: 1280 },
        { kind: 'poster', key: 'movekit/posters/press.jpg', width: 1080, height: 1920 },
        { kind: 'thumb', key: 'movekit/thumbs/press.webp', width: 400, height: 223 },
      ],
    });
    expect(detail).toMatchObject({
      bodyPart: 'chest', equipment: 'barbell', orientation: 'portrait',
      videoKey: 'movekit/videos/press.mp4', posterKey: 'movekit/posters/press.jpg', thumbKey: 'movekit/thumbs/press.webp',
      musclesWorked: { primary: ['Chest'], secondary: ['Triceps'] }, howToPerform: ['Press'],
    });
  });
});
