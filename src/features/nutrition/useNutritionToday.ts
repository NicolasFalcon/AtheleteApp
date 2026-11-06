import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { playSound, useSoundPreload } from '@app/features/sound/soundService';
import { supplementClientId } from '@app/features/nutrition/nutritionDayModel';
import { useAuth } from '@app/hooks/useAuth';
import { getLocalDateKey } from '@app/lib/date';
import { createUuid } from '@app/lib/uuid';
import { deviceTimeZone } from '@app/services/supabase/play';
import {
  deleteMealEntry,
  deleteSupplement,
  fetchNutritionDay,
  fetchNutritionTargets,
  fetchRecentAndFavorites,
  listSupplements,
  logMealEntry,
  logPlannedMeal,
  markSupplement,
  toggleFavoriteFood,
  updateMealEntry,
  upsertSupplement,
  type EntrySource,
  type FoodItem,
  type NutritionDay,
  type NutritionSlot,
  type SupplementInput,
  type SupplementMoment,
} from '@app/services/supabase/nutritionDay';
import {
  applySwap,
  fetchNutritionPlan,
  swapPlanMeal,
  type ActivePlan,
} from '@app/services/supabase/nutritionPlan';

export const nutritionDayKey = (userId: string | undefined, date: string) =>
  ['nutrition-day', userId ?? 'anon', date] as const;

// The device's zone, else the one the backend falls back to.
export const nutritionTz = () => deviceTimeZone() || 'America/Santiago';

// After any write of the day: the day itself, the foods lists and the
// surfaces that read nutrition (Inicio's rings, ELLIE's context).
export function invalidateNutritionDay(queryClient: QueryClient, userId: string | undefined) {
  return Promise.allSettled(
    [
      ['nutrition-day', userId ?? 'anon'],
      ['nutrition-foods', userId ?? 'anon'],
      ['home', 'overview', userId],
      ['ellie', 'overview', userId],
    ].map(queryKey => queryClient.invalidateQueries({ queryKey })),
  );
}

// Nutrición · Hoy: get_nutrition_day of the local date (null = today).
export function useNutritionToday(date: string | null = null) {
  const { profile } = useAuth();
  const userId = profile?.id;
  const day = date ?? getLocalDateKey();
  const query = useQuery({
    queryKey: nutritionDayKey(userId, day),
    enabled: Boolean(userId),
    staleTime: 30_000,
    queryFn: () => fetchNutritionDay(day, nutritionTz()),
  });
  return { ...query, date: day };
}

// "Cómo lo calculé": only read when it is shown.
export function useNutritionTargets(date: string, enabled: boolean) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['nutrition-targets', profile?.id ?? 'anon', date],
    enabled: enabled && Boolean(profile?.id),
    staleTime: 5 * 60_000,
    queryFn: () => fetchNutritionTargets(date, nutritionTz()),
  });
}

export function useRecentFoods(enabled: boolean) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['nutrition-foods', profile?.id ?? 'anon'],
    enabled: enabled && Boolean(profile?.id),
    staleTime: 60_000,
    queryFn: fetchRecentAndFavorites,
  });
}

export function useSupplementsList() {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ['supplements', profile?.id ?? 'anon'],
    enabled: Boolean(profile?.id),
    queryFn: listSupplements,
  });
}

export function useMealEntryMutations() {
  const { profile } = useAuth();
  const userId = profile?.id;
  const queryClient = useQueryClient();
  const settle = useCallback(() => {
    invalidateNutritionDay(queryClient, userId).catch(() => undefined);
  }, [queryClient, userId]);

  const log = useMutation({
    mutationFn: (input: {
      date: string;
      slot: NutritionSlot;
      items: FoodItem[];
      source: EntrySource;
      clientId?: string;
    }) => logMealEntry({ ...input, clientId: input.clientId ?? createUuid() }),
    onSettled: settle,
  });
  const logPlanned = useMutation({
    mutationFn: (input: { date: string; slot: NutritionSlot }) => logPlannedMeal(input.date, input.slot),
    onSettled: settle,
  });
  const update = useMutation({
    mutationFn: updateMealEntry,
    onSettled: settle,
  });
  // The row leaves at once; it comes back if the delete fails.
  const remove = useMutation({
    mutationFn: (input: { entryId: string; date: string }) => deleteMealEntry(input.entryId),
    onMutate: async ({ entryId, date }) => {
      const key = nutritionDayKey(userId, date);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<NutritionDay>(key);
      if (previous) {
        queryClient.setQueryData<NutritionDay>(key, {
          ...previous,
          moments: previous.moments.map(moment => ({
            ...moment,
            entries: moment.entries.filter(entry => entry.id !== entryId),
          })),
        });
      }
      return { key, previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSettled: settle,
  });
  const favorite = useMutation({
    mutationFn: toggleFavoriteFood,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition-foods', userId ?? 'anon'] }).catch(() => undefined);
    },
  });
  return { log, logPlanned, update, remove, favorite };
}

// The big check of a supplement: answers at once (and sounds), the server
// confirms; a failure puts it back.
export function useMarkSupplement() {
  const { profile } = useAuth();
  const userId = profile?.id;
  const queryClient = useQueryClient();
  useSoundPreload(['habit-check']);
  return useMutation({
    mutationFn: (input: { supplementId: string; date: string; moment: SupplementMoment; taken: boolean }) =>
      markSupplement({
        ...input,
        source: 'app',
        clientId: supplementClientId(input.supplementId, input.date, input.moment, input.taken),
      }),
    onMutate: async input => {
      if (input.taken) {
        playSound('habit-check');
      }
      const key = nutritionDayKey(userId, input.date);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<NutritionDay>(key);
      if (previous?.supplements) {
        const now = new Date().toISOString();
        const moments = previous.supplements.moments.map(moment =>
          moment.moment !== input.moment
            ? moment
            : {
                ...moment,
                items: moment.items.map(item =>
                  item.supplementId !== input.supplementId
                    ? item
                    : { ...item, status: input.taken ? ('taken' as const) : ('pending' as const), takenAt: input.taken ? now : null },
                ),
              },
        );
        const taken = moments.flatMap(m => m.items).filter(item => item.status === 'taken').length;
        queryClient.setQueryData<NutritionDay>(key, {
          ...previous,
          supplements: { ...previous.supplements, moments, taken },
        });
      }
      return { key, previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSettled: () => {
      invalidateNutritionDay(queryClient, userId).catch(() => undefined);
    },
  });
}

export function useSupplementMutations() {
  const { profile } = useAuth();
  const userId = profile?.id;
  const queryClient = useQueryClient();
  const settle = () => {
    queryClient.invalidateQueries({ queryKey: ['supplements', userId ?? 'anon'] }).catch(() => undefined);
    invalidateNutritionDay(queryClient, userId).catch(() => undefined);
  };
  const save = useMutation({ mutationFn: (input: SupplementInput) => upsertSupplement(input), onSettled: settle });
  const remove = useMutation({ mutationFn: (id: string) => deleteSupplement(id), onSettled: settle });
  return { save, remove };
}

// ── Plan y Compras (get_nutrition_plan) ─────────────────────────────────────
// The local Monday of the week of `date` (Friday 6 nov → 2026-11-02).
export function localWeekStart(date: string = getLocalDateKey()): string {
  const [y, m, d] = date.split('-').map(Number);
  const value = new Date(y, m - 1, d, 12);
  value.setDate(value.getDate() - ((value.getDay() + 6) % 7));
  return getLocalDateKey(value);
}

export const nutritionPlanKey = (userId: string | undefined, weekStart: string) =>
  ['nutrition-plan', userId ?? 'anon', weekStart] as const;

export function useNutritionPlan(enabled = true) {
  const { profile } = useAuth();
  const weekStart = localWeekStart();
  const query = useQuery({
    queryKey: nutritionPlanKey(profile?.id, weekStart),
    enabled: enabled && Boolean(profile?.id),
    staleTime: 60_000,
    queryFn: () => fetchNutritionPlan(weekStart, nutritionTz()),
  });
  return { ...query, weekStart };
}

// "Cambiar" in Plan: that meal, that day only. The answer (meal + shopping)
// updates the cached plan in place, without reloading it; only if the
// server did not send the meal is the plan read again. The day (Hoy) is
// refreshed, since its planned meal may be the one that changed.
export function useSwapPlanMeal() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: ({ date: _date, ...params }: Parameters<typeof swapPlanMeal>[0] & { date: string }) =>
      swapPlanMeal(params),
    onSuccess: (result, variables) => {
      const key = nutritionPlanKey(profile?.id, localWeekStart(variables.date));
      if (!result.meal) {
        queryClient.invalidateQueries({ queryKey: key }).catch(() => undefined);
        return;
      }
      queryClient.setQueryData<ActivePlan | null>(key, current =>
        current ? applySwap(current, variables.date, variables.slot, result) : current,
      );
    },
    onSettled: () => invalidateNutritionDay(queryClient, profile?.id),
  });
}
