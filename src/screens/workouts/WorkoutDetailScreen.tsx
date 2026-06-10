import {useMemo} from 'react';
import {Alert, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ChevronRight,
  Clock3,
  Dumbbell,
  Flame,
  Heart,
  PencilLine,
  Play,
  Trash2,
} from 'lucide-react-native';
import {Button, Chip, EmptyState, Loader} from '@app/components/ui';
import {
  HOME_ROUTES,
  WORKOUTS_ROUTES,
} from '@app/constants/routes';
import {findExerciseByName, getWorkoutAccess} from '@app/shared';
import {useAuth} from '@app/hooks/useAuth';
import {useAppTheme} from '@app/hooks/useAppTheme';
import {useExerciseLibrary} from '@app/hooks/useExerciseLibrary';
import {useFavoriteWorkouts} from '@app/hooks/useFavoriteWorkouts';
import {useRoutineBuilder} from '@app/hooks/useRoutineBuilder';
import {useWorkoutLibrary} from '@app/hooks/useWorkoutLibrary';
import {useWorkoutSession} from '@app/hooks/useWorkoutSession';
import {WorkoutThumbnail} from '@app/features/workouts/components/WorkoutThumbnail';
import type {
  HomeStackParamList,
  WorkoutsStackParamList,
} from '@app/types/navigation';

type Props =
  | NativeStackScreenProps<HomeStackParamList, 'WorkoutDetail'>
  | NativeStackScreenProps<WorkoutsStackParamList, 'WorkoutDetail'>;

const difficultyLabels = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
} as const;

export function WorkoutDetailScreen({navigation, route}: Props) {
  const {theme} = useAppTheme();
  const {profile} = useAuth();
  const insets = useSafeAreaInsets();
  const workoutsQuery = useWorkoutLibrary();
  const exercisesQuery = useExerciseLibrary();
  const workoutFavorites = useFavoriteWorkouts();
  const routineBuilder = useRoutineBuilder();
  const workout = useMemo(
    () =>
      (workoutsQuery.data || []).find(
        item => item.id === route.params.workoutId,
      ) || null,
    [route.params.workoutId, workoutsQuery.data],
  );
  const {
    workoutSession,
    startSession,
    isStartingSession,
  } = useWorkoutSession(workout);

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    hero: {
      height: 276,
      backgroundColor: theme.colors.surfaceMuted,
    },
    heroImage: {
      width: '100%',
      height: '100%',
    },
    heroOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.34)',
    },
    floatingButtonBase: {
      position: 'absolute',
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(17,17,17,0.38)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.15)',
    },
    floatingBackButton: {
      left: theme.spacing.lg,
    },
    floatingFavoriteButton: {
      right: theme.spacing.lg,
    },
    content: {
      paddingBottom: 136,
    },
    panel: {
      marginTop: -28,
      marginHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.xl,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      shadowColor: '#000000',
      ...theme.elevations.card,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.title,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: -0.8,
      flexShrink: 1,
    },
    description: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      lineHeight: 20,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.md,
    },
    ownerActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
    },
    section: {
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      fontWeight: theme.typography.weights.semibold,
    },
    sectionSubtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
    },
    exerciseCard: {
      borderRadius: theme.radii.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    exerciseIndex: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
    },
    exerciseIndexLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      fontWeight: theme.typography.weights.bold,
    },
    exerciseContent: {
      flex: 1,
      gap: 4,
    },
    exerciseTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      fontWeight: theme.typography.weights.medium,
    },
    exerciseMeta: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      lineHeight: 18,
    },
    bottomBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      backgroundColor: theme.colors.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
  });

  if (
    workoutsQuery.isLoading ||
    exercisesQuery.isLoading ||
    !workoutFavorites.loaded
  ) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Loader label="Cargando rutina..." />
      </SafeAreaView>
    );
  }

  if (!workout) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.section}>
          <EmptyState
            title="Rutina no encontrada"
            description="No pudimos encontrar esta rutina dentro de la biblioteca actual."
          />
          <Button label="Volver" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  const access = getWorkoutAccess(workout, profile?.id);
  const stackNavigation = navigation as any;
  const routeNames = navigation.getState().routeNames as string[];
  const editRouteName = routeNames.includes(WORKOUTS_ROUTES.EditRoutine)
    ? WORKOUTS_ROUTES.EditRoutine
    : HOME_ROUTES.EditRoutine;
  const sessionButtonLabel =
    workoutSession?.status === 'in_progress'
      ? 'Continuar entreno'
      : workoutSession?.status === 'canceled'
        ? 'Reanudar sesión'
        : workoutSession?.status === 'completed'
          ? 'Ver sesión'
          : 'Empezar rutina';

  const handleWorkoutSessionPress = async () => {
    try {
      if (!workoutSession) {
        await startSession();
      }

      stackNavigation.navigate(
        'WorkoutSession' as never,
        {workoutId: workout.id} as never,
      );
    } catch (error) {
      Alert.alert(
        'No pudimos abrir la rutina',
        error instanceof Error ? error.message : 'Inténtalo otra vez.',
      );
    }
  };

  const handleEditRoutine = () => {
    stackNavigation.navigate(editRouteName as never, {
      workoutId: workout.id,
    } as never);
  };

  const handleDeleteRoutine = () => {
    Alert.alert(
      'Eliminar rutina',
      'Esta rutina se eliminará de tu biblioteca. ¿Quieres continuar?',
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await routineBuilder.deleteRoutine(workout.id);
              navigation.goBack();
            } catch (error) {
              Alert.alert(
                'No pudimos eliminar la rutina',
                error instanceof Error
                  ? error.message
                  : 'Inténtalo otra vez.',
              );
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.hero}>
        <WorkoutThumbnail workout={workout} style={styles.heroImage} />
        <View style={styles.heroOverlay} />
        <Pressable
          onPress={() => navigation.goBack()}
          style={[
            styles.floatingButtonBase,
            styles.floatingBackButton,
            {top: insets.top + 10},
          ]}>
          <ArrowLeft color="#FFFFFF" size={18} strokeWidth={2.2} />
        </Pressable>
        <Pressable
          onPress={() => {
            workoutFavorites.toggleWorkoutFavorite(workout.id).catch(() => {});
          }}
          style={[
            styles.floatingButtonBase,
            styles.floatingFavoriteButton,
            {top: insets.top + 10},
          ]}>
          <Heart
            color="#FFFFFF"
            fill={
              workoutFavorites.isWorkoutFavorite(workout.id)
                ? '#FFFFFF'
                : 'transparent'
            }
            size={18}
            strokeWidth={2.2}
          />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.panel}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{workout.title}</Text>
            <Chip>{access.label}</Chip>
            {workout.collectionBadge ? <Chip>{workout.collectionBadge}</Chip> : null}
          </View>
          {workout.inspirationStyle ? (
            <Text style={styles.description}>{workout.inspirationStyle}</Text>
          ) : null}
          <Text style={styles.description}>
            {workout.description || access.description}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Clock3 color={theme.colors.textSecondary} size={14} />
              <Text style={styles.metaLabel}>{workout.duration} min</Text>
            </View>
            <View style={styles.metaItem}>
              <Flame color={theme.colors.textSecondary} size={14} />
              <Text style={styles.metaLabel}>{workout.calories} kcal</Text>
            </View>
            <View style={styles.metaItem}>
              <Dumbbell color={theme.colors.textSecondary} size={14} />
              <Text style={styles.metaLabel}>
                {workout.exercises.length} ejercicios
              </Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <Chip>{difficultyLabels[workout.difficulty]}</Chip>
            {workout.targetMuscles.slice(0, 3).map(muscle => (
              <Chip key={muscle}>{muscle}</Chip>
            ))}
          </View>
          {access.canEdit || access.canDelete ? (
            <View style={styles.ownerActions}>
              {access.canEdit ? (
                <Button
                  label="Editar rutina"
                  variant="outline"
                  fullWidth={false}
                  onPress={handleEditRoutine}
                  accessoryRight={
                    <PencilLine
                      color={theme.colors.textPrimary}
                      size={16}
                      strokeWidth={2.2}
                    />
                  }
                />
              ) : null}
              {access.canDelete ? (
                <Button
                  label="Eliminar"
                  variant="ghost"
                  fullWidth={false}
                  onPress={handleDeleteRoutine}
                  accessoryRight={
                    <Trash2
                      color={theme.colors.danger}
                      size={16}
                      strokeWidth={2.2}
                    />
                  }
                  textStyle={{color: theme.colors.danger}}
                />
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ejercicios</Text>
          <Text style={styles.sectionSubtitle}>
            Toca un ejercicio para ver su detalle.
          </Text>
          {workout.exercises.map((exercise, index) => {
            const libraryExercise = findExerciseByName(
              exercisesQuery.data || [],
              exercise.name,
            );

            return (
              <Pressable
                key={exercise.id}
                disabled={!libraryExercise}
                onPress={() =>
                  stackNavigation.navigate(
                    'ExerciseDetail' as never,
                    {exerciseId: libraryExercise!.id} as never,
                  )
                }
                style={({pressed}) => [
                  styles.exerciseCard,
                  !libraryExercise ? {opacity: 0.72} : null,
                  pressed && libraryExercise ? {transform: [{scale: 0.99}]} : null,
                ]}>
                <View style={styles.exerciseIndex}>
                  <Text style={styles.exerciseIndexLabel}>{index + 1}</Text>
                </View>
                <View style={styles.exerciseContent}>
                  <Text style={styles.exerciseTitle}>{exercise.name}</Text>
                  <Text style={styles.exerciseMeta}>
                    {exercise.sets && exercise.reps
                      ? `${exercise.sets} series × ${exercise.reps} reps`
                      : exercise.duration
                        ? `${exercise.duration}s`
                        : 'Sin esquema definido'}
                    {exercise.restTime > 0 ? ` · ${exercise.restTime}s descanso` : ''}
                  </Text>
                  {exercise.notes ? (
                    <Text style={styles.exerciseMeta}>{exercise.notes}</Text>
                  ) : null}
                </View>
                {libraryExercise ? (
                  <ChevronRight color={theme.colors.textSecondary} size={18} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {paddingBottom: Math.max(insets.bottom, theme.spacing.lg)},
        ]}>
        <Button
          label={sessionButtonLabel}
          loading={isStartingSession}
          onPress={handleWorkoutSessionPress}
          accessoryRight={
            <Play
              color={theme.colors.accentContrast}
              size={16}
              strokeWidth={2.2}
            />
          }
        />
      </View>
    </SafeAreaView>
  );
}
