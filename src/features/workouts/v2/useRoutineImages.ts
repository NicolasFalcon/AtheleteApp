import { useCallback, useState } from 'react';
import type { AppImageSource } from '@app/components/v2/AppImage';
import {
  DEFAULT_WORKOUT_THUMBNAIL,
  resolveWorkoutThumbnailSource,
} from '@app/lib/workoutThumbnails';
import type { Workout } from '@app/shared';

// Routine picture of a list row: the thumb list_routines includes
// (thumb_key, signed per page), else the photo by type; a fallback once a
// remote image fails to load.
export function useRoutineImages() {
  const [broken, setBroken] = useState<Record<string, boolean>>({});

  const imageFor = useCallback(
    (workout: Workout): AppImageSource => {
      if (broken[workout.id]) {
        return DEFAULT_WORKOUT_THUMBNAIL;
      }
      const local = resolveWorkoutThumbnailSource({
        imageUrl: workout.imageUrl,
        type: workout.type,
        targetMuscles: workout.targetMuscles,
        title: workout.title,
      });
      return workout.thumbKey && !workout.imageUrl
        ? { mediaKey: workout.thumbKey, fallback: local }
        : local;
    },
    [broken],
  );

  const markBroken = useCallback((id: string) => {
    setBroken(current => ({ ...current, [id]: true }));
  }, []);

  return { imageFor, markBroken };
}
