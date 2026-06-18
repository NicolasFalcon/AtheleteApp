import { useMemo, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { ArrowLeft, RefreshCw } from 'lucide-react-native';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, Loader } from '@app/components/ui';
import { WORKOUTS_ROUTES } from '@app/constants/routes';
import { ExerciseDiscoveryHub } from '@app/features/workouts/components/ExerciseDiscoveryHub';
import { ExerciseLibraryPanel } from '@app/features/workouts/components/ExerciseLibraryPanel';
import { RoutineDiscoveryPanel } from '@app/features/workouts/components/RoutineDiscoveryPanel';
import { WorkoutListItem } from '@app/features/workouts/components/WorkoutListItem';
import { WorkoutQuickFilterChips } from '@app/features/workouts/components/WorkoutQuickFilterChips';
import { WorkoutSearchBar } from '@app/features/workouts/components/WorkoutSearchBar';
import { WorkoutSegmentedControl } from '@app/features/workouts/components/WorkoutSegmentedControl';
import { useAppTheme } from '@app/hooks/useAppTheme';
import { useDebouncedValue } from '@app/hooks/useDebouncedValue';
import { useFavoriteExercises } from '@app/hooks/useFavoriteExercises';
import { useFavoriteWorkouts } from '@app/hooks/useFavoriteWorkouts';
import { usePaginatedExerciseLibrary } from '@app/hooks/usePaginatedExerciseLibrary';
import { usePaginatedWorkoutLibrary } from '@app/hooks/usePaginatedWorkoutLibrary';
import { useWorkoutDiscovery } from '@app/hooks/useWorkoutDiscovery';
import { useTabBarMotion } from '@app/hooks/useTabBarMotion';
import {
  bodyPartLabels,
  equipmentLabels,
  type LibraryExercise,
  type Workout,
} from '@app/shared';
import type { WorkoutsStackParamList } from '@app/types/navigation';

type Props = NativeStackScreenProps<WorkoutsStackParamList, 'WorkoutsRoot'>;
type BrowseMode = 'routines' | 'exercises';
type RoutineSourceView = 'library' | 'ellie' | 'mine';
type ExerciseViewMode = 'all' | 'favorites';

const filterOptions = [
  'Todos',
  'Fuerza',
  'Cardio',
  'Full body',
  'HIIT',
  'Movilidad',
] as const;

type RoutineFilter = (typeof filterOptions)[number];

const workoutTypeMap: Record<RoutineFilter, string> = {
  Todos: 'all',
  Fuerza: 'strength',
  Cardio: 'cardio',
  'Full body': 'fullbody',
  HIIT: 'hiit',
  Movilidad: 'mobility',
};

function flattenUnique<T extends { id: string }>(
  pages: { items: T[] }[] | undefined,
) {
  const seen = new Set<string>();

  return (pages || []).flatMap(page =>
    page.items.filter(item => {
      if (seen.has(item.id)) {
        return false;
      }

      seen.add(item.id);
      return true;
    }),
  );
}

function ListSeparator() {
  return <View style={separatorStyle.item} />;
}

const separatorStyle = StyleSheet.create({
  item: {
    height: 10,
  },
});

export function WorkoutsScreen({ navigation }: Props) {
  const { theme } = useAppTheme();
  const tabBarMotion = useTabBarMotion();
  const tabBarHeight = useBottomTabBarHeight();
  const workoutFavorites = useFavoriteWorkouts();
  const exerciseFavorites = useFavoriteExercises();
  const [browseMode, setBrowseMode] = useState<BrowseMode>('routines');
  const [showRoutineResults, setShowRoutineResults] = useState(false);
  const [routineSource, setRoutineSource] =
    useState<RoutineSourceView>('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<RoutineFilter>('Todos');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [exerciseViewMode, setExerciseViewMode] =
    useState<ExerciseViewMode>('all');
  const [showExerciseResults, setShowExerciseResults] = useState(false);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState('all');
  const [bodyPartFilter, setBodyPartFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const debouncedWorkoutSearch = useDebouncedValue(searchQuery);
  const debouncedExerciseSearch = useDebouncedValue(exerciseSearchQuery);

  const discoveryQuery = useWorkoutDiscovery(
    browseMode === 'routines' && !showRoutineResults && workoutFavorites.loaded,
  );
  const workoutsQuery = usePaginatedWorkoutLibrary({
    source: routineSource,
    search: debouncedWorkoutSearch,
    type: workoutTypeMap[activeFilter],
    favoriteIds: favoritesOnly
      ? [...workoutFavorites.favoriteWorkoutIds].sort()
      : null,
    enabled:
      browseMode === 'routines' &&
      showRoutineResults &&
      workoutFavorites.loaded,
  });
  const exercisesQuery = usePaginatedExerciseLibrary({
    search: debouncedExerciseSearch,
    equipment: equipmentFilter,
    bodyPart: bodyPartFilter,
    level: levelFilter,
    favoriteIds:
      exerciseViewMode === 'favorites'
        ? [...exerciseFavorites.favoriteExerciseIds].sort()
        : null,
    enabled:
      browseMode === 'exercises' &&
      showExerciseResults &&
      exerciseFavorites.loaded,
  });

  const workouts = useMemo(
    () => flattenUnique<Workout>(workoutsQuery.data?.pages),
    [workoutsQuery.data?.pages],
  );
  const exercises = useMemo(
    () => flattenUnique<LibraryExercise>(exercisesQuery.data?.pages),
    [exercisesQuery.data?.pages],
  );

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    modeControl: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.xs,
      paddingBottom: theme.spacing.md,
    },
    content: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: tabBarHeight + theme.spacing.md,
    },
    resultsHeader: {
      gap: 12,
      marginBottom: theme.spacing.md,
    },
    backButton: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingVertical: 4,
    },
    backLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      fontWeight: theme.typography.weights.semibold,
    },
    resultTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 24,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: -0.7,
    },
    resultSubtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 3,
    },
    footer: {
      minHeight: 52,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

  const openWorkoutDetail = (workoutId: string) => {
    navigation.navigate(WORKOUTS_ROUTES.WorkoutDetail, { workoutId });
  };

  const openExerciseDetail = (exerciseId: LibraryExercise['id']) => {
    navigation.navigate(WORKOUTS_ROUTES.ExerciseDetail, { exerciseId });
  };

  const openCreateRoutine = () => {
    navigation.navigate(WORKOUTS_ROUTES.CreateRoutine);
  };

  const toggleWorkoutFavorite = (workoutId: string) => {
    workoutFavorites.toggleWorkoutFavorite(workoutId).catch(() => {});
  };

  const openRoutineResults = (source: RoutineSourceView, filter: string) => {
    setRoutineSource(source);
    setActiveFilter(filter as RoutineFilter);
    setFavoritesOnly(false);
    setSearchQuery('');
    setShowRoutineResults(true);
  };

  const returnToDiscovery = () => {
    setRoutineSource('library');
    setActiveFilter('Todos');
    setFavoritesOnly(false);
    setSearchQuery('');
    setShowRoutineResults(false);
  };

  const openExerciseResults = ({
    bodyPart = bodyPartFilter,
    equipment = equipmentFilter,
  }: {
    bodyPart?: string;
    equipment?: string;
  } = {}) => {
    setBodyPartFilter(bodyPart);
    setEquipmentFilter(equipment);
    setShowExerciseResults(true);
  };

  const returnToExerciseDiscovery = () => {
    setExerciseSearchQuery('');
    setExerciseViewMode('all');
    setEquipmentFilter('all');
    setBodyPartFilter('all');
    setLevelFilter('all');
    setShowExerciseResults(false);
  };

  const modeControl = (
    <WorkoutSegmentedControl
      value={browseMode}
      highlighted
      options={[
        { key: 'routines', label: 'Rutinas' },
        { key: 'exercises', label: 'Ejercicios' },
      ]}
      onChange={setBrowseMode}
    />
  );

  if (!workoutFavorites.loaded || !exerciseFavorites.loaded) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <Loader label="Cargando entrenos..." />
      </SafeAreaView>
    );
  }

  if (browseMode === 'exercises') {
    if (!showExerciseResults) {
      return (
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          <ExerciseDiscoveryHub
            modeControl={modeControl}
            bottomInset={tabBarHeight}
            viewMode={exerciseViewMode}
            equipmentFilter={equipmentFilter}
            bodyPartFilter={bodyPartFilter}
            levelFilter={levelFilter}
            onOpenResults={() => openExerciseResults()}
            onSelectBodyPart={bodyPart => {
              setExerciseSearchQuery('');
              setExerciseViewMode('all');
              setLevelFilter('all');
              openExerciseResults({ bodyPart, equipment: 'all' });
            }}
            onSelectEquipment={equipment => {
              setExerciseSearchQuery('');
              setExerciseViewMode('all');
              setLevelFilter('all');
              openExerciseResults({ bodyPart: 'all', equipment });
            }}
            onApplyFilters={filters => {
              setExerciseViewMode(filters.viewMode);
              setEquipmentFilter(filters.equipment);
              setBodyPartFilter(filters.bodyPart);
              setLevelFilter(filters.level);
              setShowExerciseResults(true);
            }}
            onScroll={tabBarMotion.onScroll}
          />
        </SafeAreaView>
      );
    }

    const resultTitle =
      exerciseViewMode === 'favorites'
        ? 'Ejercicios favoritos'
        : bodyPartFilter !== 'all'
        ? bodyPartLabels[bodyPartFilter] || 'Ejercicios por zona'
        : equipmentFilter !== 'all'
        ? equipmentLabels[equipmentFilter] || 'Ejercicios por equipamiento'
        : exerciseSearchQuery.trim()
        ? 'Resultados de búsqueda'
        : 'Todos los ejercicios';

    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.modeControl}>{modeControl}</View>
        {exercisesQuery.error ? (
          <View style={styles.content}>
            <EmptyState
              title="No pudimos cargar ejercicios"
              description="Verifica la conexión con Supabase y vuelve a intentarlo."
              icon={
                <RefreshCw
                  color={theme.colors.textSecondary}
                  size={20}
                  strokeWidth={2}
                />
              }
              actionLabel="Reintentar"
              onAction={() => {
                exercisesQuery.refetch().catch(() => {});
              }}
            />
          </View>
        ) : (
          <ExerciseLibraryPanel
            exercises={exercises}
            totalExercisesCount={exercisesQuery.data?.pages[0]?.total || 0}
            favoriteExerciseIds={exerciseFavorites.favoriteExerciseIds}
            loading={exercisesQuery.isPending}
            loadingMore={exercisesQuery.isFetchingNextPage}
            hasNextPage={exercisesQuery.hasNextPage}
            bottomInset={tabBarHeight}
            viewMode={exerciseViewMode}
            searchQuery={exerciseSearchQuery}
            equipmentFilter={equipmentFilter}
            bodyPartFilter={bodyPartFilter}
            levelFilter={levelFilter}
            resultTitle={resultTitle}
            resultSubtitle="Refina la selección sin perder el contexto de tu búsqueda."
            onBack={returnToExerciseDiscovery}
            onViewModeChange={setExerciseViewMode}
            onSearchChange={setExerciseSearchQuery}
            onEquipmentChange={setEquipmentFilter}
            onBodyPartChange={setBodyPartFilter}
            onLevelChange={setLevelFilter}
            onToggleFavorite={exerciseId => {
              exerciseFavorites
                .toggleExerciseFavorite(exerciseId)
                .catch(() => {});
            }}
            onSelectExercise={openExerciseDetail}
            onLoadMore={() => {
              exercisesQuery.fetchNextPage().catch(() => {});
            }}
            onScroll={tabBarMotion.onScroll}
          />
        )}
      </SafeAreaView>
    );
  }

  if (!showRoutineResults) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <RoutineDiscoveryPanel
          modeControl={modeControl}
          data={discoveryQuery.data}
          loading={discoveryQuery.isPending}
          error={Boolean(discoveryQuery.error)}
          bottomInset={tabBarHeight}
          searchQuery={searchQuery}
          filterOptions={filterOptions}
          favoriteWorkoutIds={workoutFavorites.favoriteWorkoutIds}
          onSearchChange={value => {
            setSearchQuery(value);

            if (value.trim()) {
              setShowRoutineResults(true);
            }
          }}
          onSelectFilter={filter => {
            openRoutineResults('library', filter);
          }}
          onShowFavorites={() => {
            setRoutineSource('library');
            setActiveFilter('Todos');
            setFavoritesOnly(true);
            setShowRoutineResults(true);
          }}
          onToggleFavorite={toggleWorkoutFavorite}
          onSelectWorkout={openWorkoutDetail}
          onViewAll={openRoutineResults}
          onCreateRoutine={openCreateRoutine}
          onRetry={() => {
            discoveryQuery.refetch().catch(() => {});
          }}
          onScroll={tabBarMotion.onScroll}
        />
      </SafeAreaView>
    );
  }

  const resultTitle =
    routineSource === 'ellie'
      ? 'Rutinas de ELLIE'
      : routineSource === 'mine'
      ? 'Tus rutinas'
      : favoritesOnly
      ? 'Rutinas favoritas'
      : activeFilter === 'Todos'
      ? 'Todas las rutinas'
      : activeFilter;

  const resultsHeader = (
    <View style={styles.resultsHeader}>
      {modeControl}
      <Pressable onPress={returnToDiscovery} style={styles.backButton}>
        <ArrowLeft color={theme.colors.textSecondary} size={16} />
        <Text style={styles.backLabel}>Volver a explorar</Text>
      </Pressable>
      <View>
        <Text style={styles.resultTitle}>{resultTitle}</Text>
        <Text style={styles.resultSubtitle}>
          Resultados completos con búsqueda y carga progresiva.
        </Text>
      </View>
      <WorkoutSegmentedControl
        value={routineSource}
        options={[
          { key: 'library', label: 'Biblioteca' },
          { key: 'ellie', label: 'ELLIE' },
          { key: 'mine', label: 'Mis rutinas' },
        ]}
        onChange={setRoutineSource}
      />
      <WorkoutSearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Buscar entreno"
      />
      <WorkoutQuickFilterChips
        favoritesOnly={favoritesOnly}
        onToggleFavorites={() => setFavoritesOnly(current => !current)}
        options={filterOptions}
        activeFilter={activeFilter}
        onSelectFilter={filter => setActiveFilter(filter as RoutineFilter)}
      />
      {workoutsQuery.isPending ? <Loader label="Cargando rutinas..." /> : null}
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      {workoutsQuery.error ? (
        <View style={styles.content}>
          {resultsHeader}
          <EmptyState
            title="No pudimos cargar rutinas"
            description="Verifica la conexión con Supabase y vuelve a intentarlo."
            icon={
              <RefreshCw
                color={theme.colors.textSecondary}
                size={20}
                strokeWidth={2}
              />
            }
            actionLabel="Reintentar"
            onAction={() => {
              workoutsQuery.refetch().catch(() => {});
            }}
          />
        </View>
      ) : (
        <FlatList
          data={workoutsQuery.isPending ? [] : workouts}
          contentContainerStyle={styles.content}
          keyExtractor={workout => workout.id}
          ListHeaderComponent={resultsHeader}
          renderItem={({ item }) => (
            <WorkoutListItem
              workout={item}
              isFavorite={workoutFavorites.isWorkoutFavorite(item.id)}
              onToggleFavorite={() => toggleWorkoutFavorite(item.id)}
              onPress={() => openWorkoutDetail(item.id)}
            />
          )}
          ItemSeparatorComponent={ListSeparator}
          ListEmptyComponent={
            !workoutsQuery.isPending ? (
              <EmptyState
                title={
                  routineSource === 'mine'
                    ? 'Aún no tienes rutinas propias'
                    : routineSource === 'ellie'
                    ? 'Sin rutinas de ELLIE'
                    : 'No encontramos rutinas'
                }
                description={
                  favoritesOnly
                    ? 'Guarda rutinas con el corazón para verlas aquí.'
                    : routineSource === 'mine'
                    ? 'Crea una rutina y aparecerá en tu colección.'
                    : 'Prueba con otra búsqueda o cambia el filtro actual.'
                }
              />
            ) : null
          }
          ListFooterComponent={
            <View style={styles.footer}>
              {workoutsQuery.isFetchingNextPage ? (
                <ActivityIndicator color={theme.colors.textSecondary} />
              ) : null}
            </View>
          }
          onEndReached={() => {
            if (
              workoutsQuery.hasNextPage &&
              !workoutsQuery.isFetchingNextPage
            ) {
              workoutsQuery.fetchNextPage().catch(() => {});
            }
          }}
          onEndReachedThreshold={0.45}
          keyboardShouldPersistTaps="handled"
          onScroll={tabBarMotion.onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
