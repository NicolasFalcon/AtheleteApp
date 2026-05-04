import {useMemo, useState} from 'react';
import {Repeat, Ruler, Timer, Trophy, Weight} from 'lucide-react-native';
import {StyleSheet, Text, View} from 'react-native';
import {
  AppTextInput,
  Button,
  Chip,
  HorizontalItemRail,
  SearchField,
} from '@app/components/ui';
import {useAppTheme} from '@app/hooks/useAppTheme';
import {type LibraryExercise} from '@app/shared';
import {prTypeLabels, type PRInsert, type PRType} from '@app/shared';

type PrFormProps = {
  exercises: LibraryExercise[];
  selectedExercise: LibraryExercise | null;
  onSelectExercise: (exercise: LibraryExercise) => void;
  showExercisePicker: boolean;
  loading?: boolean;
  onSubmit: (payload: PRInsert) => Promise<void>;
};

const PR_TYPE_OPTIONS: Array<{
  key: PRType;
  label: string;
  icon: typeof Weight;
}> = [
  {key: 'max_weight', label: 'Peso máximo', icon: Weight},
  {key: 'weight_reps', label: 'Peso + reps', icon: Repeat},
  {key: 'max_reps', label: 'Repeticiones', icon: Repeat},
  {key: 'duration', label: 'Tiempo', icon: Timer},
  {key: 'distance', label: 'Distancia', icon: Ruler},
];

export function PrForm({
  exercises,
  selectedExercise,
  onSelectExercise,
  showExercisePicker,
  loading = false,
  onSubmit,
}: PrFormProps) {
  const {theme} = useAppTheme();
  const [search, setSearch] = useState('');
  const [prType, setPrType] = useState<PRType>('weight_reps');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [durationMin, setDurationMin] = useState('');
  const [durationSec, setDurationSec] = useState('');
  const [distance, setDistance] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const filteredExercises = useMemo(() => {
    if (!search.trim()) {
      return exercises.slice(0, 18);
    }

    const query = search.toLowerCase();
    return exercises
      .filter(exercise => exercise.name.toLowerCase().includes(query))
      .slice(0, 18);
  }, [exercises, search]);

  const styles = StyleSheet.create({
    shell: {
      gap: theme.spacing.lg,
    },
    section: {
      gap: theme.spacing.sm,
    },
    sectionLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      fontWeight: theme.typography.weights.medium,
      textTransform: 'uppercase',
      letterSpacing: 0.9,
    },
    selectedExercise: {
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.surfaceMuted,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    selectedExerciseLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      fontWeight: theme.typography.weights.semibold,
    },
    railContent: {
      paddingRight: theme.spacing.sm,
      gap: theme.spacing.xs,
    },
    exerciseChip: {
      minHeight: 38,
    },
    typeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
    chipContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    chipText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      fontWeight: theme.typography.weights.medium,
    },
    chipTextActive: {
      color: theme.colors.accentContrast,
    },
    row: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    field: {
      flex: 1,
    },
    error: {
      color: theme.colors.danger,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
    },
  });

  const validate = () => {
    if (!selectedExercise) {
      return 'Selecciona un ejercicio para continuar.';
    }

    if (prType === 'max_weight' && !(parseFloat(weight) > 0)) {
      return 'Ingresa un peso válido.';
    }

    if (
      prType === 'weight_reps' &&
      (!(parseFloat(weight) > 0) || !(parseInt(reps, 10) > 0))
    ) {
      return 'Ingresa peso y repeticiones válidas.';
    }

    if (prType === 'max_reps' && !(parseInt(reps, 10) > 0)) {
      return 'Ingresa un número válido de repeticiones.';
    }

    if (
      prType === 'duration' &&
      !(
        parseInt(durationMin || '0', 10) > 0 ||
        parseInt(durationSec || '0', 10) > 0
      )
    ) {
      return 'Ingresa una duración válida.';
    }

    if (prType === 'distance' && !(parseFloat(distance) > 0)) {
      return 'Ingresa una distancia válida.';
    }

    return null;
  };

  const handleSubmit = async () => {
    const nextError = validate();
    setError(nextError);

    if (nextError || !selectedExercise) {
      return;
    }

    await onSubmit({
      exerciseId: selectedExercise.id,
      prType,
      valueWeight:
        prType === 'max_weight' || prType === 'weight_reps'
          ? parseFloat(weight)
          : null,
      valueReps:
        prType === 'weight_reps' || prType === 'max_reps'
          ? parseInt(reps, 10)
          : null,
      valueDurationSec:
        prType === 'duration'
          ? parseInt(durationMin || '0', 10) * 60 +
            parseInt(durationSec || '0', 10)
          : null,
      valueDistanceM: prType === 'distance' ? parseFloat(distance) : null,
      notes: notes.trim() || null,
    });
  };

  return (
    <View style={styles.shell}>
      {showExercisePicker ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Ejercicio</Text>
          {selectedExercise ? (
            <View style={styles.selectedExercise}>
              <Text style={styles.selectedExerciseLabel}>
                {selectedExercise.name}
              </Text>
            </View>
          ) : null}
          <SearchField
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar ejercicio"
          />
          <HorizontalItemRail contentStyle={styles.railContent}>
            {filteredExercises.map(exercise => (
              <Chip
                key={exercise.id}
                selected={selectedExercise?.id === exercise.id}
                onPress={() => onSelectExercise(exercise)}
                style={styles.exerciseChip}>
                {exercise.name}
              </Chip>
            ))}
          </HorizontalItemRail>
        </View>
      ) : selectedExercise ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Ejercicio</Text>
          <View style={styles.selectedExercise}>
            <Text style={styles.selectedExerciseLabel}>{selectedExercise.name}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Tipo de récord</Text>
        <View style={styles.typeGrid}>
          {PR_TYPE_OPTIONS.map(option => {
            const Icon = option.icon;
            const active = option.key === prType;

            return (
              <Chip
                key={option.key}
                selected={active}
                onPress={() => setPrType(option.key)}>
                <View style={styles.chipContent}>
                  <Icon
                    color={
                      active ? theme.colors.accentContrast : theme.colors.textPrimary
                    }
                    size={14}
                    strokeWidth={2}
                  />
                  <Text
                    style={[styles.chipText, active ? styles.chipTextActive : null]}>
                    {prTypeLabels[option.key]}
                  </Text>
                </View>
              </Chip>
            );
          })}
        </View>
      </View>

      {(prType === 'max_weight' || prType === 'weight_reps') && (
        <View style={styles.row}>
          <View style={styles.field}>
            <AppTextInput
              label="Peso (kg)"
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              placeholder="0"
            />
          </View>
          {prType === 'weight_reps' ? (
            <View style={styles.field}>
              <AppTextInput
                label="Repeticiones"
                value={reps}
                onChangeText={setReps}
                keyboardType="number-pad"
                placeholder="0"
              />
            </View>
          ) : null}
        </View>
      )}

      {prType === 'max_reps' ? (
        <AppTextInput
          label="Repeticiones"
          value={reps}
          onChangeText={setReps}
          keyboardType="number-pad"
          placeholder="0"
        />
      ) : null}

      {prType === 'duration' ? (
        <View style={styles.row}>
          <View style={styles.field}>
            <AppTextInput
              label="Minutos"
              value={durationMin}
              onChangeText={setDurationMin}
              keyboardType="number-pad"
              placeholder="0"
            />
          </View>
          <View style={styles.field}>
            <AppTextInput
              label="Segundos"
              value={durationSec}
              onChangeText={setDurationSec}
              keyboardType="number-pad"
              placeholder="0"
            />
          </View>
        </View>
      ) : null}

      {prType === 'distance' ? (
        <AppTextInput
          label="Distancia (m)"
          value={distance}
          onChangeText={setDistance}
          keyboardType="decimal-pad"
          placeholder="0"
        />
      ) : null}

      <AppTextInput
        label="Notas"
        value={notes}
        onChangeText={setNotes}
        placeholder="Opcional"
        multiline
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        label="Guardar récord"
        loading={loading}
        onPress={handleSubmit}
        accessoryRight={
          <Trophy
            color={theme.colors.accentContrast}
            size={16}
            strokeWidth={2}
          />
        }
      />
    </View>
  );
}
