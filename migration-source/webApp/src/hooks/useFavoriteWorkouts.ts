import { useState, useCallback } from 'react';

const STORAGE_KEY = 'athelete_favorite_workouts';

function loadFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFavorites(ids: string[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function useFavoriteWorkouts() {
  const [favoriteWorkoutIds, setFavoriteWorkoutIds] = useState<string[]>(loadFavorites);

  const isWorkoutFavorite = useCallback(
    (id: string) => favoriteWorkoutIds.includes(id),
    [favoriteWorkoutIds]
  );

  const toggleWorkoutFavorite = useCallback((id: string) => {
    setFavoriteWorkoutIds((prev) => {
      const next = prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id];
      saveFavorites(next);
      return next;
    });
  }, []);

  const removeWorkoutFavorite = useCallback((id: string) => {
    setFavoriteWorkoutIds((prev) => {
      if (!prev.includes(id)) {
        return prev;
      }

      const next = prev.filter((favoriteId) => favoriteId !== id);
      saveFavorites(next);
      return next;
    });
  }, []);

  return { favoriteWorkoutIds, isWorkoutFavorite, toggleWorkoutFavorite, removeWorkoutFavorite };
}
