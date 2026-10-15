import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Meal, NutritionDay } from '../src/services/nutrition/mealsService';

jest.mock('../src/services/nutrition/mealsService', () => ({
  mealsService: {
    save: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    repeat: jest.fn(),
    getDay: jest.fn(),
    getRecent: jest.fn(),
  },
}));
jest.mock('../src/hooks/useAuth', () => ({ useAuth: () => ({ profile: { id: 'u1' } }) }));
jest.mock('../src/services/supabase/gamification', () => ({
  awardGamificationEventBestEffort: jest.fn(async () => null),
}));
jest.mock('../src/lib/queryInvalidation', () => ({ invalidateNutritionPlanQueries: jest.fn(async () => undefined) }));

import { mealKeys, useMealMutations } from '../src/hooks/useMeals';
import { mealsService } from '../src/services/nutrition/mealsService';

const mockService = mealsService as unknown as Record<'save' | 'update' | 'remove' | 'repeat' | 'getDay' | 'getRecent', jest.Mock>;

const meal = (id: string, kcal: number): Meal => ({
  id, localDate: '2026-10-15', mealType: 'lunch', source: 'photo', title: id, items: [], kcal, protein: 0, carbs: 0, fats: 0,
  imagePath: null, confidence: null, repeatedFrom: null, chatMessageId: null, createdAt: '2026-10-15T12:00:00Z', updatedAt: '',
});
const baseDay = (): NutritionDay => ({
  date: '2026-10-15', isToday: true, meals: [meal('a', 500)],
  totals: { kcal: 500, protein: 0, carbs: 0, fats: 0 },
  goal: { source: 'plan', planId: 'p', kcal: 2000, protein: 100, carbs: 250, fats: 60 },
  remaining: { kcal: 1500, protein: 100, carbs: 250, fats: 60 },
});

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  client.setQueryData(mealKeys.day('u1', null), baseDay());
  let api: ReturnType<typeof useMealMutations> | null = null;
  const Probe = () => {
    api = useMealMutations();
    return null;
  };
  act(() => {
    ReactTestRenderer.create(
      <QueryClientProvider client={client}>
        <Probe />
      </QueryClientProvider>,
    );
  });
  return { client, api: () => api! };
}
const settle = async () => {
  for (let i = 0; i < 12; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  }
};
const today = (client: QueryClient) => client.getQueryData<NutritionDay>(mealKeys.day('u1', null))!;

beforeEach(() => {
  Object.values(mockService).forEach(fn => fn.mockReset());
  mockService.getDay.mockResolvedValue(baseDay());
  mockService.getRecent.mockResolvedValue([]);
});

describe('optimistic meals with a way back', () => {
  it('delete: the day shows it gone at once; if the server refuses, it comes back', async () => {
    const { client, api } = setup();
    let release: (error: Error) => void = () => undefined;
    mockService.remove.mockImplementation(() => new Promise((_resolve, reject) => (release = reject)));
    let result: Promise<unknown> = Promise.resolve();
    act(() => {
      result = api().remove.mutateAsync('a').catch(() => undefined);
    });
    await act(async () => {
      await settle();
    });
    expect(today(client).meals).toHaveLength(0);
    expect(today(client).totals.kcal).toBe(0);
    await act(async () => {
      release(new Error('offline'));
      await result;
    });
    expect(today(client).meals.map(item => item.id)).toEqual(['a']);
    expect(today(client).totals.kcal).toBe(500);
  });

  it('save: the new meal counts at once; a failure takes it away', async () => {
    const { client, api } = setup();
    let release: (error: Error) => void = () => undefined;
    mockService.save.mockImplementation(() => new Promise((_resolve, reject) => (release = reject)));
    let result: Promise<unknown> = Promise.resolve();
    act(() => {
      result = api()
        .save.mutateAsync({ source: 'manual', mealType: 'snack', title: 'x', kcal: 250 })
        .catch(() => undefined);
    });
    await act(async () => {
      await settle();
    });
    expect(today(client).meals).toHaveLength(2);
    expect(today(client).totals.kcal).toBe(750);
    expect(today(client).remaining?.kcal).toBe(1250);
    await act(async () => {
      release(new Error('offline'));
      await result;
    });
    expect(today(client).meals).toHaveLength(1);
    expect(today(client).totals.kcal).toBe(500);
  });

  it('update: the figures change at once and go back on failure', async () => {
    const { client, api } = setup();
    let release: (error: Error) => void = () => undefined;
    mockService.update.mockImplementation(() => new Promise((_resolve, reject) => (release = reject)));
    let result: Promise<unknown> = Promise.resolve();
    act(() => {
      result = api().update.mutateAsync({ id: 'a', input: { kcal: 650 } }).catch(() => undefined);
    });
    await act(async () => {
      await settle();
    });
    expect(today(client).totals.kcal).toBe(650);
    await act(async () => {
      release(new Error('x'));
      await result;
    });
    expect(today(client).totals.kcal).toBe(500);
  });

  it('repeat: the copy shows at once as a repetition', async () => {
    const { client, api } = setup();
    mockService.repeat.mockImplementation(() => new Promise(() => undefined));
    act(() => {
      api().repeat.mutate({ meal: meal('old', 300) });
    });
    await act(async () => {
      await settle();
    });
    const added = today(client).meals[today(client).meals.length - 1];
    expect(added).toMatchObject({ source: 'repeat', kcal: 300, repeatedFrom: 'old' });
    expect(today(client).totals.kcal).toBe(800);
  });
});
