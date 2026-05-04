import {
  ArrowDown,
  ArrowUp,
  Minus,
  RefreshCcw,
  Trash2,
  Plus,
} from 'lucide-react-native';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {AppTextInput, Button, Card, Chip} from '@app/components/ui';
import {useAppTheme} from '@app/hooks/useAppTheme';
import {
  bodyPartLabels,
  equipmentLabels,
} from '@app/shared';
import type {
  BuilderExercise,
  ExerciseMetricMode,
} from '@app/features/workouts/types';

type RoutineExerciseRowProps = {
  exercise: BuilderExercise;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  metricMode: ExerciseMetricMode;
  onMove: (direction: 'up' | 'down') => void;
  onRemove: () => void;
  onReplace: () => void;
  onMetricModeChange: (mode: ExerciseMetricMode) => void;
  onNumberChange: (
    field: 'sets' | 'reps' | 'duration' | 'restTime',
    delta: number,
  ) => void;
  onNotesChange: (notes: string) => void;
};

function CounterField({
  label,
  value,
  suffix,
  onDecrement,
  onIncrement,
}: {
  label: string;
  value: string;
  suffix?: string;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    label: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    action: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
    },
    valueShell: {
      flex: 1,
      minHeight: 34,
      borderRadius: theme.radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.sm,
    },
    value: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      fontWeight: theme.typography.weights.semibold,
    },
    suffix: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.sizes.caption,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable onPress={onDecrement} style={styles.action}>
          <Minus color={theme.colors.textPrimary} size={14} strokeWidth={2.2} />
        </Pressable>
        <View style={styles.valueShell}>
          <Text style={styles.value}>
            {value}
            {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
          </Text>
        </View>
        <Pressable onPress={onIncrement} style={styles.action}>
          <Plus color={theme.colors.textPrimary} size={14} strokeWidth={2.2} />
        </Pressable>
      </View>
    </View>
  );
}

export function RoutineExerciseRow({
  exercise,
  index,
  isFirst,
  isLast,
  metricMode,
  onMove,
  onRemove,
  onReplace,
  onMetricModeChange,
  onNumberChange,
  onNotesChange,
}: RoutineExerciseRowProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      gap: theme.spacing.md,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.md,
    },
    moveColumn: {
      gap: theme.spacing.xs,
    },
    moveButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
      opacity: 1,
    },
    moveButtonDisabled: {
      opacity: 0.35,
    },
    content: {
      flex: 1,
      gap: theme.spacing.sm,
    },
    contentText: {
      flex: 1,
    },
    contentTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    stepLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      fontWeight: theme.typography.weights.semibold,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    name: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      fontWeight: theme.typography.weights.semibold,
    },
    meta: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      lineHeight: 18,
      marginTop: 2,
    },
    removeButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    actionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
    sectionLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
    },
    metricRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
    statsRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    notesInput: {
      textAlignVertical: 'top',
    },
  });

  const metadata = exercise.libraryExercise
    ? `${equipmentLabels[exercise.libraryExercise.equipment] || exercise.libraryExercise.equipment} · ${
        bodyPartLabels[exercise.libraryExercise.bodyPart] ||
        exercise.libraryExercise.bodyPart
      }`
    : 'Ejercicio guardado dentro de esta rutina';

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.moveColumn}>
          <Pressable
            onPress={() => onMove('up')}
            disabled={isFirst}
            style={[styles.moveButton, isFirst ? styles.moveButtonDisabled : null]}>
            <ArrowUp color={theme.colors.textPrimary} size={14} strokeWidth={2.2} />
          </Pressable>
          <Pressable
            onPress={() => onMove('down')}
            disabled={isLast}
            style={[styles.moveButton, isLast ? styles.moveButtonDisabled : null]}>
            <ArrowDown
              color={theme.colors.textPrimary}
              size={14}
              strokeWidth={2.2}
            />
          </Pressable>
        </View>

        <View style={styles.content}>
          <View style={styles.contentTopRow}>
            <View style={styles.contentText}>
              <Text style={styles.stepLabel}>Ejercicio {index + 1}</Text>
              <Text style={styles.name}>{exercise.name}</Text>
              <Text style={styles.meta}>{metadata}</Text>
            </View>
            <Pressable onPress={onRemove} style={styles.removeButton}>
              <Trash2 color={theme.colors.danger} size={16} strokeWidth={2.2} />
            </Pressable>
          </View>

          <View style={styles.actionRow}>
            <Button
              label="Reemplazar"
              variant="outline"
              fullWidth={false}
              onPress={onReplace}
              accessoryRight={
                <RefreshCcw
                  color={theme.colors.textPrimary}
                  size={14}
                  strokeWidth={2.2}
                />
              }
            />
          </View>
        </View>
      </View>

      <View>
        <Text style={styles.sectionLabel}>Formato</Text>
        <View style={styles.metricRow}>
          <Chip
            selected={metricMode === 'reps'}
            onPress={() => onMetricModeChange('reps')}>
            Series y reps
          </Chip>
          <Chip
            selected={metricMode === 'duration'}
            onPress={() => onMetricModeChange('duration')}>
            Tiempo
          </Chip>
        </View>
      </View>

      <View style={styles.statsRow}>
        <CounterField
          label="Series"
          value={`${exercise.sets ?? 1}`}
          onDecrement={() => onNumberChange('sets', -1)}
          onIncrement={() => onNumberChange('sets', 1)}
        />
        {metricMode === 'reps' ? (
          <CounterField
            label="Reps"
            value={`${exercise.reps ?? 1}`}
            onDecrement={() => onNumberChange('reps', -1)}
            onIncrement={() => onNumberChange('reps', 1)}
          />
        ) : (
          <CounterField
            label="Duración"
            value={`${exercise.duration ?? 45}`}
            suffix=" s"
            onDecrement={() => onNumberChange('duration', -5)}
            onIncrement={() => onNumberChange('duration', 5)}
          />
        )}
        <CounterField
          label="Descanso"
          value={`${exercise.restTime ?? 60}`}
          suffix=" s"
          onDecrement={() => onNumberChange('restTime', -15)}
          onIncrement={() => onNumberChange('restTime', 15)}
        />
      </View>

      <AppTextInput
        label="Notas"
        value={exercise.notes}
        onChangeText={onNotesChange}
        placeholder="Técnica, tempo, observaciones..."
        multiline
        numberOfLines={4}
        inputStyle={styles.notesInput}
      />
    </Card>
  );
}
