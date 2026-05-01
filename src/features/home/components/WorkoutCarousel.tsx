import {Clock3, Flame, Sparkles} from 'lucide-react-native';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useAppTheme} from '@app/hooks/useAppTheme';
import type {Workout} from '@app/shared';
import {WorkoutThumbnail} from '@app/features/workouts/components/WorkoutThumbnail';

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
  const {theme} = useAppTheme();

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
      gap: theme.spacing.sm,
      paddingTop: theme.spacing.xs,
      paddingBottom: 2,
    },
    card: {
      width: 158,
      borderRadius: theme.radii.lg,
      overflow: 'hidden',
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      shadowColor: '#000000',
      ...theme.elevations.card,
    },
    image: {
      width: '100%',
      height: 106,
    },
    overlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 10,
      backgroundColor: 'rgba(17,17,17,0.38)',
    },
    badge: {
      position: 'absolute',
      top: 8,
      left: 8,
      borderRadius: theme.radii.pill,
      backgroundColor: 'rgba(255,255,255,0.92)',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    badgeLabel: {
      color: '#111111',
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      fontWeight: theme.typography.weights.bold,
    },
    cardTitle: {
      color: '#FFFFFF',
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      fontWeight: theme.typography.weights.semibold,
    },
    metaRow: {
      paddingHorizontal: 10,
      paddingTop: 6,
      paddingBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
    },
  });

  if (workouts.length === 0) {
    return null;
  }

  return (
    <View style={styles.headerRow}>
      <View style={styles.titleRow}>
        <Sparkles color={theme.colors.textPrimary} size={16} strokeWidth={2.1} />
        <Text style={styles.titleLabel}>{title}</Text>
      </View>
      <Text style={styles.subtitleLabel}>{subtitle}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}>
        {workouts.map(workout => (
          <Pressable
            key={workout.id}
            onPress={() => onSelectWorkout(workout.id)}
            style={({pressed}) => [
              styles.card,
              pressed ? {transform: [{scale: 0.98}]} : null,
            ]}>
            <View>
              <WorkoutThumbnail workout={workout} style={styles.image} />
              {workout.createdByAi || workout.sourceType === 'ellie' ? (
                <View style={styles.badge}>
                  <Sparkles color="#111111" size={10} strokeWidth={2.1} />
                  <Text style={styles.badgeLabel}>ELLIE</Text>
                </View>
              ) : null}
              <View style={styles.overlay}>
                <Text numberOfLines={1} style={styles.cardTitle}>
                  {workout.title}
                </Text>
              </View>
            </View>
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
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
