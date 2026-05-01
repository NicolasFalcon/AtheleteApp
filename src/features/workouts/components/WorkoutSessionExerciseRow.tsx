import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Check, ChevronRight} from 'lucide-react-native';
import {useAppTheme} from '@app/hooks/useAppTheme';
import type {WorkoutExercise} from '@app/shared';

type WorkoutSessionExerciseRowProps = {
  exercise: WorkoutExercise;
  index: number;
  completed: boolean;
  interactive: boolean;
  canOpenDetail: boolean;
  onToggle: () => void;
  onOpenDetail: () => void;
};

export function WorkoutSessionExerciseRow({
  exercise,
  index,
  completed,
  interactive,
  canOpenDetail,
  onToggle,
  onOpenDetail,
}: WorkoutSessionExerciseRowProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    row: {
      borderRadius: theme.radii.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      opacity: completed ? 0.62 : 1,
    },
    indexBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: completed ? theme.colors.success : theme.colors.surfaceMuted,
    },
    indexLabel: {
      color: completed ? theme.colors.accentContrast : theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      fontWeight: theme.typography.weights.bold,
    },
    contentButton: {
      flex: 1,
      gap: 4,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      fontWeight: theme.typography.weights.medium,
    },
    titleCompleted: {
      textDecorationLine: 'line-through',
      color: theme.colors.textSecondary,
    },
    meta: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      lineHeight: 18,
    },
    toggle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

  const parts: string[] = [];

  if (exercise.sets && exercise.reps) {
    parts.push(`${exercise.sets}×${exercise.reps}`);
  } else if (exercise.duration) {
    parts.push(`${exercise.duration}s`);
  }

  if (exercise.restTime > 0) {
    parts.push(`${exercise.restTime}s desc.`);
  }

  return (
    <View style={styles.row}>
      <View style={styles.indexBadge}>
        <Text style={styles.indexLabel}>{index + 1}</Text>
      </View>

      <Pressable
        disabled={!canOpenDetail}
        onPress={onOpenDetail}
        style={({pressed}) => [
          styles.contentButton,
          pressed && canOpenDetail ? {opacity: 0.75} : null,
        ]}>
        <Text style={[styles.title, completed ? styles.titleCompleted : null]}>
          {exercise.name}
        </Text>
        <Text style={styles.meta}>
          {parts.join(' · ') || 'Sin esquema definido'}
          {exercise.notes ? ` · ${exercise.notes}` : ''}
        </Text>
      </Pressable>

      {canOpenDetail ? (
        <ChevronRight color={theme.colors.textSecondary} size={18} />
      ) : null}

      <Pressable
        disabled={!interactive}
        onPress={onToggle}
        style={({pressed}) => [
          styles.toggle,
          {
            borderColor: completed ? theme.colors.success : theme.colors.border,
            backgroundColor: completed ? theme.colors.success : 'transparent',
          },
          pressed && interactive ? {transform: [{scale: 0.94}]} : null,
        ]}>
        {completed ? (
          <Check
            color={theme.colors.accentContrast}
            size={14}
            strokeWidth={2.4}
          />
        ) : null}
      </Pressable>
    </View>
  );
}
