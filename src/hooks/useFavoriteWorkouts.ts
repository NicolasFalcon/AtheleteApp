import { useCallback, useMemo } from 'react';
import { useUserFavorites } from '@app/hooks/useUserFavorites';

// Favourite routines (user_favorites, item_type 'routine').
export function useFavoriteWorkouts() {
  const { idsOf, toggle, loaded } = useUserFavorites();
  const favoriteWorkoutIds = useMemo(() => idsOf('routine'), [idsOf]);

  const isWorkoutFavorite = useCallback(
    (id: string) => favoriteWorkoutIds.includes(id),
    [favoriteWorkoutIds],
  );
  const toggleWorkoutFavorite = useCallback(
    (id: string) => toggle('routine', id),
    [toggle],
  );
  const removeWorkoutFavorite = useCallback(
    async (id: string) => {
      if (favoriteWorkoutIds.includes(id)) {
        await toggle('routine', id);
      }
    },
    [favoriteWorkoutIds, toggle],
  );

  return {
    favoriteWorkoutIds,
    isWorkoutFavorite,
    toggleWorkoutFavorite,
    removeWorkoutFavorite,
    loaded,
    isLoading: !loaded,
    isToggling: false,
    error: null,
  };
}
