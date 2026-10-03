import { useCallback, useState } from 'react';
import {
  DEFAULT_WORKOUT_THUMBNAIL,
  resolveWorkoutThumbnailSource,
} from '@app/lib/workoutThumbnails';
import type { Workout } from '@app/shared';

// Routine photo with a fallback once the remote image fails to load.
export function useRoutineImages() {
  const [broken, setBroken] = useState<Record<string, boolean>>({});

  const imageFor = useCallback(
    (workout: Workout) =>
      broken[workout.id]
        ? DEFAULT_WORKOUT_THUMBNAIL
        : resolveWorkoutThumbnailSource({
            imageUrl: workout.imageUrl,
            type: workout.type,
            targetMuscles: workout.targetMuscles,
            title: workout.title,
          }),
    [broken],
  );

  const markBroken = useCallback((id: string) => {
    setBroken(current => ({ ...current, [id]: true }));
  }, []);

  return { imageFor, markBroken };
}
