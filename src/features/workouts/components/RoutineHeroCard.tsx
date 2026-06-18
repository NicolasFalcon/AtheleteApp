import { ArrowRight, Clock3, Flame, Sparkles } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WorkoutThumbnail } from '@app/features/workouts/components/WorkoutThumbnail';
import { useAppTheme } from '@app/hooks/useAppTheme';
import type { Workout } from '@app/shared';

type RoutineHeroCardProps = {
  workout: Workout;
  onPress: () => void;
};

export function RoutineHeroCard({ workout, onPress }: RoutineHeroCardProps) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      minHeight: 208,
      borderRadius: theme.radii.lg,
      overflow: 'hidden',
      backgroundColor: '#111111',
      ...theme.elevations.card,
    },
    image: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      width: '100%',
      height: '100%',
    },
    overlay: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: 'rgba(0,0,0,0.62)',
    },
    sideShade: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: '78%',
      backgroundColor: 'rgba(0,0,0,0.28)',
    },
    content: {
      minHeight: 208,
      padding: 17,
      justifyContent: 'space-between',
      gap: 14,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: theme.radii.pill,
      backgroundColor: 'rgba(255,255,255,0.13)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    badgeLabel: {
      color: '#FFFFFF',
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    copy: {
      maxWidth: '88%',
    },
    eyebrow: {
      color: 'rgba(255,255,255,0.68)',
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.semibold,
      marginBottom: 4,
    },
    title: {
      color: '#FFFFFF',
      fontFamily: theme.typography.fontFamily,
      fontSize: 23,
      lineHeight: 28,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: -0.6,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginTop: 9,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    metaLabel: {
      color: 'rgba(255,255,255,0.78)',
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
    },
    cta: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      borderRadius: theme.radii.pill,
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    ctaLabel: {
      color: '#111111',
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      fontWeight: theme.typography.weights.bold,
    },
  });

  return (
    <View style={styles.card}>
      <WorkoutThumbnail workout={workout} style={styles.image} />
      <View style={styles.overlay} />
      <View style={styles.sideShade} />
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.content,
          pressed ? { opacity: 0.94 } : null,
        ]}
      >
        <View style={styles.topRow}>
          <View style={styles.badge}>
            <Sparkles color="#FFFFFF" size={12} strokeWidth={2.2} />
            <Text style={styles.badgeLabel}>Destacada</Text>
          </View>
        </View>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>Tu próxima sesión</Text>
          <Text numberOfLines={2} style={styles.title}>
            {workout.title}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Clock3 color="rgba(255,255,255,0.78)" size={14} />
              <Text style={styles.metaLabel}>{workout.duration} min</Text>
            </View>
            <View style={styles.metaItem}>
              <Flame color="rgba(255,255,255,0.78)" size={14} />
              <Text style={styles.metaLabel}>{workout.calories} kcal</Text>
            </View>
          </View>
        </View>
        <View style={styles.cta}>
          <Text style={styles.ctaLabel}>Ver rutina</Text>
          <ArrowRight color="#111111" size={16} strokeWidth={2.3} />
        </View>
      </Pressable>
    </View>
  );
}
