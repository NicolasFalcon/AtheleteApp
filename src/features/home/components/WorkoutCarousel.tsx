import { Clock3, Flame, Sparkles } from 'lucide-react-native';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useAppTheme } from '@app/hooks/useAppTheme';
import type { Workout } from '@app/shared';
import { WorkoutThumbnail } from '@app/features/workouts/components/WorkoutThumbnail';

type WorkoutCarouselProps = {
  title: string;
  subtitle: string;
  workouts: Workout[];
  onSelectWorkout: (workoutId: string) => void;
};

export function WorkoutCarousel({
  title,
  subtitle,
  workouts,
  onSelectWorkout,
}: WorkoutCarouselProps) {
  const { theme } = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = Math.min(292, Math.max(248, windowWidth - 88));

  const styles = StyleSheet.create({
    headerRow: {
      gap: 3,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    titleLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 16,
      fontWeight: theme.typography.weights.semibold,
    },
    subtitleLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
    },
    listContent: {
      gap: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingRight: theme.spacing.md,
      paddingBottom: theme.spacing.lg,
    },
    card: {
      width: cardWidth,
      minHeight: 250,
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.surface,
      shadowColor: '#000000',
      ...(theme.mode === 'light'
        ? theme.elevations.prominent
        : theme.elevations.card),
    },
    cardClip: {
      overflow: 'hidden',
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.surface,
    },
    image: {
      width: '100%',
      height: 174,
    },
    badge: {
      position: 'absolute',
      top: 12,
      left: 12,
      borderRadius: theme.radii.pill,
      backgroundColor: 'rgba(255,255,255,0.92)',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    badgeLabel: {
      color: '#111111',
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.bold,
    },
    body: {
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 14,
      gap: 10,
    },
    cardTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 17,
      lineHeight: 22,
      fontWeight: theme.typography.weights.semibold,
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

  if (workouts.length === 0) {
    return null;
  }

  return (
    <View style={styles.headerRow}>
      <View style={styles.titleRow}>
        <Sparkles
          color={theme.colors.textPrimary}
          size={16}
          strokeWidth={2.1}
        />
        <Text style={styles.titleLabel}>{title}</Text>
      </View>
      <Text style={styles.subtitleLabel}>{subtitle}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {workouts.map(workout => (
          <Pressable
            key={workout.id}
            onPress={() => onSelectWorkout(workout.id)}
            style={({ pressed }) => [
              styles.card,
              pressed ? { transform: [{ scale: 0.98 }] } : null,
            ]}
          >
            <View style={styles.cardClip}>
              <View>
                <WorkoutThumbnail workout={workout} style={styles.image} />
                {workout.createdByAi || workout.sourceType === 'ellie' ? (
                  <View style={styles.badge}>
                    <Sparkles color="#111111" size={10} strokeWidth={2.1} />
                    <Text style={styles.badgeLabel}>ELLIE</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.body}>
                <Text numberOfLines={2} style={styles.cardTitle}>
                  {workout.title}
                </Text>
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Clock3 color={theme.colors.textSecondary} size={14} />
                    <Text style={styles.metaLabel}>{workout.duration} min</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Flame color={theme.colors.textSecondary} size={14} />
                    <Text style={styles.metaLabel}>
                      {workout.calories} kcal
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
