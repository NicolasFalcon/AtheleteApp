import { Image, ScrollView, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  PressableScale,
  SectionHeader,
  Skeleton,
  SkeletonGroup,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { BlockError } from '@app/features/home/v2/BlockError';
import { difficultyLabel } from '@app/features/home/v2/homeLabels';
import { resolveWorkoutThumbnailSource } from '@app/lib/workoutThumbnails';
import { SceneScope } from '@app/providers/ThemeProvider';
import type { Workout } from '@app/shared';

type WeekCarouselProps = {
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  workouts: Workout[];
  onOpenWorkout: (workoutId: string) => void;
  onOpenAll: () => void;
};

const CARD = { width: 210, height: 280 };

// "Para entrenar esta semana": the current recommended routines.
export function WeekCarousel({
  loading,
  error,
  onRetry,
  workouts,
  onOpenWorkout,
  onOpenAll,
}: WeekCarouselProps) {
  const { layout } = useThemeV2();

  return (
    <View style={styles.block}>
      <SectionHeader
        title="Para entrenar esta semana"
        action={{ label: 'Todo', onPress: onOpenAll }}
      />
      {error ? (
        <BlockError
          message="No pudimos cargar las rutinas."
          onRetry={onRetry}
        />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD.width + 12}
          decelerationRate="fast"
          style={{ marginHorizontal: -layout.gutter }}
          contentContainerStyle={[
            styles.track,
            { paddingHorizontal: layout.gutter },
          ]}
        >
          {loading ? (
            <SkeletonGroup>
              {[0, 1, 2].map(index => (
                <Skeleton
                  key={index}
                  width={CARD.width}
                  height={CARD.height}
                  radius={24}
                />
              ))}
            </SkeletonGroup>
          ) : workouts.length === 0 ? (
            <TextV2 variant="meta" tone="secondary">
              Aún no hay rutinas para recomendarte.
            </TextV2>
          ) : (
            workouts.map(workout => (
              <WorkoutCard
                key={workout.id}
                workout={workout}
                onPress={() => onOpenWorkout(workout.id)}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

function WorkoutCard({
  workout,
  onPress,
}: {
  workout: Workout;
  onPress: () => void;
}) {
  const { radius, scene } = useThemeV2();

  return (
    <SceneScope>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${workout.title}, ${workout.duration} minutos`}
        onPress={onPress}
        style={[
          styles.card,
          {
            borderRadius: radius.card,
            backgroundColor: scene.dotRing,
          },
        ]}
      >
        <View style={StyleSheet.absoluteFill}>
          <Image
            source={resolveWorkoutThumbnailSource({
              imageUrl: workout.imageUrl,
              type: workout.type,
              targetMuscles: workout.targetMuscles,
              title: workout.title,
            })}
            resizeMode="cover"
            style={styles.image}
          />
        </View>
        {/* Remote photos are not baked: a dark layer replaces brightness(.82). */}
        <View style={[StyleSheet.absoluteFill, styles.dim]} />
        <LinearGradient
          colors={['rgba(20,19,18,0)', 'rgba(20,19,18,.92)']}
          locations={[0.38, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.cardText}>
          <TextV2 variant="eyebrow" tone="tertiary">
            {difficultyLabel(workout.difficulty)}
          </TextV2>
          <TextV2 variant="cta" numberOfLines={2}>
            {workout.title}
          </TextV2>
          <TextV2 variant="meta" tone="secondary">
            {`${workout.duration} min · ${workout.calories} kcal`}
          </TextV2>
        </View>
      </PressableScale>
    </SceneScope>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: 14,
  },
  track: {
    gap: 12,
    paddingBottom: 8,
  },
  card: {
    width: CARD.width,
    height: CARD.height,
    overflow: 'hidden',
    boxShadow: '0 12px 28px rgba(0,0,0,.14)',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  dim: {
    backgroundColor: 'rgba(20,19,18,.18)',
  },
  cardText: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    gap: 6,
  },
});
