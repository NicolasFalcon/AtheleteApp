import {
  Dumbbell,
  Gauge,
  SlidersHorizontal,
  Target,
} from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { EmptyState, Loader } from '@app/components/ui';
import { ExerciseFilterGroup } from '@app/features/workouts/components/ExerciseFilterGroup';
import { ExerciseLibraryHeader } from '@app/features/workouts/components/ExerciseLibraryHeader';
import { ExerciseListItem } from '@app/features/workouts/components/ExerciseListItem';
import { useAppTheme } from '@app/hooks/useAppTheme';
import {
  bodyPartLabels,
  equipmentLabels,
  levelLabels,
  type LibraryExercise,
} from '@app/shared';

const equipmentFilterKeys = [
  'all',
  'bodyweight',
  'dumbbells',
  'barbell',
  'machines',
  'cable',
  'bands',
  'kettlebells',
  'trx',
] as const;

const bodyPartFilterKeys = [
  'all',
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'core',
  'fullbody',
  'mobility',
  'cardio',
] as const;

const levelFilterKeys = [
  'all',
  'beginner',
  'intermediate',
  'advanced',
] as const;

type ExerciseLibraryPanelProps = {
  exercises: LibraryExercise[];
  totalExercisesCount: number;
  favoriteExerciseIds: string[];
  loading: boolean;
  viewMode: 'all' | 'favorites';
  searchQuery: string;
  equipmentFilter: string;
  bodyPartFilter: string;
  levelFilter: string;
  onViewModeChange: (value: 'all' | 'favorites') => void;
  onSearchChange: (value: string) => void;
  onEquipmentChange: (value: string) => void;
  onBodyPartChange: (value: string) => void;
  onLevelChange: (value: string) => void;
  onToggleFavorite: (exerciseId: string) => void;
  onSelectExercise: (exerciseId: string) => void;
};

export function ExerciseLibraryPanel({
  exercises,
  totalExercisesCount,
  favoriteExerciseIds,
  loading,
  viewMode,
  searchQuery,
  equipmentFilter,
  bodyPartFilter,
  levelFilter,
  onViewModeChange,
  onSearchChange,
  onEquipmentChange,
  onBodyPartChange,
  onLevelChange,
  onToggleFavorite,
  onSelectExercise,
}: ExerciseLibraryPanelProps) {
  const { theme } = useAppTheme();
  const activeFiltersCount = [
    equipmentFilter,
    bodyPartFilter,
    levelFilter,
  ].filter(value => value !== 'all').length;

  const styles = StyleSheet.create({
    container: {
      gap: theme.spacing.md,
    },
    helperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 2,
    },
    helperLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 0,
      textTransform: 'uppercase',
    },
    list: {
      gap: theme.spacing.sm,
    },
  });

  return (
    <View style={styles.container}>
      <ExerciseLibraryHeader
        totalCount={totalExercisesCount}
        visibleCount={exercises.length}
        viewMode={viewMode}
        activeFiltersCount={activeFiltersCount}
        searchQuery={searchQuery}
        onViewModeChange={onViewModeChange}
        onSearchChange={onSearchChange}
      />

      {viewMode === 'all' ? (
        <>
          <View style={styles.helperRow}>
            <SlidersHorizontal color={theme.colors.textSecondary} size={14} />
            <Text style={styles.helperLabel}>Filtra tu búsqueda</Text>
          </View>

          <ExerciseFilterGroup
            title="Equipamiento"
            subtitle={
              equipmentFilter === 'all'
                ? 'Todas las opciones'
                : equipmentLabels[equipmentFilter] || equipmentFilter
            }
            icon={Dumbbell}
            activeKey={equipmentFilter}
            filters={equipmentFilterKeys.map(key => ({
              key,
              label: key === 'all' ? 'Todos' : equipmentLabels[key] || key,
            }))}
            onChange={onEquipmentChange}
          />

          <ExerciseFilterGroup
            title="Zona del cuerpo"
            subtitle={
              bodyPartFilter === 'all'
                ? 'Todas las opciones'
                : bodyPartLabels[bodyPartFilter] || bodyPartFilter
            }
            icon={Target}
            activeKey={bodyPartFilter}
            filters={bodyPartFilterKeys.map(key => ({
              key,
              label: key === 'all' ? 'Todos' : bodyPartLabels[key] || key,
            }))}
            onChange={onBodyPartChange}
          />

          <ExerciseFilterGroup
            title="Nivel"
            subtitle={
              levelFilter === 'all'
                ? 'Todas las opciones'
                : levelLabels[levelFilter] || levelFilter
            }
            icon={Gauge}
            activeKey={levelFilter}
            filters={levelFilterKeys.map(key => ({
              key,
              label: key === 'all' ? 'Todos' : levelLabels[key] || key,
            }))}
            onChange={onLevelChange}
          />
        </>
      ) : null}

      {loading ? <Loader label="Cargando ejercicios..." /> : null}

      {!loading ? (
        exercises.length > 0 ? (
          <View style={styles.list}>
            {exercises.map(exercise => (
              <ExerciseListItem
                key={exercise.id}
                exercise={exercise}
                isFavorite={favoriteExerciseIds.includes(exercise.id)}
                onToggleFavorite={() => onToggleFavorite(exercise.id)}
                onPress={() => onSelectExercise(exercise.id)}
              />
            ))}
          </View>
        ) : viewMode === 'favorites' ? (
          <EmptyState
            title="Sin ejercicios favoritos aún"
            description="Explora la biblioteca y guarda ejercicios para verlos aquí."
          />
        ) : (
          <EmptyState
            title="No se encontraron ejercicios"
            description="Prueba con otra búsqueda o cambia los filtros activos."
          />
        )
      ) : null}
    </View>
  );
}
