import {useCallback, useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'athelete_favorite_workouts';

export function useFavoriteWorkouts() {
  const [favoriteWorkoutIds, setFavoriteWorkoutIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadFavorites = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];

        if (!cancelled && Array.isArray(parsed)) {
          setFavoriteWorkoutIds(parsed.filter(item => typeof item === 'string'));
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
    setFavoriteWorkoutIds(ids);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
    }
  }, []);

  const isWorkoutFavorite = useCallback(
    (id: string) => favoriteWorkoutIds.includes(id),
    [favoriteWorkoutIds],
  );

  const toggleWorkoutFavorite = useCallback(
    async (id: string) => {
      const next = favoriteWorkoutIds.includes(id)
        ? favoriteWorkoutIds.filter(item => item !== id)
        : [...favoriteWorkoutIds, id];

      await persist(next);
    },
    [favoriteWorkoutIds, persist],
  );

  return {
    favoriteWorkoutIds,
    isWorkoutFavorite,
    toggleWorkoutFavorite,
    loaded,
  };
}
