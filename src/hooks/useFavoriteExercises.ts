import { useCallback, useMemo } from 'react';
import { useUserFavorites } from '@app/hooks/useUserFavorites';

// Favourite exercises (user_favorites, item_type 'exercise').
export function useFavoriteExercises() {
  const { idsOf, toggle, loaded } = useUserFavorites();
  const favoriteExerciseIds = useMemo(() => idsOf('exercise'), [idsOf]);

  const isExerciseFavorite = useCallback(
    (id: string) => favoriteExerciseIds.includes(id),
    [favoriteExerciseIds],
  );
  const toggleExerciseFavorite = useCallback(
    (id: string) => toggle('exercise', id),
    [toggle],
  );

  return {
    favoriteExerciseIds,
    isExerciseFavorite,
    toggleExerciseFavorite,
    loaded,
    isLoading: !loaded,
    isToggling: false,
    error: null,
  };
}
