import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Bookmark,
  Check,
  ChevronRight,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react-native';
import {useAppTheme} from '@app/hooks/useAppTheme';
import {getWorkoutThumbnail} from '@app/lib/workoutThumbnails';
import type {EllieGeneratedWorkout} from '@app/services/supabase/ellie-actions';

type EllieGeneratedWorkoutCardProps = {
  workout: EllieGeneratedWorkout;
  saved?: boolean;
  isSaving?: boolean;
  isRegenerating?: boolean;
  onSave: () => void;
  onRegenerate: () => void;
  onAdjust: () => void;
};

function formatExerciseLine(
  exercise: EllieGeneratedWorkout['exercises'][number],
) {
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

function formatDifficulty(value: EllieGeneratedWorkout['difficulty']) {
  const labels: Record<EllieGeneratedWorkout['difficulty'], string> = {
    beginner: 'principiante',
    intermediate: 'intermedio',
    advanced: 'avanzado',
  };

  return labels[value];
}

export function EllieGeneratedWorkoutCard({
  workout,
  saved = false,
  isSaving = false,
  isRegenerating = false,
  onSave,
  onRegenerate,
  onAdjust,
}: EllieGeneratedWorkoutCardProps) {
  const {theme} = useAppTheme();
  const heroSource = workout.imageUrl
    ? {uri: workout.imageUrl}
    : getWorkoutThumbnail(workout.type, workout.targetMuscles, workout.title);
  const previewExercises = workout.exercises.slice(0, 4);
  const metadata = [
    workout.type,
    formatDifficulty(workout.difficulty),
    `${workout.duration} min`,
    `~${workout.calories} kcal`,
  ];

  const styles = StyleSheet.create({
    card: {
      width: '100%',
      alignSelf: 'center',
      borderRadius: 24,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(17,17,17,0.08)',
      padding: 12,
      shadowColor: '#000000',
      shadowOpacity: 0.06,
      shadowRadius: 26,
      shadowOffset: {width: 0, height: 12},
      elevation: 2,
    },
    sourceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 2,
      paddingBottom: 10,
    },
    sourceText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      fontWeight: theme.typography.weights.medium,
    },
    heroImage: {
      width: '100%',
      height: 142,
      borderRadius: 16,
      backgroundColor: theme.colors.surfaceMuted,
    },
    content: {
      paddingHorizontal: 10,
      paddingTop: 14,
      paddingBottom: 8,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 20,
      fontWeight: theme.typography.weights.bold,
      lineHeight: 26,
    },
    description: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      lineHeight: 20,
      marginTop: 8,
    },
    chipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 16,
    },
    chip: {
      minHeight: 30,
      borderRadius: theme.radii.pill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(17,17,17,0.1)',
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      textTransform: 'lowercase',
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
      marginTop: 18,
      marginBottom: 14,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 15,
      fontWeight: theme.typography.weights.semibold,
      marginBottom: 8,
    },
    exerciseRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    exerciseIndex: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    exerciseIndexLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      fontWeight: theme.typography.weights.semibold,
    },
    exerciseContent: {
      flex: 1,
    },
    exerciseName: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      fontWeight: theme.typography.weights.medium,
      lineHeight: 19,
    },
    exerciseMeta: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 2,
    },
    fullRoutineButton: {
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 12,
      paddingTop: 14,
      paddingBottom: 16,
    },
    fullRoutineText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      fontWeight: theme.typography.weights.medium,
      textDecorationLine: 'underline',
    },
    primaryButton: {
      minHeight: 48,
      borderRadius: 14,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 10,
    },
    primaryLabel: {
      color: theme.colors.accentContrast,
      fontFamily: theme.typography.fontFamily,
      fontSize: 15,
      fontWeight: theme.typography.weights.semibold,
    },
    secondaryRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 12,
    },
    secondaryButton: {
      flex: 1,
      minHeight: 44,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(17,17,17,0.12)',
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    secondaryLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      fontWeight: theme.typography.weights.medium,
    },
    savedRow: {
      minHeight: 46,
      borderRadius: 14,
      backgroundColor: 'rgba(46,107,76,0.08)',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    savedText: {
      color: theme.colors.success,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      fontWeight: theme.typography.weights.medium,
    },
  });

  return (
    <View style={styles.card}>
      <View style={styles.sourceRow}>
        <Sparkles color={theme.colors.textPrimary} size={15} strokeWidth={2} />
        <Text style={styles.sourceText}>Generado por ELLIE</Text>
      </View>

      <Image resizeMode="cover" source={heroSource} style={styles.heroImage} />

      <View style={styles.content}>
        <Text style={styles.title}>{workout.title}</Text>
        {workout.description ? (
          <Text style={styles.description}>{workout.description}</Text>
        ) : null}

        <View style={styles.chipsRow}>
          {metadata.map(item => (
            <View key={item} style={styles.chip}>
              <Text style={styles.chipLabel}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Ejercicios</Text>
        {previewExercises.map((exercise, index) => (
          <View key={`${exercise.name}-${index}`} style={styles.exerciseRow}>
            <View style={styles.exerciseIndex}>
              <Text style={styles.exerciseIndexLabel}>{index + 1}</Text>
            </View>
            <View style={styles.exerciseContent}>
              <Text numberOfLines={1} style={styles.exerciseName}>
                {exercise.name}
              </Text>
              {formatExerciseLine(exercise) ? (
                <Text style={styles.exerciseMeta}>
                  {formatExerciseLine(exercise)}
                </Text>
              ) : null}
            </View>
            <ChevronRight
              color={theme.colors.textPrimary}
              size={18}
              strokeWidth={2}
            />
          </View>
        ))}

        {workout.exercises.length > previewExercises.length ? (
          <Pressable style={styles.fullRoutineButton}>
            <Text style={styles.fullRoutineText}>Ver rutina completa</Text>
            <ChevronRight
              color={theme.colors.textPrimary}
              size={15}
              strokeWidth={2}
            />
          </Pressable>
        ) : null}

        {saved ? (
          <View style={styles.savedRow}>
            <Check color={theme.colors.success} size={16} strokeWidth={2.2} />
            <Text style={styles.savedText}>Guardada en tus entrenos</Text>
          </View>
        ) : (
          <>
            <Pressable
              disabled={isSaving || isRegenerating}
              onPress={onSave}
              style={({pressed}) => [
                styles.primaryButton,
                pressed && !isSaving && !isRegenerating ? {opacity: 0.92} : null,
                isSaving || isRegenerating ? {opacity: 0.7} : null,
              ]}>
              {isSaving ? (
                <ActivityIndicator color={theme.colors.accentContrast} />
              ) : (
                <>
                  <Bookmark
                    color={theme.colors.accentContrast}
                    size={18}
                    strokeWidth={2}
                  />
                  <Text style={styles.primaryLabel}>Guardar rutina</Text>
                </>
              )}
            </Pressable>

            <View style={styles.secondaryRow}>
              <Pressable
                disabled={isSaving || isRegenerating}
                onPress={onRegenerate}
                style={({pressed}) => [
                  styles.secondaryButton,
                  pressed && !isSaving && !isRegenerating
                    ? {opacity: 0.84}
                    : null,
                ]}>
                {isRegenerating ? (
                  <ActivityIndicator color={theme.colors.textPrimary} />
                ) : (
                  <>
                    <RefreshCw
                      color={theme.colors.textPrimary}
                      size={15}
                      strokeWidth={2}
                    />
                    <Text style={styles.secondaryLabel}>Otra versión</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                disabled={isSaving || isRegenerating}
                onPress={onAdjust}
                style={({pressed}) => [
                  styles.secondaryButton,
                  pressed && !isSaving && !isRegenerating
                    ? {opacity: 0.84}
                    : null,
                ]}>
                <SlidersHorizontal
                  color={theme.colors.textPrimary}
                  size={15}
                  strokeWidth={2}
                />
                <Text style={styles.secondaryLabel}>Ajustar</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </View>
  );
}
