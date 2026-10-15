import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  isPending,
  pendingMeal,
  withMealAdded,
  withMealRemoved,
  withMealReplaced,
} from '@app/features/nutrition/mealCache';
import { useAuth } from '@app/hooks/useAuth';
import { getLocalDateKey } from '@app/lib/date';
import { invalidateNutritionPlanQueries } from '@app/lib/queryInvalidation';
import {
  mealsService,
  type Meal,
  type NutritionDay,
  type SaveMealInput,
  type UpdateMealInput,
} from '@app/services/nutrition/mealsService';
import { awardGamificationEventBestEffort } from '@app/services/supabase/gamification';
import type { MealType } from '@app/services/vision/visionService';

// Caches of Calorías, per user. `date` null = today (the server decides what
// today is with profiles.timezone).
export const mealKeys = {
  all: (userId?: string) => ['nutrition', 'day', userId] as const,
  day: (userId: string | undefined, date: string | null) => ['nutrition', 'day', userId, date ?? 'today'] as const,
  recent: (userId?: string) => ['nutrition', 'recent', userId] as const,
};

export function useNutritionDayMeals(date: string | null = null) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: mealKeys.day(profile?.id, date),
    enabled: Boolean(profile?.id),
    staleTime: 15_000,
    queryFn: () => mealsService.getDay(date ?? undefined),
  });
}

export function useRecentMeals(enabled = true) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: mealKeys.recent(profile?.id),
    enabled: Boolean(profile?.id) && enabled,
    staleTime: 30_000,
    queryFn: () => mealsService.getRecent(20),
  });
}

type DaySnapshot = [readonly unknown[], NutritionDay | undefined][];

// Everything that shows a meal is refreshed after a change.
async function refresh(client: ReturnType<typeof useQueryClient>, userId: string) {
  await Promise.allSettled([
    client.invalidateQueries({ queryKey: mealKeys.all(userId) }),
    client.invalidateQueries({ queryKey: mealKeys.recent(userId) }),
    invalidateNutritionPlanQueries(client, userId),
  ]);
}

function awardPoints(date: string) {
  // One `nutrition_logged` per day (idempotent by date), as before.
  awardGamificationEventBestEffort({
    source: 'nutrition-meal',
    eventType: 'nutrition_logged',
    referenceId: date,
    points: 10,
    metadata: { date },
  }).catch(() => undefined);
}

// Mutations with an optimistic change of the cached days and a way back if the
// server refuses it.
export function useMealMutations() {
  const { profile } = useAuth();
  const userId = profile?.id;
  const client = useQueryClient();

  const snapshot = useCallback((): DaySnapshot => {
    const queries = client.getQueriesData<NutritionDay>({ queryKey: mealKeys.all(userId) });
    return queries.map(([key, value]) => [key, value]);
  }, [client, userId]);

  const restore = useCallback(
    (saved: DaySnapshot | undefined) => {
      saved?.forEach(([key, value]) => client.setQueryData(key, value));
    },
    [client],
  );

  const edit = useCallback(
    (change: (day: NutritionDay) => NutritionDay, only?: (key: readonly unknown[]) => boolean) => {
      client.getQueriesData<NutritionDay>({ queryKey: mealKeys.all(userId) }).forEach(([key, day]) => {
        if (day && (!only || only(key))) {
          client.setQueryData(key, change(day));
        }
      });
    },
    [client, userId],
  );

  const save = useMutation({
    mutationFn: (input: SaveMealInput) => mealsService.save(input),
    onMutate: async (input): Promise<{ saved: DaySnapshot }> => {
      await client.cancelQueries({ queryKey: mealKeys.all(userId) });
      const saved = snapshot();
      const today = getLocalDateKey();
      const date = input.localDate ?? today;
      const meal = pendingMeal({
        localDate: date,
        mealType: input.mealType,
        source: input.source,
        title: input.title,
        items: input.items ?? [],
        kcal: input.kcal,
        protein: input.protein ?? 0,
        carbs: input.carbs ?? 0,
        fats: input.fats ?? 0,
        imagePath: input.imagePath ?? null,
        confidence: input.confidence ?? null,
        repeatedFrom: null,
        chatMessageId: input.chatMessageId ?? null,
      });
      edit(day => withMealAdded(day, meal), key => key[3] === 'today' || key[3] === date);
      return { saved };
    },
    onError: (_error, _input, context) => restore(context?.saved),
    onSuccess: (meal: Meal) => awardPoints(meal.localDate || getLocalDateKey()),
    onSettled: () => {
      if (userId) {
        refresh(client, userId).catch(() => undefined);
      }
    },
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateMealInput }) => mealsService.update(id, input),
    onMutate: async ({ id, input }): Promise<{ saved: DaySnapshot }> => {
      await client.cancelQueries({ queryKey: mealKeys.all(userId) });
      const saved = snapshot();
      edit(day => {
        const current = day.meals.find(meal => meal.id === id);
        return current
          ? withMealReplaced(day, {
              ...current,
              mealType: input.mealType ?? current.mealType,
              title: input.title ?? current.title,
              items: input.items ?? current.items,
              kcal: input.kcal ?? current.kcal,
              protein: input.protein ?? current.protein,
              carbs: input.carbs ?? current.carbs,
              fats: input.fats ?? current.fats,
            })
          : day;
      });
      return { saved };
    },
    onError: (_error, _input, context) => restore(context?.saved),
    onSettled: () => {
      if (userId) {
        refresh(client, userId).catch(() => undefined);
      }
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => mealsService.remove(id),
    onMutate: async (id): Promise<{ saved: DaySnapshot }> => {
      await client.cancelQueries({ queryKey: mealKeys.all(userId) });
      const saved = snapshot();
      edit(day => withMealRemoved(day, id));
      return { saved };
    },
    onError: (_error, _id, context) => restore(context?.saved),
    onSettled: () => {
      if (userId) {
        refresh(client, userId).catch(() => undefined);
      }
    },
  });

  const repeat = useMutation({
    mutationFn: ({ meal, mealType }: { meal: Meal; mealType?: MealType }) =>
      mealsService.repeat(meal.id, { mealType }),
    onMutate: async ({ meal, mealType }): Promise<{ saved: DaySnapshot }> => {
      await client.cancelQueries({ queryKey: mealKeys.all(userId) });
      const saved = snapshot();
      const copy = pendingMeal({
        ...meal,
        mealType: mealType ?? meal.mealType,
        source: 'repeat',
        imagePath: null,
        repeatedFrom: meal.id,
        chatMessageId: null,
      });
      edit(day => withMealAdded(day, copy), key => key[3] === 'today');
      return { saved };
    },
    onError: (_error, _vars, context) => restore(context?.saved),
    onSuccess: (meal: Meal) => awardPoints(meal.localDate || getLocalDateKey()),
    onSettled: () => {
      if (userId) {
        refresh(client, userId).catch(() => undefined);
      }
    },
  });

  return { save, update, remove, repeat, isPending };
}
