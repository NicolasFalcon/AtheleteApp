import {Minus, Plus} from 'lucide-react-native';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {AppTextInput, Button, Card, Chip} from '@app/components/ui';
import {useAppTheme} from '@app/hooks/useAppTheme';
import type {Workout} from '@app/shared';

const workoutTypes = [
  {id: 'strength', label: 'Fuerza'},
  {id: 'cardio', label: 'Cardio'},
  {id: 'fullbody', label: 'Full body'},
  {id: 'hiit', label: 'HIIT'},
  {id: 'mobility', label: 'Movilidad'},
] as const;

const difficultyLevels = [
  {id: 'beginner', label: 'Principiante'},
  {id: 'intermediate', label: 'Intermedio'},
  {id: 'advanced', label: 'Avanzado'},
] as const;

type RoutineMetadataFormProps = {
  title: string;
  description: string;
  type: Workout['type'];
  difficulty: Workout['difficulty'];
  duration: number;
  calories: number;
  targetFocusInput: string;
  tagsInput: string;
  hasManualCalories: boolean;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onTypeChange: (value: Workout['type']) => void;
  onDifficultyChange: (value: Workout['difficulty']) => void;
  onDurationChange: (value: number) => void;
  onCaloriesChange: (value: number, mode?: 'manual' | 'auto') => void;
  onTargetFocusChange: (value: string) => void;
  onTagsChange: (value: string) => void;
  onContinue: () => void;
  canContinue: boolean;
};

function NumberStepper({
  value,
  suffix,
  onDecrement,
  onIncrement,
}: {
  value: string;
  suffix?: string;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  const {theme} = useAppTheme();
  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    button: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    valueShell: {
      flex: 1,
      minHeight: 52,
      borderRadius: theme.radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.md,
    },
    valueLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      fontWeight: theme.typography.weights.semibold,
    },
    suffix: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
    },
  });

  return (
    <View style={styles.container}>
      <Pressable onPress={onDecrement} style={styles.button}>
        <Minus color={theme.colors.textPrimary} size={16} strokeWidth={2.2} />
      </Pressable>
      <View style={styles.valueShell}>
        <Text style={styles.valueLabel}>
          {value}
          {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
        </Text>
      </View>
      <Pressable onPress={onIncrement} style={styles.button}>
        <Plus color={theme.colors.textPrimary} size={16} strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}

export function RoutineMetadataForm({
  title,
  description,
  type,
  difficulty,
  duration,
  calories,
  targetFocusInput,
  tagsInput,
  hasManualCalories,
  onTitleChange,
  onDescriptionChange,
  onTypeChange,
  onDifficultyChange,
  onDurationChange,
  onCaloriesChange,
  onTargetFocusChange,
  onTagsChange,
  onContinue,
  canContinue,
}: RoutineMetadataFormProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      gap: theme.spacing.lg,
    },
    section: {
      gap: theme.spacing.sm,
    },
    label: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      fontWeight: theme.typography.weights.medium,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
    helperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    helperText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
    },
    resetButton: {
      alignSelf: 'flex-start',
    },
    resetLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      textDecorationLine: 'underline',
    },
    descriptionInput: {
      minHeight: 86,
      textAlignVertical: 'top',
      paddingTop: 12,
    },
  });

  return (
    <Card style={styles.card}>
      <AppTextInput
        label="Nombre de la rutina"
        value={title}
        onChangeText={onTitleChange}
        placeholder="Ej: Full body del viernes"
      />

      <AppTextInput
        label="Descripción"
        value={description}
        onChangeText={onDescriptionChange}
        placeholder="Objetivo, contexto o foco de esta rutina"
        hint="Opcional. Se mostrará en el detalle de rutina."
        multiline
        inputStyle={styles.descriptionInput}
      />

      <View style={styles.section}>
        <Text style={styles.label}>Tipo de entrenamiento</Text>
        <View style={styles.chips}>
          {workoutTypes.map(option => (
            <Chip
              key={option.id}
              selected={type === option.id}
              onPress={() => onTypeChange(option.id)}>
              {option.label}
            </Chip>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Dificultad</Text>
        <View style={styles.chips}>
          {difficultyLevels.map(option => (
            <Chip
              key={option.id}
              selected={difficulty === option.id}
              onPress={() => onDifficultyChange(option.id)}>
              {option.label}
            </Chip>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Duración estimada</Text>
        <NumberStepper
          value={`${duration}`}
          suffix=" min"
          onDecrement={() => onDurationChange(Math.max(5, duration - 5))}
          onIncrement={() => onDurationChange(Math.min(240, duration + 5))}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.helperRow}>
          <Text style={styles.label}>Calorías</Text>
          {!hasManualCalories ? (
            <Text style={styles.helperText}>Estimadas automáticamente</Text>
          ) : null}
        </View>
        <NumberStepper
          value={`${calories}`}
          suffix=" kcal"
          onDecrement={() =>
            onCaloriesChange(Math.max(50, calories - 25), 'manual')
          }
          onIncrement={() => onCaloriesChange(calories + 25, 'manual')}
        />
        {hasManualCalories ? (
          <Pressable
            onPress={() => onCaloriesChange(calories, 'auto')}
            style={styles.resetButton}>
            <Text style={styles.resetLabel}>Volver al estimado</Text>
          </Pressable>
        ) : null}
      </View>

      <AppTextInput
        label="Enfoque o grupos objetivo"
        value={targetFocusInput}
        onChangeText={onTargetFocusChange}
        placeholder="Pecho, espalda, glúteos"
        hint="Separa cada grupo con coma."
      />

      <AppTextInput
        label="Tags"
        value={tagsInput}
        onChangeText={onTagsChange}
        placeholder="fuerza, gym, upper body"
        hint="Separa cada tag con coma."
      />

      <Button label="Continuar" onPress={onContinue} disabled={!canContinue} />
    </Card>
  );
}
