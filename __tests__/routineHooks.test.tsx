import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('../src/services/routines/routinesService', () => {
  const actual = jest.requireActual('../src/services/routines/routinesService');
  return {
    ...actual,
    routinesService: {
      getRoutine: jest.fn(),
      listRoutines: jest.fn(),
      saveRoutine: jest.fn(),
      updateRoutine: jest.fn(),
      deleteRoutine: jest.fn(),
      getTodaySuggestion: jest.fn(),
    },
  };
});
jest.mock('../src/hooks/useAuth', () => ({ useAuth: () => ({ profile: { id: 'u1' } }) }));
jest.mock('../src/lib/media/mediaUrls', () => ({ prefetchMediaKeys: jest.fn(async () => undefined) }));
jest.mock('../src/hooks/useUserFavorites', () => ({ favoritesKey: (userId?: string) => ['favorites', userId] }));
jest.mock('../src/services/supabase/gamification', () => ({
  awardGamificationEventBestEffort: jest.fn(async () => null),
}));

import {
  routineKeys,
  useRoutine,
  useRoutineList,
  useRoutineMutations,
} from '../src/hooks/useRoutines';
import { RoutineError, routinesService } from '../src/services/routines/routinesService';
import type { Workout } from '../src/shared';

const service = routinesService as unknown as Record<keyof typeof routinesService, jest.Mock>;

const workout = (id: string, title = id): Workout => ({
  id,
  title,
  type: 'strength',
  duration: 30,
  difficulty: 'beginner',
  calories: 200,
  targetMuscles: [],
  exercises: [{ id: `${id}-te`, exerciseId: 'e1', name: 'Sentadilla', restTime: 60, block: 'main' }],
  isPremium: false,
  isMine: true,
  canEdit: true,
});

const settle = async () => {
  for (let i = 0; i < 12; i += 1) {
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  }
};

const mounted: Array<{ client: QueryClient; renderer: ReactTestRenderer.ReactTestRenderer }> = [];

// gcTime Infinity: no garbage-collection timers keep Jest alive.
const newClient = (retry = false) =>
  new QueryClient({
    defaultOptions: {
      queries: { retry, gcTime: Infinity },
      mutations: { gcTime: Infinity },
    },
  });

function mount<T>(hook: () => T, client = newClient()) {
  let value: T | null = null;
  const Probe = () => {
    value = hook();
    return null;
  };
  let renderer: ReactTestRenderer.ReactTestRenderer | null = null;
  act(() => {
    renderer = ReactTestRenderer.create(
      <QueryClientProvider client={client}>
        <Probe />
      </QueryClientProvider>,
    );
  });
  mounted.push({ client, renderer: renderer! });
  return { client, current: () => value as T };
}

// No query timers left behind (Jest exits).
afterEach(() => {
  mounted.splice(0).forEach(({ client, renderer }) => {
    act(() => renderer.unmount());
    client.clear();
  });
});

beforeEach(() => {
  Object.values(service).forEach(fn => fn.mockReset());
});

describe('detail and "Comenzar" read get_routine (B-03)', () => {
  it('asks get_routine even when the routine is in a cached list', async () => {
    service.getRoutine.mockResolvedValue(workout('mine-1', 'Mi rutina'));
    const client = newClient();
    // The list has it (possibly old): it is not used.
    client.setQueryData(routineKeys.list('u1', 'all'), {
      pages: [{ items: [workout('mine-1', 'Título viejo')], nextCursor: null }],
      pageParams: [null],
    });
    const probe = mount(() => useRoutine('mine-1'), client);
    await act(settle);
    expect(service.getRoutine).toHaveBeenCalledWith('mine-1');
    expect(probe.current().data?.title).toBe('Mi rutina');
  });

  it('asks again every time the screen opens (fresh data for Comenzar)', async () => {
    service.getRoutine.mockResolvedValue(workout('r1'));
    const client = newClient();
    client.setQueryData(routineKeys.detail('r1'), workout('r1', 'En caché'));
    mount(() => useRoutine('r1'), client);
    await act(settle);
    expect(service.getRoutine).toHaveBeenCalledTimes(1);
  });

  it('routine_not_found → notFound (the error state), without retrying', async () => {
    service.getRoutine.mockRejectedValue(new RoutineError('routine_not_found'));
    const probe = mount(() => useRoutine('gone'), newClient(true));
    await act(settle);
    expect(probe.current()).toMatchObject({ notFound: true, data: null });
    expect(service.getRoutine).toHaveBeenCalledTimes(1);
  });
});

describe('list_routines with cursor', () => {
  it('asks the next page with next_cursor and stops at null', async () => {
    service.listRoutines.mockImplementation(async ({ cursor }: { cursor: string | null }) =>
      cursor === null
        ? { items: [workout('a'), workout('b')], nextCursor: 'c1' }
        : { items: [workout('c')], nextCursor: null },
    );
    const probe = mount(() => useRoutineList('mine'));
    await act(settle);
    expect(probe.current().items.map(item => item.id)).toEqual(['a', 'b']);
    expect(probe.current().hasNextPage).toBe(true);
    await act(async () => {
      await probe.current().fetchNextPage();
      await settle();
    });
    expect(service.listRoutines.mock.calls.map(call => call[0])).toEqual([
      { scope: 'mine', limit: 50, cursor: null },
      { scope: 'mine', limit: 50, cursor: 'c1' },
    ]);
    expect(probe.current().items.map(item => item.id)).toEqual(['a', 'b', 'c']);
    expect(probe.current().hasNextPage).toBe(false);
  });

  it('`exhaust` reads every page (counts per type on the root)', async () => {
    service.listRoutines.mockImplementation(async ({ cursor }: { cursor: string | null }) => ({
      items: [workout(cursor ?? 'p0')],
      nextCursor: cursor === null ? 'p1' : cursor === 'p1' ? 'p2' : null,
    }));
    const probe = mount(() => useRoutineList('all', { exhaust: true }));
    for (let round = 0; round < 10; round += 1) {
      await act(settle);
    }
    expect(probe.current().items.map(item => item.id)).toEqual(['p0', 'p1', 'p2']);
  });
});

describe('after saving, editing or deleting', () => {
  it('drops list_routines and today\'s suggestion, and keeps the saved routine as its detail', async () => {
    service.saveRoutine.mockResolvedValue({ routine: workout('new'), replayed: false });
    service.deleteRoutine.mockResolvedValue({ archived: true });
    const client = newClient();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const probe = mount(() => useRoutineMutations(), client);
    await act(async () => {
      await probe.current().createRoutine({
        title: 'Nueva', type: 'strength', difficulty: 'beginner', duration: 30, calories: 100, targetMuscles: [],
        exercises: [{ exerciseId: 'e1' }],
      });
    });
    expect(client.getQueryData(routineKeys.detail('new'))).toMatchObject({ id: 'new' });
    const keys = invalidate.mock.calls.map(call => call[0]?.queryKey);
    expect(keys).toEqual(expect.arrayContaining([routineKeys.lists, routineKeys.today]));
    let result: { archived: boolean } | null = null;
    await act(async () => {
      result = await probe.current().deleteRoutine('new');
    });
    expect(result).toEqual({ archived: true });
    expect(client.getQueryData(routineKeys.detail('new'))).toBeUndefined();
  });
});
