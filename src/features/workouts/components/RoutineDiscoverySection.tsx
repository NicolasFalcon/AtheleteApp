import { ArrowRight } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RoutineDiscoveryCard } from '@app/features/workouts/components/RoutineDiscoveryCard';
import { useAppTheme } from '@app/hooks/useAppTheme';
import type { Workout } from '@app/shared';

type RoutineDiscoverySectionProps = {
  title: string;
  subtitle?: string;
  workouts: Workout[];
  favoriteWorkoutIds: string[];
  onToggleFavorite: (workoutId: string) => void;
  onSelectWorkout: (workoutId: string) => void;
  onViewAll?: () => void;
};

export function RoutineDiscoverySection({
  title,
  subtitle,
  workouts,
  favoriteWorkoutIds,
  onToggleFavorite,
  onSelectWorkout,
  onViewAll,
}: RoutineDiscoverySectionProps) {
  const { theme } = useAppTheme();

  if (workouts.length === 0) {
    return null;
  }

  const styles = StyleSheet.create({
    section: {
      gap: 10,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 12,
    },
    copy: {
      flex: 1,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 18,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: -0.3,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 2,
    },
    action: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingVertical: 4,
    },
    actionLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      fontWeight: theme.typography.weights.semibold,
    },
    content: {
      gap: 11,
      paddingRight: theme.spacing.md,
      paddingBottom: 3,
    },
  });

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {onViewAll ? (
          <Pressable onPress={onViewAll} style={styles.action}>
            <Text style={styles.actionLabel}>Ver todo</Text>
            <ArrowRight
              color={theme.colors.textSecondary}
              size={14}
              strokeWidth={2}
            />
          </Pressable>
        ) : null}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {workouts.map(workout => (
          <RoutineDiscoveryCard
            key={workout.id}
            workout={workout}
            isFavorite={favoriteWorkoutIds.includes(workout.id)}
            onToggleFavorite={() => onToggleFavorite(workout.id)}
            onPress={() => onSelectWorkout(workout.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
