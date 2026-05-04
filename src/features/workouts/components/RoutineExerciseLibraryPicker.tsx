import {Search} from 'lucide-react-native';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {AppTextInput, Button, Card, Chip, EmptyState} from '@app/components/ui';
import {useAppTheme} from '@app/hooks/useAppTheme';
import {
  equipmentLabels,
  type LibraryExercise,
} from '@app/shared';

type RoutineExerciseLibraryPickerProps = {
  exercises: LibraryExercise[];
  selectedExerciseIds: string[];
  searchQuery: string;
  equipmentFilter: string | null;
  selectedCount: number;
  replaceExerciseName?: string | null;
  onSearchChange: (value: string) => void;
  onEquipmentChange: (value: string | null) => void;
  onSelectExercise: (exercise: LibraryExercise) => void;
  onContinue: () => void;
  onCancelReplace?: () => void;
};

export function RoutineExerciseLibraryPicker({
  exercises,
  selectedExerciseIds,
  searchQuery,
  equipmentFilter,
  selectedCount,
  replaceExerciseName,
  onSearchChange,
  onEquipmentChange,
  onSelectExercise,
  onContinue,
  onCancelReplace,
}: RoutineExerciseLibraryPickerProps) {
  const {theme} = useAppTheme();
  const equipmentOptions = Array.from(
    new Set(exercises.map(exercise => exercise.equipment)),
  ).filter(Boolean);

  const styles = StyleSheet.create({
    container: {
      gap: theme.spacing.md,
    },
    helperCard: {
      gap: theme.spacing.sm,
    },
    helperTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      fontWeight: theme.typography.weights.semibold,
    },
    helperText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      lineHeight: 18,
    },
    actionsRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
    list: {
      gap: theme.spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    rowSelected: {
      borderColor: theme.colors.textPrimary,
      backgroundColor: theme.colors.surfaceMuted,
    },
    image: {
      width: 54,
      height: 54,
      borderRadius: 14,
      backgroundColor: theme.colors.surfaceMuted,
    },
    content: {
      flex: 1,
      gap: 3,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      fontWeight: theme.typography.weights.semibold,
    },
    meta: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
    },
    stateBubble: {
      minWidth: 26,
      height: 26,
      paddingHorizontal: 8,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },
    stateBubbleActive: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    stateLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.semibold,
    },
    stateLabelActive: {
      color: theme.colors.accentContrast,
    },
  });

  return (
    <View style={styles.container}>
      <Card style={styles.helperCard}>
        <Text style={styles.helperTitle}>
          {replaceExerciseName
            ? `Selecciona el reemplazo para "${replaceExerciseName}"`
            : `${selectedCount} ejercicio${
                selectedCount === 1 ? '' : 's'
              } seleccionado${selectedCount === 1 ? '' : 's'}`}
        </Text>
        <Text style={styles.helperText}>
          {replaceExerciseName
            ? 'Al tocar un ejercicio lo reemplazaremos dentro de la rutina.'
            : 'Toca un ejercicio para agregarlo o quitarlo. Luego podrás ajustar orden, descansos y notas.'}
        </Text>
        <View style={styles.actionsRow}>
          {!replaceExerciseName ? (
            <Button
              label="Configurar rutina"
              onPress={onContinue}
              disabled={selectedCount === 0}
              fullWidth={false}
            />
          ) : null}
          {replaceExerciseName && onCancelReplace ? (
            <Button
              label="Cancelar reemplazo"
              variant="outline"
              onPress={onCancelReplace}
              fullWidth={false}
            />
          ) : null}
        </View>
      </Card>

      <AppTextInput
        label="Buscar ejercicio"
        value={searchQuery}
        onChangeText={onSearchChange}
        placeholder="Buscar ejercicio"
        rightAccessory={
          <Search
            color={theme.colors.textSecondary}
            size={16}
            strokeWidth={2.1}
          />
        }
      />

      <View style={styles.chips}>
        <Chip
          selected={!equipmentFilter}
          onPress={() => onEquipmentChange(null)}>
          Todos
        </Chip>
        {equipmentOptions.map(option => (
          <Chip
            key={option}
            selected={equipmentFilter === option}
            onPress={() => onEquipmentChange(option)}>
            {equipmentLabels[option] || option}
          </Chip>
        ))}
      </View>

      {exercises.length === 0 ? (
        <EmptyState
          title="No encontramos ejercicios"
          description="Prueba con otra búsqueda o cambia el filtro de equipo."
        />
      ) : (
        <View style={styles.list}>
          {exercises.map(exercise => {
            const selected = selectedExerciseIds.includes(exercise.id);
            return (
              <Pressable
                key={exercise.id}
                onPress={() => onSelectExercise(exercise)}
                style={[
                  styles.row,
                  selected && !replaceExerciseName ? styles.rowSelected : null,
                ]}>
                <Image
                  source={{uri: exercise.thumbnailUrl}}
                  style={styles.image}
                  resizeMode="cover"
                />
                <View style={styles.content}>
                  <Text style={styles.title}>{exercise.name}</Text>
                  <Text style={styles.meta}>
                    {(equipmentLabels[exercise.equipment] || exercise.equipment) ||
                      'Sin equipo'}{' '}
                    · {exercise.bodyPart}
                  </Text>
                </View>
                <View
                  style={[
                    styles.stateBubble,
                    selected && !replaceExerciseName
                      ? styles.stateBubbleActive
                      : null,
                  ]}>
                  <Text
                    style={[
                      styles.stateLabel,
                      selected && !replaceExerciseName
                        ? styles.stateLabelActive
                        : null,
                    ]}>
                    {replaceExerciseName ? '↺' : selected ? '✓' : '+'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
