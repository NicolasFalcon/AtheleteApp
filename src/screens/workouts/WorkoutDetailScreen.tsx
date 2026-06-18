import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ChevronRight,
  Clock3,
  Dumbbell,
  Flame,
  Heart,
  MessageCircle,
  PencilLine,
  Play,
  Share2,
  Star,
  Target,
  Trash2,
} from 'lucide-react-native';
import { Button, EmptyState, Loader } from '@app/components/ui';
import { HOME_ROUTES, WORKOUTS_ROUTES } from '@app/constants/routes';
import { useAuth } from '@app/hooks/useAuth';
import { useAppTheme } from '@app/hooks/useAppTheme';
import { useExerciseLibrary } from '@app/hooks/useExerciseLibrary';
import { useFavoriteWorkouts } from '@app/hooks/useFavoriteWorkouts';
import { useRoutineBuilder } from '@app/hooks/useRoutineBuilder';
import { useWorkoutLibrary } from '@app/hooks/useWorkoutLibrary';
import { useWorkoutSession } from '@app/hooks/useWorkoutSession';
import { WorkoutThumbnail } from '@app/features/workouts/components/WorkoutThumbnail';
import { equipmentLabels, bodyPartLabels } from '@app/shared/data/exercises';
import { findExerciseByName, getWorkoutAccess } from '@app/shared';
import type {
  HomeStackParamList,
  WorkoutsStackParamList,
} from '@app/types/navigation';

type Props =
  | NativeStackScreenProps<HomeStackParamList, 'WorkoutDetail'>
  | NativeStackScreenProps<WorkoutsStackParamList, 'WorkoutDetail'>;

type DetailTabKey = 'summary' | 'exercises' | 'reviews';

const detailTabs: { key: DetailTabKey; label: string }[] = [
  { key: 'summary', label: 'Resumen' },
  { key: 'exercises', label: 'Ejercicios' },
  { key: 'reviews', label: 'Reviews' },
];

const difficultyLabels = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
} as const;

const workoutTypeLabels = {
  strength: 'Fuerza',
  cardio: 'Cardio',
  fullbody: 'Full body',
  mobility: 'Movilidad',
  hiit: 'HIIT',
} as const;

export function WorkoutDetailScreen({ navigation, route }: Props) {
  const { theme } = useAppTheme();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<DetailTabKey>('summary');
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
  const { workoutSession, startSession, isStartingSession } =
    useWorkoutSession(workout);

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    hero: {
      minHeight: 390,
      backgroundColor: '#0E0E0E',
    },
    heroImage: {
      width: '100%',
      height: 390,
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
    },
    heroOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 390,
      backgroundColor: 'rgba(0,0,0,0.22)',
    },
    heroShade: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 170,
      backgroundColor: 'rgba(0,0,0,0.22)',
    },
    heroActions: {
      position: 'absolute',
      left: theme.spacing.lg,
      right: theme.spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    heroActionGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    floatingButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(18,18,18,0.44)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.22)',
    },
    heroMetaLine: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
    originBadge: {
      borderRadius: theme.radii.pill,
      paddingHorizontal: 11,
      paddingVertical: 7,
      backgroundColor: theme.colors.accent,
    },
    originBadgeText: {
      color: theme.colors.accentContrast,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.semibold,
    },
    ratingPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: theme.radii.pill,
      paddingHorizontal: 9,
      paddingVertical: 6,
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    ratingText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.semibold,
    },
    heroTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 26,
      lineHeight: 31,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 0,
    },
    heroDescription: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      lineHeight: 21,
    },
    metricGrid: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 6,
    },
    metricCard: {
      flex: 1,
      minHeight: 64,
      borderRadius: 18,
      paddingHorizontal: 8,
      paddingVertical: 10,
      justifyContent: 'center',
      alignItems: 'flex-start',
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      gap: 5,
    },
    metricValue: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 15,
      fontWeight: theme.typography.weights.semibold,
    },
    metricLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 9,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    content: {
      paddingBottom: 152,
    },
    contentSheet: {
      marginTop: -34,
      minHeight: 420,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      backgroundColor: theme.colors.background,
      overflow: 'hidden',
    },
    sheetHeader: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: 26,
      paddingBottom: theme.spacing.lg,
      gap: 11,
    },
    tabBar: {
      marginHorizontal: 0,
      marginTop: 0,
      flexDirection: 'row',
      paddingTop: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    tabButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      gap: 9,
    },
    tabLabel: {
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      fontWeight: theme.typography.weights.semibold,
    },
    tabLabelActive: {
      color: theme.colors.textPrimary,
    },
    tabLabelInactive: {
      color: theme.colors.textSecondary,
    },
    tabIndicator: {
      width: 38,
      height: 3,
      borderRadius: 2,
    },
    tabIndicatorActive: {
      backgroundColor: theme.colors.accent,
    },
    tabIndicatorInactive: {
      backgroundColor: 'transparent',
    },
    tabPanel: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    editorialCard: {
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
      ...theme.elevations.card,
    },
    eyebrow: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 20,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: -0.5,
    },
    bodyText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      lineHeight: 21,
    },
    capabilityGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    capabilityCard: {
      width: '48%',
      minHeight: 84,
      borderRadius: theme.radii.md,
      padding: theme.spacing.md,
      gap: 8,
      backgroundColor: '#FFFFFF',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 10,
      elevation: 1,
    },
    capabilityTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      fontWeight: theme.typography.weights.semibold,
    },
    capabilityText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 17,
    },
    ownerActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    exerciseHeader: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    exerciseCountBadge: {
      borderRadius: theme.radii.pill,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: theme.colors.surfaceMuted,
    },
    exerciseCountText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.semibold,
    },
    exerciseCard: {
      borderRadius: theme.radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.sm,
    },
    exerciseIndex: {
      width: 31,
      height: 31,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.accent,
    },
    exerciseIndexLabel: {
      color: theme.colors.accentContrast,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      fontWeight: theme.typography.weights.bold,
    },
    exerciseContent: {
      flex: 1,
      gap: 6,
    },
    exerciseTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 15,
      fontWeight: theme.typography.weights.semibold,
    },
    exerciseMetaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    exerciseMetaPill: {
      borderRadius: theme.radii.pill,
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: theme.colors.surfaceMuted,
    },
    exerciseMeta: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.medium,
    },
    exerciseNote: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 17,
    },
    reviewsHeaderCard: {
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    reviewsHeaderContent: {
      flex: 1,
      gap: 6,
    },
    reviewScore: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 38,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: -1,
    },
    reviewCard: {
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      gap: 8,
    },
    reviewTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    reviewerName: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      fontWeight: theme.typography.weights.semibold,
    },
    reviewText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      lineHeight: 19,
    },
    emptyReview: {
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.surfaceMuted,
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
      alignItems: 'flex-start',
    },
    bottomBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      gap: theme.spacing.sm,
      backgroundColor:
        theme.mode === 'dark' ? 'rgba(8,8,8,0.94)' : 'rgba(255,255,255,0.94)',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    bottomMeta: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      textAlign: 'center',
      fontWeight: theme.typography.weights.medium,
    },
    ctaButton: {
      borderRadius: theme.radii.pill,
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
        <View style={styles.tabPanel}>
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
  const typeLabel = workoutTypeLabels[workout.type];
  const targetLabel =
    workout.targetMuscles.length > 0
      ? workout.targetMuscles
          .slice(0, 3)
          .map(muscle => bodyPartLabels[muscle] || muscle)
          .join(' · ')
      : typeLabel;
  const matchedExercises = workout.exercises
    .map(exercise =>
      findExerciseByName(exercisesQuery.data || [], exercise.name),
    )
    .filter(Boolean);
  const equipmentList = Array.from(
    new Set(
      matchedExercises
        .map(
          exercise =>
            equipmentLabels[exercise!.equipment] || exercise!.equipment,
        )
        .filter(Boolean),
    ),
  ).slice(0, 4);
  const heroDescription =
    workout.inspirationStyle || workout.description || access.description;
  const summaryDescription = workout.description || access.description;
  const ratingValue = 'Nuevo';
  const reviewCount = 'Sin reviews aún';
  const reviewSamples: {
    id: string;
    name: string;
    rating: string;
    text: string;
  }[] = [];

  const handleWorkoutSessionPress = async () => {
    try {
      if (!workoutSession) {
        await startSession();
      }

      stackNavigation.navigate(
        'WorkoutSession' as never,
        { workoutId: workout.id } as never,
      );
    } catch (error) {
      Alert.alert(
        'No pudimos abrir la rutina',
        error instanceof Error ? error.message : 'Inténtalo otra vez.',
      );
    }
  };

  const handleEditRoutine = () => {
    stackNavigation.navigate(
      editRouteName as never,
      {
        workoutId: workout.id,
      } as never,
    );
  };

  const handleDeleteRoutine = () => {
    Alert.alert(
      'Eliminar rutina',
      'Esta rutina se eliminará de tu biblioteca. ¿Quieres continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
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
                error instanceof Error ? error.message : 'Inténtalo otra vez.',
              );
            }
          },
        },
      ],
    );
  };

  const handleShareRoutine = async () => {
    try {
      await Share.share({
        title: workout.title,
        message: `${workout.title}\n${summaryDescription}`,
      });
    } catch (error) {
      Alert.alert(
        'No pudimos compartir la rutina',
        error instanceof Error ? error.message : 'Inténtalo otra vez.',
      );
    }
  };

  const renderExercise = (
    exercise: (typeof workout.exercises)[number],
    index: number,
  ) => {
    const libraryExercise = findExerciseByName(
      exercisesQuery.data || [],
      exercise.name,
    );
    const schemeLabel =
      exercise.sets && exercise.reps
        ? `${exercise.sets}×${exercise.reps}`
        : exercise.duration
        ? `${exercise.duration}s`
        : 'Libre';
    const restLabel =
      exercise.restTime > 0 ? `${exercise.restTime}s desc.` : 'Sin descanso';

    return (
      <Pressable
        key={exercise.id}
        disabled={!libraryExercise}
        onPress={() =>
          stackNavigation.navigate(
            'ExerciseDetail' as never,
            { exerciseId: libraryExercise!.id } as never,
          )
        }
        style={({ pressed }) => [
          styles.exerciseCard,
          !libraryExercise ? { opacity: 0.72 } : null,
          pressed && libraryExercise ? { transform: [{ scale: 0.99 }] } : null,
        ]}
      >
        <View style={styles.exerciseIndex}>
          <Text style={styles.exerciseIndexLabel}>{index + 1}</Text>
        </View>
        <View style={styles.exerciseContent}>
          <Text style={styles.exerciseTitle} numberOfLines={1}>
            {exercise.name}
          </Text>
          <View style={styles.exerciseMetaRow}>
            <View style={styles.exerciseMetaPill}>
              <Text style={styles.exerciseMeta}>{schemeLabel}</Text>
            </View>
            <View style={styles.exerciseMetaPill}>
              <Text style={styles.exerciseMeta}>{restLabel}</Text>
            </View>
          </View>
          {exercise.notes ? (
            <Text style={styles.exerciseNote} numberOfLines={1}>
              {exercise.notes}
            </Text>
          ) : null}
        </View>
        {libraryExercise ? (
          <ChevronRight color={theme.colors.textSecondary} size={18} />
        ) : null}
      </Pressable>
    );
  };

  const renderTabContent = () => {
    if (activeTab === 'exercises') {
      return (
        <View style={styles.tabPanel}>
          <View style={styles.exerciseHeader}>
            <View>
              <Text style={styles.sectionTitle}>Lista de ejercicios</Text>
              <Text style={styles.bodyText}>
                Orden, ejecución y descanso de la sesión.
              </Text>
            </View>
            <View style={styles.exerciseCountBadge}>
              <Text style={styles.exerciseCountText}>
                {workout.exercises.length} total
              </Text>
            </View>
          </View>
          {workout.exercises.map(renderExercise)}
        </View>
      );
    }

    if (activeTab === 'reviews') {
      return (
        <View style={styles.tabPanel}>
          <View style={styles.reviewsHeaderCard}>
            <Text style={styles.reviewScore}>—</Text>
            <View style={styles.reviewsHeaderContent}>
              <View style={styles.heroMetaLine}>
                <Star
                  color={theme.colors.textPrimary}
                  fill={theme.colors.textPrimary}
                  size={15}
                />
                <Text style={styles.sectionTitle}>Reviews</Text>
              </View>
              <Text style={styles.bodyText}>
                {reviewCount}. La base queda lista para conectar reseñas reales.
              </Text>
            </View>
          </View>

          {reviewSamples.length > 0 ? (
            reviewSamples.map(review => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewTopRow}>
                  <Text style={styles.reviewerName}>{review.name}</Text>
                  <View style={styles.heroMetaLine}>
                    <Star
                      color={theme.colors.textPrimary}
                      fill={theme.colors.textPrimary}
                      size={13}
                    />
                    <Text style={styles.exerciseMeta}>{review.rating}/5</Text>
                  </View>
                </View>
                <Text style={styles.reviewText}>{review.text}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyReview}>
              <MessageCircle color={theme.colors.textSecondary} size={22} />
              <Text style={styles.sectionTitle}>Aún no hay reviews</Text>
              <Text style={styles.bodyText}>
                Cuando esta rutina tenga reseñas reales, aparecerán aquí con su
                puntuación y comentarios.
              </Text>
            </View>
          )}
        </View>
      );
    }

    return (
      <View style={styles.tabPanel}>
        <View style={styles.editorialCard}>
          <Text style={styles.eyebrow}>Sobre esta rutina</Text>
          <Text style={styles.sectionTitle}>{workout.title}</Text>
          <Text style={styles.bodyText}>{summaryDescription}</Text>
          {workout.inspirationStyle ? (
            <Text style={styles.bodyText}>{workout.inspirationStyle}</Text>
          ) : null}
        </View>

        <View style={styles.capabilityGrid}>
          <View style={styles.capabilityCard}>
            <Target color={theme.colors.textPrimary} size={18} />
            <Text style={styles.capabilityTitle}>Enfoque</Text>
            <Text style={styles.capabilityText}>{targetLabel}</Text>
          </View>
          <View style={styles.capabilityCard}>
            <Dumbbell color={theme.colors.textPrimary} size={18} />
            <Text style={styles.capabilityTitle}>Equipamiento</Text>
            <Text style={styles.capabilityText}>
              {equipmentList.length > 0
                ? equipmentList.join(' · ')
                : 'Flexible'}
            </Text>
          </View>
          <View style={styles.capabilityCard}>
            <Flame color={theme.colors.textPrimary} size={18} />
            <Text style={styles.capabilityTitle}>Intensidad</Text>
            <Text style={styles.capabilityText}>
              {difficultyLabels[workout.difficulty]} · {workout.calories} kcal
            </Text>
          </View>
          <View style={styles.capabilityCard}>
            <Clock3 color={theme.colors.textPrimary} size={18} />
            <Text style={styles.capabilityTitle}>Formato</Text>
            <Text style={styles.capabilityText}>
              {workout.duration} min · {workout.exercises.length} ejercicios
            </Text>
          </View>
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
                textStyle={{ color: theme.colors.danger }}
              />
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { paddingTop: insets.top }]}>
          <WorkoutThumbnail workout={workout} style={styles.heroImage} />
          <View style={styles.heroOverlay} />
          <View style={styles.heroShade} />
          <View style={[styles.heroActions, { top: insets.top + 10 }]}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={styles.floatingButton}
            >
              <ArrowLeft color="#FFFFFF" size={18} strokeWidth={2.2} />
            </Pressable>
            <View style={styles.heroActionGroup}>
              <Pressable
                onPress={() => {
                  workoutFavorites
                    .toggleWorkoutFavorite(workout.id)
                    .catch(() => {});
                }}
                style={styles.floatingButton}
              >
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
              <Pressable
                onPress={handleShareRoutine}
                style={styles.floatingButton}
              >
                <Share2 color="#FFFFFF" size={17} strokeWidth={2.2} />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.contentSheet}>
          <View style={styles.sheetHeader}>
            <View style={styles.heroMetaLine}>
              <View style={styles.originBadge}>
                <Text style={styles.originBadgeText}>{access.label}</Text>
              </View>
              <View style={styles.ratingPill}>
                <Star
                  color={theme.colors.textSecondary}
                  fill={theme.colors.textSecondary}
                  size={13}
                />
                <Text style={styles.ratingText}>{ratingValue}</Text>
                <Text style={styles.ratingText}>· {reviewCount}</Text>
              </View>
            </View>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {workout.title}
            </Text>
            <Text style={styles.heroDescription} numberOfLines={2}>
              {heroDescription}
            </Text>
            <View style={styles.metricGrid}>
              <View style={styles.metricCard}>
                <Clock3 color={theme.colors.textSecondary} size={15} />
                <Text style={styles.metricValue} numberOfLines={1}>
                  {workout.duration} min
                </Text>
                <Text style={styles.metricLabel}>Tiempo</Text>
              </View>
              <View style={styles.metricCard}>
                <Flame color={theme.colors.textSecondary} size={15} />
                <Text style={styles.metricValue} numberOfLines={1}>
                  {workout.calories}
                </Text>
                <Text style={styles.metricLabel}>Kcal</Text>
              </View>
              <View style={styles.metricCard}>
                <Target color={theme.colors.textSecondary} size={15} />
                <Text style={styles.metricValue} numberOfLines={1}>
                  {difficultyLabels[workout.difficulty]}
                </Text>
                <Text style={styles.metricLabel}>Nivel</Text>
              </View>
              <View style={styles.metricCard}>
                <Dumbbell color={theme.colors.textSecondary} size={15} />
                <Text style={styles.metricValue} numberOfLines={1}>
                  {workout.exercises.length}
                </Text>
                <Text style={styles.metricLabel}>Ejercicios</Text>
              </View>
            </View>
          </View>

          <View style={styles.tabBar}>
            {detailTabs.map(tab => {
              const selected = activeTab === tab.key;

              return (
                <Pressable
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  style={styles.tabButton}
                >
                  <Text
                    style={[
                      styles.tabLabel,
                      selected
                        ? styles.tabLabelActive
                        : styles.tabLabelInactive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                  <View
                    style={[
                      styles.tabIndicator,
                      selected
                        ? styles.tabIndicatorActive
                        : styles.tabIndicatorInactive,
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>

          {renderTabContent()}
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, theme.spacing.lg) },
        ]}
      >
        <Text style={styles.bottomMeta}>
          {workout.duration} min · {workout.exercises.length} ejercicios ·{' '}
          {difficultyLabels[workout.difficulty]}
        </Text>
        <Button
          label={sessionButtonLabel}
          style={styles.ctaButton}
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
    </View>
  );
}
