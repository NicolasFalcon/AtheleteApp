import { Heart, Clock3, Flame } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@app/hooks/useAppTheme';
import type { Workout } from '@app/shared';
import { WorkoutThumbnail } from '@app/features/workouts/components/WorkoutThumbnail';

type FeaturedWorkoutCardProps = {
  workout: Workout;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onPress: () => void;
};

export function FeaturedWorkoutCard({
  workout,
  isFavorite,
  onToggleFavorite,
  onPress,
}: FeaturedWorkoutCardProps) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      width: 244,
      borderRadius: theme.radii.md,
      overflow: 'hidden',
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      shadowColor: '#000000',
      ...theme.elevations.card,
    },
    image: {
      width: '100%',
      height: 182,
    },
    topOverlay: {
      position: 'absolute',
      top: 10,
      left: 10,
      right: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    tagRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
      marginRight: 8,
    },
    badge: {
      borderRadius: theme.radii.pill,
      backgroundColor: 'rgba(255,255,255,0.12)',
      paddingHorizontal: 8,
      paddingVertical: 5,
    },
    badgeLabel: {
      color: 'rgba(255,255,255,0.72)',
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    inspirationBadge: {
      borderRadius: theme.radii.pill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.22)',
      backgroundColor: 'rgba(17,17,17,0.34)',
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    inspirationLabel: {
      color: '#FFFFFF',
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      fontWeight: theme.typography.weights.semibold,
      textTransform: 'uppercase',
    },
    favoriteButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.2)',
      backgroundColor: 'rgba(17,17,17,0.36)',
    },
    imageOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 14,
      paddingBottom: 14,
      paddingTop: 54,
      backgroundColor: 'rgba(0,0,0,0.48)',
    },
    eyebrow: {
      color: 'rgba(255,255,255,0.72)',
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      fontWeight: theme.typography.weights.medium,
      letterSpacing: 2.2,
      textTransform: 'uppercase',
    },
    title: {
      color: '#FFFFFF',
      fontFamily: theme.typography.fontFamily,
      fontSize: 20,
      fontWeight: theme.typography.weights.semibold,
      lineHeight: 25,
      letterSpacing: -0.4,
      marginTop: 3,
    },
    bottom: {
      paddingHorizontal: 14,
      paddingTop: 11,
      paddingBottom: 13,
      gap: 9,
    },
    description: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 17,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
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
  });

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed ? { transform: [{ scale: 0.98 }] } : null,
      ]}
    >
      <View>
        <WorkoutThumbnail workout={workout} style={styles.image} />
        <View style={styles.topOverlay}>
          <View style={styles.tagRow}>
            {workout.collectionBadge ? (
              <View style={styles.badge}>
                <Text style={styles.badgeLabel}>{workout.collectionBadge}</Text>
              </View>
            ) : null}
            {workout.inspirationStyle ? (
              <View style={styles.inspirationBadge}>
                <Text numberOfLines={1} style={styles.inspirationLabel}>
                  Inspirada
                </Text>
              </View>
            ) : null}
          </View>
          <Pressable
            onPress={event => {
              event.stopPropagation();
              onToggleFavorite();
            }}
            style={styles.favoriteButton}
          >
            <Heart
              color={isFavorite ? '#FFFFFF' : 'rgba(255,255,255,0.78)'}
              fill={isFavorite ? '#FFFFFF' : 'transparent'}
              size={17}
              strokeWidth={2}
            />
          </Pressable>
        </View>
        <View style={styles.imageOverlay}>
          {workout.inspirationStyle ? (
            <Text numberOfLines={2} style={styles.eyebrow}>
              {workout.inspirationStyle}
            </Text>
          ) : null}
          <Text numberOfLines={2} style={styles.title}>
            {workout.title}
          </Text>
        </View>
      </View>
      <View style={styles.bottom}>
        {workout.description ? (
          <Text numberOfLines={2} style={styles.description}>
            {workout.description}
          </Text>
        ) : null}
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
