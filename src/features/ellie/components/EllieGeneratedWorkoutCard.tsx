import {Image, StyleSheet, Text, View} from 'react-native';
import {Sparkles} from 'lucide-react-native';
import {useAppTheme} from '@app/hooks/useAppTheme';
import {getWorkoutThumbnail} from '@app/lib/workoutThumbnails';
import type {EllieGeneratedWorkout} from '@app/services/supabase/ellie-actions';
import {EllieCardActions} from '@app/features/ellie/components/EllieCardActions';

type EllieGeneratedWorkoutCardProps = {
  workout: EllieGeneratedWorkout;
  saved?: boolean;
  isSaving?: boolean;
  isRegenerating?: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onRegenerate: () => void;
};

function formatExerciseLine(exercise: EllieGeneratedWorkout['exercises'][number]) {
  const parts: string[] = [];

  if (exercise.sets && exercise.reps) {
    parts.push(`${exercise.sets}x${exercise.reps}`);
  } else if (exercise.duration) {
    parts.push(`${exercise.duration}s`);
  }

  if (exercise.restTime) {
    parts.push(`${exercise.restTime}s descanso`);
  }

  return parts.join(' · ');
}

export function EllieGeneratedWorkoutCard({
  workout,
  saved = false,
  isSaving = false,
  isRegenerating = false,
  onSave,
  onDiscard,
  onRegenerate,
}: EllieGeneratedWorkoutCardProps) {
  const {theme} = useAppTheme();
  const heroSource = workout.imageUrl
    ? {uri: workout.imageUrl}
    : getWorkoutThumbnail(workout.type, workout.targetMuscles, workout.title);

  const styles = StyleSheet.create({
    card: {
      width: '92%',
      alignSelf: 'flex-start',
      overflow: 'hidden',
      borderRadius: 24,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    heroWrap: {
      height: 126,
      position: 'relative',
      justifyContent: 'flex-end',
    },
    heroImage: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
    heroOverlay: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: 'rgba(10, 10, 10, 0.32)',
    },
    heroFade: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 48,
      backgroundColor: 'rgba(255, 255, 255, 0.92)',
    },
    heroLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingBottom: 10,
      zIndex: 1,
    },
    heroLabelText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 0.6,
    },
    body: {
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 14,
      gap: 12,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 21,
      fontWeight: theme.typography.weights.bold,
      lineHeight: 28,
      letterSpacing: -0.5,
    },
    description: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 4,
    },
    chipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    chip: {
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.surfaceMuted,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    chipLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      textTransform: 'lowercase',
    },
    exercisesTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      fontWeight: theme.typography.weights.semibold,
    },
    exercisesWrap: {
      gap: 10,
    },
    exerciseRow: {
      flexDirection: 'row',
      gap: 10,
      paddingBottom: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    exerciseRowLast: {
      borderBottomWidth: 0,
      paddingBottom: 0,
    },
    exerciseIndex: {
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
      marginTop: 1,
    },
    exerciseIndexLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      fontWeight: theme.typography.weights.semibold,
    },
    exerciseContent: {
      flex: 1,
    },
    exerciseName: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      fontWeight: theme.typography.weights.medium,
    },
    exerciseMeta: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      marginTop: 3,
    },
  });

  return (
    <View style={styles.card}>
      <View style={styles.heroWrap}>
        <Image resizeMode="cover" source={heroSource} style={styles.heroImage} />
        <View style={styles.heroOverlay} />
        <View style={styles.heroFade} />
        <View style={styles.heroLabel}>
          <Sparkles color={theme.colors.textPrimary} size={12} strokeWidth={2} />
          <Text style={styles.heroLabelText}>GENERADO POR ELLIE</Text>
        </View>
      </View>

      <View style={styles.body}>
        <View>
          <Text style={styles.title}>{workout.title}</Text>
          {workout.description ? (
            <Text style={styles.description}>{workout.description}</Text>
          ) : null}
        </View>

        <View style={styles.chipsRow}>
          {[
            workout.type,
            workout.difficulty,
            `${workout.duration} min`,
            `~${workout.calories} kcal`,
          ].map(item => (
            <View key={item} style={styles.chip}>
              <Text style={styles.chipLabel}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.exercisesWrap}>
          <Text style={styles.exercisesTitle}>
            Ejercicios ({workout.exercises.length})
          </Text>
          {workout.exercises.slice(0, 5).map((exercise, index, array) => (
            <View
              key={`${exercise.name}-${index}`}
              style={[
                styles.exerciseRow,
                index === array.length - 1 ? styles.exerciseRowLast : null,
              ]}>
              <View style={styles.exerciseIndex}>
                <Text style={styles.exerciseIndexLabel}>{index + 1}</Text>
              </View>
              <View style={styles.exerciseContent}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                {formatExerciseLine(exercise) ? (
                  <Text style={styles.exerciseMeta}>
                    {formatExerciseLine(exercise)}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>

        <EllieCardActions
          saved={saved}
          savedLabel="Guardada en tus entrenos"
          primaryLabel="Guardar rutina"
          onPrimary={onSave}
          onDiscard={onDiscard}
          onRegenerate={onRegenerate}
          isPrimaryBusy={isSaving}
          isRegenerating={isRegenerating}
        />
      </View>
    </View>
  );
}
