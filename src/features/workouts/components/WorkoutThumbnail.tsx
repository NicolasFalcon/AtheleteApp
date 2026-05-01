import {useEffect, useState} from 'react';
import {Image, type ImageSourcePropType, type ImageStyle} from 'react-native';
import {
  getWorkoutThumbnail,
  resolveWorkoutThumbnailSource,
} from '@app/lib/workoutThumbnails';
import type {Workout} from '@app/shared';

type WorkoutThumbnailProps = {
  workout: Workout;
  style?: ImageStyle;
};

function getSource(workout: Workout): ImageSourcePropType {
  if (workout.imageUrl) {
    return {uri: workout.imageUrl};
  }

  return resolveWorkoutThumbnailSource({
    imageUrl: workout.imageUrl,
    type: workout.type,
    targetMuscles: workout.targetMuscles,
    title: workout.title,
  });
}

export function WorkoutThumbnail({workout, style}: WorkoutThumbnailProps) {
  const fallbackSource = getWorkoutThumbnail(
    workout.type,
    workout.targetMuscles,
    workout.title,
  );
  const [source, setSource] = useState<ImageSourcePropType>(() => getSource(workout));

  useEffect(() => {
    setSource(getSource(workout));
  }, [workout]);

  return (
    <Image
      source={source}
      style={style}
      resizeMode="cover"
      onError={() => setSource(fallbackSource)}
    />
  );
}
