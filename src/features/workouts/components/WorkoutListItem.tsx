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
      padding: 12,
      gap: 12,
      shadowColor: '#000000',
      ...theme.elevations.card,
    },
    image: {
      width: 82,
      height: 82,
      borderRadius: theme.radii.sm,
    },
    content: {
      flex: 1,
      gap: 4,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 16,
      fontWeight: theme.typography.weights.semibold,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      lineHeight: 18,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      flexWrap: 'wrap',
      marginTop: 4,
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
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
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
