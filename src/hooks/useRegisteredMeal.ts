import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { mealRegistrar } from '@app/features/nutrition/mealRegistrar';
import { useAuth } from '@app/hooks/useAuth';
import { fetchMealsByChatMessage } from '@app/services/nutrition/mealsService';
import type { MealType } from '@app/services/vision/visionService';

export type RegisteredMeal = { id: string; mealType: MealType } | null;

export const registeredMealKey = (userId: string | undefined, messageId: string) =>
  ['ellie', 'meal-registered', userId, messageId] as const;

// Whether the card of a chat message was already registered in Calorías (read
// from nutrition_meals by chat_message_id, so it also holds after restarting
// the app), kept up to date when it is registered from the card or the editor.
export function useRegisteredMeal(messageId: string) {
  const { profile } = useAuth();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: registeredMealKey(profile?.id, messageId),
    enabled: Boolean(profile?.id),
    staleTime: Infinity,
    queryFn: async (): Promise<RegisteredMeal> => {
      const found = (await fetchMealsByChatMessage([messageId]))[messageId] ?? null;
      if (found) {
        mealRegistrar.markDone(messageId);
      }
      return found;
    },
  });

  const mark = useCallback(
    (meal: { id: string; mealType: MealType }) => {
      mealRegistrar.markDone(messageId);
      client.setQueryData(registeredMealKey(profile?.id, messageId), meal);
    },
    [client, messageId, profile?.id],
  );

  return { registered: query.data ?? null, loading: query.isLoading, mark };
}
