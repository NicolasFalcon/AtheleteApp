import { Heart, Clock3, Flame } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@app/hooks/useAppTheme';
import type { Workout } from '@app/shared';
import { WorkoutThumbnail } from '@app/features/workouts/components/WorkoutThumbnail';

type WorkoutListItemProps = {
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

export function WorkoutListItem({
  workout,
  isFavorite,
  onToggleFavorite,
  onPress,
}: WorkoutListItemProps) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      gap: 11,
      shadowColor: '#000000',
      ...theme.elevations.card,
    },
    image: {
      width: 78,
      height: 78,
      borderRadius: theme.radii.sm,
    },
    content: {
      flex: 1,
      gap: 3,
      minWidth: 0,
    },
    badge: {
      alignSelf: 'flex-start',
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.surfaceMuted,
      paddingHorizontal: 8,
      paddingVertical: 3,
      marginBottom: 1,
    },
    badgeLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 9,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 1.1,
      textTransform: 'uppercase',
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 15,
      fontWeight: theme.typography.weights.semibold,
      lineHeight: 19,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 16,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      flexWrap: 'wrap',
      marginTop: 2,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
    },
    favoriteButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
    },
  });

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed ? { transform: [{ scale: 0.99 }] } : null,
      ]}
    >
      <WorkoutThumbnail workout={workout} style={styles.image} />
      <View style={styles.content}>
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>{getOriginLabel(workout)}</Text>
        </View>
        <Text numberOfLines={2} style={styles.title}>
          {workout.title}
        </Text>
        <Text style={styles.subtitle}>
          {difficultyLabels[workout.difficulty] || workout.difficulty}
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
      <Pressable
        onPress={event => {
          event.stopPropagation();
          onToggleFavorite();
        }}
        style={styles.favoriteButton}
      >
        <Heart
          color={
            isFavorite ? theme.colors.textPrimary : theme.colors.textSecondary
          }
          fill={isFavorite ? theme.colors.textPrimary : 'transparent'}
          size={18}
          strokeWidth={2}
        />
      </Pressable>
    </Pressable>
  );
}
