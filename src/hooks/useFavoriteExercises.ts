import {useCallback, useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'athelete_favorite_exercises';

export function useFavoriteExercises() {
  const [favoriteExerciseIds, setFavoriteExerciseIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadFavorites = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];

        if (!cancelled && Array.isArray(parsed)) {
          setFavoriteExerciseIds(parsed.filter(item => typeof item === 'string'));
        }
      } catch {
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    };

    loadFavorites().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (ids: string[]) => {
    setFavoriteExerciseIds(ids);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
    }
  }, []);

  const isExerciseFavorite = useCallback(
    (id: string) => favoriteExerciseIds.includes(id),
    [favoriteExerciseIds],
  );

  const toggleExerciseFavorite = useCallback(
    async (id: string) => {
      const next = favoriteExerciseIds.includes(id)
        ? favoriteExerciseIds.filter(item => item !== id)
        : [...favoriteExerciseIds, id];

      await persist(next);
    },
    [favoriteExerciseIds, persist],
  );

  return {
    favoriteExerciseIds,
    isExerciseFavorite,
    toggleExerciseFavorite,
    loaded,
  };
}
