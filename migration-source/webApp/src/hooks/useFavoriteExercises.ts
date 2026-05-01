import { useState, useCallback } from 'react';

const STORAGE_KEY = 'athelete_favorite_exercises';

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

export function useFavoriteExercises() {
  const [favoriteExerciseIds, setFavoriteExerciseIds] = useState<string[]>(loadFavorites);

  const isExerciseFavorite = useCallback(
    (id: string) => favoriteExerciseIds.includes(id),
    [favoriteExerciseIds]
  );

  const toggleExerciseFavorite = useCallback((id: string) => {
    setFavoriteExerciseIds((prev) => {
      const next = prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id];
      saveFavorites(next);
      return next;
    });
  }, []);

  return { favoriteExerciseIds, isExerciseFavorite, toggleExerciseFavorite };
}
