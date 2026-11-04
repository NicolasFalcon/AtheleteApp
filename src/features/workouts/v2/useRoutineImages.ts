import { useCallback, useState } from 'react';
import type { AppImageSource } from '@app/components/v2/AppImage';
import {
  routineKeepsPhoto,
  useRoutineCoverContext,
  type RoutineCoverInfo,
} from '@app/components/v2/RoutineCover';
import { routineFocusWord } from '@app/features/workouts/routineFocus';
import {
  DEFAULT_WORKOUT_THUMBNAIL,
  resolveWorkoutThumbnailSource,
} from '@app/lib/workoutThumbnails';
import type { Workout } from '@app/shared';

// Routine picture of a list row: an official routine with a photo of its own
// keeps it (routineKeepsPhoto); every other routine shows its cover
// (§28.16). A photo that fails to load falls back to the cover too.
export function useRoutineImages() {
  const [broken, setBroken] = useState<Record<string, boolean>>({});
  const { language, gender } = useRoutineCoverContext();

  const coverFor = useCallback(
    (workout: Workout): RoutineCoverInfo | undefined =>
      routineKeepsPhoto(workout) && !broken[workout.id]
        ? undefined
        : {
            word: routineFocusWord(workout, language),
            focus: workout.routineFocus ?? null,
            gender,
          },
    [broken, gender, language],
  );

  const imageFor = useCallback(
    (workout: Workout): AppImageSource =>
      broken[workout.id]
        ? DEFAULT_WORKOUT_THUMBNAIL
        : resolveWorkoutThumbnailSource({ imageUrl: workout.imageUrl }),
    [broken],
  );

  const markBroken = useCallback((id: string) => {
    setBroken(current => ({ ...current, [id]: true }));
  }, []);

  return { coverFor, imageFor, markBroken };
}
