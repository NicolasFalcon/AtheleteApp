import { useMemo, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { RefreshCw } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, Loader } from '@app/components/ui';
import { WORKOUTS_ROUTES } from '@app/constants/routes';
import { ExerciseLibraryPanel } from '@app/features/workouts/components/ExerciseLibraryPanel';
import { FeaturedWorkoutCard } from '@app/features/workouts/components/FeaturedWorkoutCard';
import { WorkoutQuickFilterChips } from '@app/features/workouts/components/WorkoutQuickFilterChips';
import { WorkoutSearchBar } from '@app/features/workouts/components/WorkoutSearchBar';
import { WorkoutSegmentedControl } from '@app/features/workouts/components/WorkoutSegmentedControl';
import { WorkoutListItem } from '@app/features/workouts/components/WorkoutListItem';
import { WorkoutsHeader } from '@app/features/workouts/components/WorkoutsHeader';
import { useAuth } from '@app/hooks/useAuth';
import { useAppTheme } from '@app/hooks/useAppTheme';
import { useExerciseLibrary } from '@app/hooks/useExerciseLibrary';
import { useFavoriteExercises } from '@app/hooks/useFavoriteExercises';
import { useFavoriteWorkouts } from '@app/hooks/useFavoriteWorkouts';
import { useWorkoutLibrary } from '@app/hooks/useWorkoutLibrary';
import {
  FEATURED_COLLECTION_BADGE,
  FEATURED_COLLECTION_TITLE,
  getWorkoutAccess,
  type LibraryExercise,
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

const workoutTypeMap: Record<(typeof filterOptions)[number], string> = {
  Todos: 'all',
  Fuerza: 'strength',
  Cardio: 'cardio',
  'Full body': 'fullbody',
  HIIT: 'hiit',
  Movilidad: 'mobility',
};

export function WorkoutsScreen({ navigation }: Props) {
  const { theme } = useAppTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const { profile } = useAuth();
  const workoutsQuery = useWorkoutLibrary();
  const exercisesQuery = useExerciseLibrary();
  const workoutFavorites = useFavoriteWorkouts();
  const exerciseFavorites = useFavoriteExercises();
  const [browseMode, setBrowseMode] = useState<BrowseMode>('routines');
  const [routineSource, setRoutineSource] =
    useState<RoutineSourceView>('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] =
    useState<(typeof filterOptions)[number]>('Todos');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [exerciseViewMode, setExerciseViewMode] =
    useState<ExerciseViewMode>('all');
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState('all');
  const [bodyPartFilter, setBodyPartFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.xs,
      paddingBottom: tabBarHeight + theme.spacing.md,
      gap: theme.spacing.md,
    },
    routinesBody: {
      gap: theme.spacing.md,
    },
    sectionHeading: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 16,
      fontWeight: theme.typography.weights.semibold,
    },
    sectionHelper: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 4,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    sectionHeaderText: {
      flex: 1,
    },
    sectionBadge: {
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.surfaceMuted,
      paddingHorizontal: 10,
      paddingVertical: 7,
      alignSelf: 'center',
    },
    sectionBadgeLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 1.3,
      textTransform: 'uppercase',
    },
    horizontalContent: {
      gap: theme.spacing.sm,
      paddingBottom: 2,
    },
    list: {
      gap: theme.spacing.sm,
    },
  });

  const filteredWorkouts = useMemo(() => {
    const allWorkouts = workoutsQuery.data || [];

    return allWorkouts.filter(workout => {
      const access = getWorkoutAccess(workout, profile?.id);
      const matchesSource =
        (routineSource === 'library' && access.kind === 'library') ||
        (routineSource === 'ellie' && access.kind === 'ellie') ||
        (routineSource === 'mine' && access.kind === 'personal');

      if (!matchesSource) {
        return false;
      }

      if (
        favoritesOnly &&
        !workoutFavorites.favoriteWorkoutIds.includes(workout.id)
      ) {
        return false;
      }

      const matchesSearch = workout.title
        .toLowerCase()
        .includes(searchQuery.trim().toLowerCase());

      const requiredType = workoutTypeMap[activeFilter];
      const matchesFilter =
        requiredType === 'all' || workout.type === requiredType;

      return matchesSearch && matchesFilter;
    });
  }, [
    activeFilter,
    favoritesOnly,
    profile?.id,
    routineSource,
    searchQuery,
    workoutFavorites.favoriteWorkoutIds,
    workoutsQuery.data,
  ]);

  const featuredEditorialWorkouts = filteredWorkouts.reduce<
    typeof filteredWorkouts
  >((unique, workout) => {
    if (
      routineSource !== 'library' ||
      workout.sourceType !== 'featured_editorial'
    ) {
      return unique;
    }

    const identity = workout.source || workout.id;

    if (unique.some(item => (item.source || item.id) === identity)) {
      return unique;
    }

    unique.push(workout);
    return unique;
  }, []);

  const libraryListWorkouts = filteredWorkouts.filter(
    workout =>
      !(
        routineSource === 'library' &&
        workout.sourceType === 'featured_editorial'
      ),
  );

  const filteredExercises = useMemo(() => {
    const allExercises = exercisesQuery.data || [];

    return allExercises.filter(exercise => {
      if (
        exerciseViewMode === 'favorites' &&
        !exerciseFavorites.favoriteExerciseIds.includes(exercise.id)
      ) {
        return false;
      }

      const matchesSearch = exercise.name
        .toLowerCase()
        .includes(exerciseSearchQuery.trim().toLowerCase());
      const matchesEquipment =
        equipmentFilter === 'all' || exercise.equipment === equipmentFilter;
      const matchesBodyPart =
        bodyPartFilter === 'all' || exercise.bodyPart === bodyPartFilter;
      const matchesLevel =
        levelFilter === 'all' || exercise.level === levelFilter;

      return (
        matchesSearch && matchesEquipment && matchesBodyPart && matchesLevel
      );
    });
  }, [
    bodyPartFilter,
    equipmentFilter,
    exerciseFavorites.favoriteExerciseIds,
    exerciseSearchQuery,
    exerciseViewMode,
    exercisesQuery.data,
    levelFilter,
  ]);

  const openWorkoutDetail = (workoutId: string) => {
    navigation.navigate(WORKOUTS_ROUTES.WorkoutDetail, { workoutId });
  };

  const openExerciseDetail = (exerciseId: LibraryExercise['id']) => {
    navigation.navigate(WORKOUTS_ROUTES.ExerciseDetail, { exerciseId });
  };

  const openCreateRoutine = () => {
    navigation.navigate(WORKOUTS_ROUTES.CreateRoutine);
  };

  if (
    workoutsQuery.isLoading ||
    exercisesQuery.isLoading ||
    !workoutFavorites.loaded ||
    !exerciseFavorites.loaded
  ) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <Loader label="Cargando entrenos..." />
      </SafeAreaView>
    );
  }

  if (workoutsQuery.error || exercisesQuery.error) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.content}>
          <EmptyState
            title="No pudimos cargar entrenos"
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
              Promise.all([
                workoutsQuery.refetch(),
                exercisesQuery.refetch(),
              ]).catch(() => {});
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <WorkoutSegmentedControl
          value={browseMode}
          highlighted
          options={[
            { key: 'routines', label: 'Rutinas' },
            { key: 'exercises', label: 'Ejercicios' },
          ]}
          onChange={setBrowseMode}
        />

        {browseMode === 'routines' ? (
          <View style={styles.routinesBody}>
            <WorkoutsHeader onCreate={openCreateRoutine} />

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
              onSelectFilter={filter =>
                setActiveFilter(filter as (typeof filterOptions)[number])
              }
            />

            {routineSource === 'library' &&
            featuredEditorialWorkouts.length > 0 ? (
              <View>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderText}>
                    <Text style={styles.sectionHeading}>
                      {FEATURED_COLLECTION_TITLE}
                    </Text>
                    <Text style={styles.sectionHelper}>
                      Rutinas editoriales inspiradas en estilos reconocibles del
                      fitness.
                    </Text>
                  </View>
                  <View style={styles.sectionBadge}>
                    <Text style={styles.sectionBadgeLabel}>
                      {FEATURED_COLLECTION_BADGE}
                    </Text>
                  </View>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalContent}
                >
                  {featuredEditorialWorkouts.map(workout => (
                    <FeaturedWorkoutCard
                      key={workout.source || workout.id}
                      workout={workout}
                      isFavorite={workoutFavorites.isWorkoutFavorite(
                        workout.id,
                      )}
                      onToggleFavorite={() => {
                        workoutFavorites
                          .toggleWorkoutFavorite(workout.id)
                          .catch(() => {});
                      }}
                      onPress={() => openWorkoutDetail(workout.id)}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <View style={styles.list}>
              {libraryListWorkouts.map(workout => (
                <WorkoutListItem
                  key={workout.id}
                  workout={workout}
                  isFavorite={workoutFavorites.isWorkoutFavorite(workout.id)}
                  onToggleFavorite={() => {
                    workoutFavorites
                      .toggleWorkoutFavorite(workout.id)
                      .catch(() => {});
                  }}
                  onPress={() => openWorkoutDetail(workout.id)}
                />
              ))}
            </View>

            {filteredWorkouts.length === 0 ? (
              <EmptyState
                title={
                  routineSource === 'mine'
                    ? 'Aún no tienes rutinas propias'
                    : routineSource === 'ellie'
                    ? 'Sin rutinas de ELLIE'
                    : 'Sin rutinas en Biblioteca'
                }
                description={
                  favoritesOnly
                    ? 'Guarda rutinas con el corazón para verlas aquí.'
                    : routineSource === 'mine'
                    ? 'Tus rutinas personalizadas aparecerán aquí y podrás gestionarlas desde este espacio.'
                    : 'Prueba con otra búsqueda o cambia el filtro actual.'
                }
              />
            ) : null}
          </View>
        ) : (
          <ExerciseLibraryPanel
            exercises={filteredExercises}
            totalExercisesCount={(exercisesQuery.data || []).length}
            favoriteExerciseIds={exerciseFavorites.favoriteExerciseIds}
            loading={exercisesQuery.isLoading}
            viewMode={exerciseViewMode}
            searchQuery={exerciseSearchQuery}
            equipmentFilter={equipmentFilter}
            bodyPartFilter={bodyPartFilter}
            levelFilter={levelFilter}
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
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
