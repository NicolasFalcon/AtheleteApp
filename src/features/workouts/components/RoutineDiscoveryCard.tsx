import { Clock3, Flame, Heart } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WorkoutThumbnail } from '@app/features/workouts/components/WorkoutThumbnail';
import { useAppTheme } from '@app/hooks/useAppTheme';
import type { Workout } from '@app/shared';

type RoutineDiscoveryCardProps = {
  workout: Workout;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onPress: () => void;
};

const difficultyLabels = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
} as const;

function getOriginLabel(workout: Workout) {
  if (workout.sourceType === 'user') {
    return 'Tuya';
  }

  if (workout.sourceType === 'ellie' || workout.createdByAi) {
    return 'ELLIE';
  }

  return 'Biblioteca';
}

export function RoutineDiscoveryCard({
  workout,
  isFavorite,
  onToggleFavorite,
  onPress,
}: RoutineDiscoveryCardProps) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      width: 204,
      borderRadius: theme.radii.md,
      overflow: 'hidden',
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      ...theme.elevations.card,
    },
    imageWrap: {
      height: 128,
      backgroundColor: theme.colors.surfaceMuted,
    },
    image: {
      width: '100%',
      height: '100%',
    },
    imageShade: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      height: 58,
      backgroundColor: 'rgba(0,0,0,0.14)',
    },
    originBadge: {
      position: 'absolute',
      top: 10,
      left: 10,
      borderRadius: theme.radii.pill,
      backgroundColor: 'rgba(255,255,255,0.9)',
      paddingHorizontal: 8,
      paddingVertical: 5,
    },
    originLabel: {
      color: '#111111',
      fontFamily: theme.typography.fontFamily,
      fontSize: 9,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    favoriteButton: {
      position: 'absolute',
      top: 9,
      right: 9,
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(17,17,17,0.46)',
    },
    body: {
      padding: 12,
      gap: 7,
    },
    difficulty: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 16,
      lineHeight: 20,
      fontWeight: theme.typography.weights.semibold,
      minHeight: 40,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
    },
  });

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed ? { transform: [{ scale: 0.985 }] } : null,
      ]}
    >
      <View style={styles.imageWrap}>
        <WorkoutThumbnail workout={workout} style={styles.image} />
        <View style={styles.imageShade} />
        <View style={styles.originBadge}>
          <Text style={styles.originLabel}>{getOriginLabel(workout)}</Text>
        </View>
        <Pressable
          onPress={event => {
            event.stopPropagation();
            onToggleFavorite();
          }}
          style={styles.favoriteButton}
        >
          <Heart
            color="#FFFFFF"
            fill={isFavorite ? '#FFFFFF' : 'transparent'}
            size={16}
            strokeWidth={2}
          />
        </Pressable>
      </View>
      <View style={styles.body}>
        <Text style={styles.difficulty}>
          {difficultyLabels[workout.difficulty] || workout.difficulty}
        </Text>
        <Text numberOfLines={2} style={styles.title}>
          {workout.title}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Clock3 color={theme.colors.textSecondary} size={12} />
            <Text style={styles.metaLabel}>{workout.duration} min</Text>
          </View>
          <View style={styles.metaItem}>
            <Flame color={theme.colors.textSecondary} size={12} />
            <Text style={styles.metaLabel}>{workout.calories} kcal</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
