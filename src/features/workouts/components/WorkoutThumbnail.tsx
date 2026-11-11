import {useEffect, useState} from 'react';
import {
  Image,
  View,
  type ImageSourcePropType,
  type ImageStyle,
  type ViewStyle,
} from 'react-native';
import {RoutineCover, useRoutineCoverContext} from '@app/components/v2/RoutineCover';
import {routineFocusWord} from '@app/features/workouts/routineFocus';
import {
  getWorkoutThumbnail,
  resolveWorkoutThumbnailSource,
  routineKeepsPhoto,
} from '@app/lib/workoutThumbnails';
import type {Workout} from '@app/shared';

type WorkoutThumbnailProps = {
  workout: Workout;
  style?: ImageStyle;
};

function getSource(workout: Workout): ImageSourcePropType {
  return resolveWorkoutThumbnailSource({
    imageUrl: workout.imageUrl,
    origin: workout.origin,
    type: workout.type,
    targetMuscles: workout.targetMuscles,
    title: workout.title,
  });
}

// An official or editorial routine with a photo of its own keeps it; every
// other routine (and a photo that fails to load) shows the app's cover: the
// focus word over the brand background, same as the lists and the detail.
export function WorkoutThumbnail({workout, style}: WorkoutThumbnailProps) {
  const {language, gender} = useRoutineCoverContext();
  const [broken, setBroken] = useState(false);
  const [source, setSource] = useState<ImageSourcePropType>(() => getSource(workout));

  useEffect(() => {
    setBroken(false);
    setSource(getSource(workout));
  }, [workout]);

  if (!routineKeepsPhoto(workout) || broken) {
    return (
      <View style={[style as ViewStyle, {overflow: 'hidden'}]}>
        <RoutineCover
          format="thumb"
          word={routineFocusWord(workout, language)}
          focus={workout.routineFocus ?? null}
          gender={gender}
        />
      </View>
    );
  }

  return (
    <Image
      source={source}
      style={style}
      resizeMode="cover"
      onError={() => {
        setBroken(true);
        setSource(getWorkoutThumbnail(workout.type, workout.targetMuscles, workout.title));
      }}
    />
  );
}
