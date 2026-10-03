import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@app/components/v2';
import { useAuth } from '@app/hooks/useAuth';
import {
  addFavorite,
  fetchFavorites,
  migrateLocalFavorites,
  removeFavorite,
  type FavoriteRow,
  type FavoriteType,
} from '@app/services/supabase/favorites';

// Favourites live in user_favorites; every screen shares this one query so a
// heart changed in the routine detail is already changed in Entrenos.
export const favoritesKey = (userId?: string) => ['favorites', userId];

type ToggleVars = { itemType: FavoriteType; itemId: string; on: boolean };

export function useUserFavorites() {
  const { profile } = useAuth();
  const userId = profile?.id;
  const queryClient = useQueryClient();
  const toast = useToast();

  const query = useQuery({
    queryKey: favoritesKey(userId),
    enabled: Boolean(userId),
    queryFn: async () => {
      // On the first load after signing in, the old local favourites go up.
      try {
        await migrateLocalFavorites(userId!);
      } catch (error) {
        console.warn('[favorites] No se pudieron subir los favoritos locales.', error);
      }
      return fetchFavorites(userId!);
    },
  });

  const mutation = useMutation({
    mutationFn: async ({ itemType, itemId, on }: ToggleVars) => {
      if (!userId) {
        throw new Error('Sin sesión.');
      }
      return on
        ? addFavorite(userId, itemType, itemId)
        : removeFavorite(userId, itemType, itemId);
    },
    // Optimistic: the heart changes right away and is reverted on failure.
    onMutate: async ({ itemType, itemId, on }) => {
      await queryClient.cancelQueries({ queryKey: favoritesKey(userId) });
      const previous = queryClient.getQueryData<FavoriteRow[]>(
        favoritesKey(userId),
      );
      queryClient.setQueryData<FavoriteRow[]>(favoritesKey(userId), current => {
        const rest = (current ?? []).filter(
          row => !(row.itemType === itemType && row.itemId === itemId),
        );
        return on ? [{ itemType, itemId }, ...rest] : rest;
      });
      return { previous };
    },
    onError: (error, vars, context) => {
      console.warn('[favorites] No se pudo guardar el favorito.', error);
      queryClient.setQueryData(favoritesKey(userId), context?.previous);
      toast.show(
        vars.on
          ? 'No pudimos guardar el favorito'
          : 'No pudimos quitar el favorito',
        { tone: 'error' },
      );
    },
  });

  const rows = useMemo(() => query.data ?? [], [query.data]);
  const idsOf = useCallback(
    (type: FavoriteType) =>
      rows.filter(row => row.itemType === type).map(row => row.itemId),
    [rows],
  );

  const toggle = useCallback(
    (itemType: FavoriteType, itemId: string) => {
      const on = !rows.some(
        row => row.itemType === itemType && row.itemId === itemId,
      );
      return mutation.mutateAsync({ itemType, itemId, on }).catch(() => {});
    },
    [mutation, rows],
  );

  return {
    rows,
    idsOf,
    toggle,
    // Without a session there is nothing to load.
    loaded: !userId || !query.isLoading,
  };
}
