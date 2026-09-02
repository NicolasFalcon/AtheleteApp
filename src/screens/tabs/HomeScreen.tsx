import { useMemo, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Dumbbell,
  Droplets,
  ListChecks,
  RefreshCw,
  UtensilsCrossed,
} from 'lucide-react-native';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, Loader } from '@app/components/ui';
import {
  bodyScienceThumbNutrition,
  homeCore33Editorial,
  homeTrainingEditorial,
} from '@app/assets/images';
import { HOME_ROUTES, TAB_ROUTES } from '@app/constants/routes';
import { RecoveryGuidanceCard } from '@app/features/home/components/RecoveryGuidanceCard';
import { QuizPromoCard } from '@app/features/home/components/QuizPromoCard';
import { RecentPRCard } from '@app/features/home/components/RecentPRCard';
import {
  DailyStatusGrid,
  type DailyStatusItem,
} from '@app/features/home/components/DailyStatusGrid';
import { HomePriorityCard } from '@app/features/home/components/HomePriorityCard';
import { HomeSectionHeader } from '@app/features/home/components/HomeSectionHeader';
import { getHomePriority } from '@app/features/home/homePriority';
import { useHomeFeed } from '@app/hooks/useHomeFeed';
import { useAuth } from '@app/hooks/useAuth';
import { useAppTheme } from '@app/hooks/useAppTheme';
import { useTabBarMotion } from '@app/hooks/useTabBarMotion';
import { useTabBarMetrics } from '@app/hooks/useTabBarMetrics';
import { useExerciseLibrary } from '@app/hooks/useExerciseLibrary';
import { useNotificationsOverview } from '@app/hooks/useNotificationsOverview';
import { useNutritionPlan } from '@app/hooks/useNutritionPlan';
import { usePersonalRecords } from '@app/hooks/usePersonalRecords';
import { useWorkoutLibrary } from '@app/hooks/useWorkoutLibrary';
import { HomeHeader } from '@app/features/home/components/HomeHeader';
import { NutritionLogModal } from '@app/features/nutrition/components/NutritionLogModal';
import { WearBanner } from '@app/features/home/components/WearBanner';
import { WearPreviewModal } from '@app/features/home/components/WearPreviewModal';
import { WorkoutCarousel } from '@app/features/home/components/WorkoutCarousel';
import type { HomeStackParamList } from '@app/types/navigation';

type Props = NativeStackScreenProps<HomeStackParamList, 'HomeRoot'>;

export function HomeScreen({ navigation }: Props) {
  const { theme } = useAppTheme();
  const tabBarMotion = useTabBarMotion();
  const { bottomClearance } = useTabBarMetrics();
  const { profile } = useAuth();
  const homeQuery = useHomeFeed();
  const notificationsOverview = useNotificationsOverview();
  const nutritionActions = useNutritionPlan();
  const personalRecordsQuery = usePersonalRecords();
  const exercisesQuery = useExerciseLibrary();
  const workoutsQuery = useWorkoutLibrary();
  const [wearPreviewVisible, setWearPreviewVisible] = useState(false);
  const [nutritionLogVisible, setNutritionLogVisible] = useState(false);
  const overview = homeQuery.data;
  const session = overview?.todaySession || null;
  const challenge = overview?.challenge || null;
  const nutritionPlan = overview?.nutritionPlan || null;
  const todayNutritionLog = overview?.todayNutritionLog || null;
  const hasNutritionLog = Boolean(
    todayNutritionLog &&
      ((todayNutritionLog.calories || 0) > 0 ||
        (todayNutritionLog.protein || 0) > 0 ||
        (todayNutritionLog.carbs || 0) > 0 ||
        (todayNutritionLog.fats || 0) > 0),
  );
  const completedExercises = session?.completedExercises.length || 0;
  const totalExercises = session?.totalExercises || completedExercises || 0;
  const workoutProgress =
    session?.status === 'completed'
      ? 100
      : totalExercises > 0
      ? Math.round((completedExercises / totalExercises) * 100)
      : 0;
  const nutritionProgress = nutritionPlan
    ? Math.min(
        100,
        Math.round(
          ((todayNutritionLog?.calories || 0) /
            Math.max(nutritionPlan.targetCalories, 1)) *
            100,
        ),
      )
    : 0;
  const coreDailyProgress = challenge
    ? Math.round(
        (challenge.completedToday / Math.max(challenge.totalHabits, 1)) * 100,
      )
    : 0;
  const priority = getHomePriority({
    session,
    challenge,
    hasNutritionPlan: Boolean(nutritionPlan),
    hasNutritionLog,
  });

  const recommendedWorkouts = useMemo(() => {
    const allWorkouts = workoutsQuery.data || [];
    const featured = allWorkouts.filter(
      workout => workout.sourceType === 'featured_editorial',
    );
    const source = featured.length > 0 ? featured : allWorkouts;

    const scoreWorkout = (workout: (typeof source)[number]) => {
      if (profile?.goal === 'lose_weight') {
        return workout.type === 'cardio' || workout.type === 'hiit' ? 2 : 0;
      }

      if (profile?.goal === 'gain_muscle') {
        return workout.type === 'strength' || workout.type === 'fullbody'
          ? 2
          : 0;
      }

      if (profile?.goal === 'improve_health') {
        return workout.type === 'mobility' || workout.type === 'fullbody'
          ? 2
          : 0;
      }

      return workout.sourceType === 'featured_editorial' ? 2 : 0;
    };

    return [...source]
      .sort((left, right) => scoreWorkout(right) - scoreWorkout(left))
      .slice(0, 8);
  }, [profile?.goal, workoutsQuery.data]);

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: 2,
      paddingBottom: bottomClearance + theme.spacing.lg,
      gap: theme.spacing.lg,
    },
    section: {
      gap: theme.spacing.sm,
    },
    actionList: {
      gap: theme.spacing.sm,
    },
    toolRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    discoverySection: {
      gap: theme.spacing.md,
      marginTop: theme.spacing.xs,
      paddingTop: theme.spacing.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
  });

  const openWorkoutDetail = (workoutId: string) => {
    navigation.navigate(HOME_ROUTES.WorkoutDetail, { workoutId });
  };

  const openWorkoutsTab = () => {
    navigation.getParent()?.navigate(TAB_ROUTES.Workouts as never);
  };

  const openEllieTab = () => {
    navigation.getParent()?.navigate(TAB_ROUTES.Ellie as never);
  };

  const openQuizLanding = () => {
    navigation.navigate(HOME_ROUTES.QuizLanding);
  };

  const openNotifications = () => {
    navigation.navigate(HOME_ROUTES.Notifications);
  };

  const openChallengeFlow = () => {
    navigation.navigate(HOME_ROUTES.Challenge);
  };

  const handleSaveNutritionLog = async (
    input: Parameters<typeof nutritionActions.saveTodayLog>[0],
  ) => {
    try {
      await nutritionActions.saveTodayLog(input);
      setNutritionLogVisible(false);
      Alert.alert('Nutrición registrada', 'Tu consumo de hoy quedó guardado.');
    } catch (error) {
      Alert.alert(
        'No pudimos guardar tu nutrición',
        error instanceof Error ? error.message : 'Inténtalo nuevamente.',
      );
    }
  };

  const openPersonalRecords = () => {
    navigation.navigate(HOME_ROUTES.PersonalRecords);
  };

  const openLatestPersonalRecord = () => {
    const latest = personalRecordsQuery.latestRecord;

    if (!latest) {
      openPersonalRecords();
      return;
    }

    const exerciseName =
      (exercisesQuery.data || []).find(
        exercise => exercise.id === latest.exerciseId,
      )?.name || 'Ejercicio';

    navigation.navigate(HOME_ROUTES.PersonalRecords, {
      exerciseId: latest.exerciseId,
      exerciseName,
    });
  };

  const openRegisterPr = () => {
    navigation.navigate(HOME_ROUTES.RegisterPr, {
      showExercisePicker: true,
    });
  };

  const handleTodayWorkoutPress = () => {
    const workoutId = overview?.todaySession?.workoutId;

    if (
      workoutId &&
      (workoutsQuery.data || []).some(item => item.id === workoutId)
    ) {
      navigation.navigate(HOME_ROUTES.WorkoutSession, { workoutId });
      return;
    }

    openWorkoutsTab();
  };

  const handleNutritionPress = () => {
    if (nutritionPlan) {
      setNutritionLogVisible(true);
      return;
    }

    openEllieTab();
  };

  const handleAddWater = () => {
    homeQuery.addHydration(250).catch(() => {
      Alert.alert(
        'No pudimos registrar el agua',
        'Inténtalo nuevamente en unos segundos.',
      );
    });
  };

  const priorityContent =
    priority === 'core33'
      ? {
          eyebrow: 'Core 33',
          title: challenge
            ? `Día ${challenge.challengeDay} de 33`
            : 'Construye tu constancia',
          description: challenge
            ? challenge.completedToday >= challenge.totalHabits
              ? 'Completaste los hábitos de hoy. Revisa tu avance en el reto.'
              : `Completa ${Math.max(
                  challenge.totalHabits - challenge.completedToday,
                  0,
                )} hábitos para cerrar el día.`
            : 'Empieza un reto simple de tres hábitos durante 33 días.',
          progress: challenge ? coreDailyProgress : 0,
          progressLabel: challenge
            ? `${challenge.completedToday} de ${challenge.totalHabits} hábitos`
            : 'Reto sin iniciar',
          ctaLabel: challenge ? 'Continuar reto' : 'Conocer Core 33',
          Icon: ListChecks,
          backgroundSource: homeCore33Editorial,
          overlayOpacity: 0.72,
          onPress: openChallengeFlow,
        }
      : priority === 'nutrition'
      ? {
          eyebrow: 'Nutrición',
          title: hasNutritionLog
            ? 'Tu registro está al día'
            : 'Registra tu alimentación',
          description: hasNutritionLog
            ? 'Revisa cómo avanza tu consumo frente a tus objetivos diarios.'
            : 'Carga tu consumo para mantener visibles calorías y macros.',
          progress: nutritionProgress,
          progressLabel: nutritionPlan
            ? `${todayNutritionLog?.calories || 0} de ${
                nutritionPlan.targetCalories
              } kcal`
            : 'Sin plan activo',
          ctaLabel: hasNutritionLog ? 'Ver nutrición' : 'Registrar ahora',
          Icon: UtensilsCrossed,
          backgroundSource: bodyScienceThumbNutrition,
          overlayOpacity: 0.74,
          onPress: handleNutritionPress,
        }
      : {
          eyebrow: 'Entrenamiento',
          title:
            session?.status === 'completed'
              ? 'Entrenamiento completado'
              : session?.status === 'in_progress' ||
                session?.status === 'canceled'
              ? session.workoutTitle
              : 'Entrenamiento de hoy',
          description:
            session?.status === 'completed'
              ? `${session.duration} min y ${
                  session.caloriesBurned || 0
                } kcal. Tu sesión ya quedó registrada.`
              : session?.status === 'in_progress' ||
                session?.status === 'canceled'
              ? `Llevas ${completedExercises} de ${totalExercises} ejercicios.`
              : 'Elige una sesión alineada con tu objetivo y empieza cuando quieras.',
          progress: workoutProgress,
          progressLabel:
            session?.status === 'completed'
              ? 'Sesión terminada'
              : totalExercises > 0
              ? `${completedExercises} de ${totalExercises} ejercicios`
              : 'Aún no has entrenado',
          ctaLabel:
            session?.status === 'completed'
              ? 'Ver sesión'
              : session?.status === 'in_progress' ||
                session?.status === 'canceled'
              ? 'Continuar entreno'
              : 'Elegir entreno',
          Icon: Dumbbell,
          backgroundSource: homeTrainingEditorial,
          overlayOpacity: 0.58,
          onPress: handleTodayWorkoutPress,
        };

  const dailyStatuses: DailyStatusItem[] = [
    {
      key: 'workout',
      label: 'Entrenamiento',
      value:
        session?.status === 'completed'
          ? 'Listo'
          : totalExercises > 0
          ? `${completedExercises}/${totalExercises}`
          : 'Pendiente',
      detail:
        session?.status === 'completed'
          ? '100% del día'
          : session?.status === 'in_progress' || session?.status === 'canceled'
          ? `${workoutProgress}% completado`
          : '0% del día',
      progress: workoutProgress,
      Icon: Dumbbell,
      onPress: handleTodayWorkoutPress,
    },
    {
      key: 'nutrition',
      label: 'Nutrición',
      value: nutritionPlan ? `${nutritionProgress}%` : 'Sin plan',
      detail: nutritionPlan
        ? hasNutritionLog
          ? 'Registro cargado'
          : 'Pendiente hoy'
        : 'Pídele una guía a ELLIE',
      progress: nutritionProgress,
      Icon: UtensilsCrossed,
      onPress: handleNutritionPress,
    },
    {
      key: 'hydration',
      label: 'Hidratación',
      value: overview?.hydration
        ? `${overview.hydration.todayGlasses}/${overview.hydration.goalGlasses}`
        : '—',
      detail: homeQuery.isAddingHydration ? 'Registrando…' : '+1 vaso al tocar',
      progress: overview?.hydration.todayPercentage || 0,
      Icon: Droplets,
      onPress: handleAddWater,
      disabled: !overview?.hydration || homeQuery.isAddingHydration,
    },
    {
      key: 'core33',
      label: 'Core 33',
      value: challenge
        ? `${challenge.completedToday}/${challenge.totalHabits}`
        : 'Sin reto',
      detail: challenge
        ? challenge.status === 'completed'
          ? 'Reto completado'
          : `Día ${challenge.challengeDay} de 33`
        : 'Conoce el desafío',
      progress: coreDailyProgress,
      Icon: ListChecks,
      onPress: openChallengeFlow,
    },
  ];

  if (homeQuery.isLoading || workoutsQuery.isLoading) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <Loader label="Cargando tu inicio..." />
      </SafeAreaView>
    );
  }

  if (homeQuery.error || workoutsQuery.error) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.content}>
          <HomeHeader
            notificationsCount={notificationsOverview.unreadCount}
            onOpenNotifications={openNotifications}
          />
          <EmptyState
            title="No pudimos cargar tu inicio"
            description="Revisa la configuración de Supabase o vuelve a intentarlo más tarde."
            icon={
              <RefreshCw
                color={theme.colors.textSecondary}
                size={20}
                strokeWidth={2}
              />
            }
            actionLabel="Reintentar"
            onAction={() => {
              Promise.all([homeQuery.refetch(), workoutsQuery.refetch()]).catch(
                () => {},
              );
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
        onScroll={tabBarMotion.onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <HomeHeader
          notificationsCount={notificationsOverview.unreadCount}
          onOpenNotifications={openNotifications}
        />
        <HomePriorityCard {...priorityContent} />

        <View style={styles.section}>
          <HomeSectionHeader
            title="Tu día"
            subtitle="Un vistazo rápido a lo que llevas hoy"
          />
          <DailyStatusGrid items={dailyStatuses} />
        </View>

        <View style={styles.section}>
          <HomeSectionHeader
            title="Impulsa tu progreso"
            subtitle="Acciones breves que complementan tu entrenamiento"
          />
          <View style={styles.actionList}>
            <QuizPromoCard onPress={openQuizLanding} />
            <View style={styles.toolRow}>
              <RecentPRCard
                record={personalRecordsQuery.latestRecord}
                exerciseName={
                  personalRecordsQuery.latestRecord
                    ? (exercisesQuery.data || []).find(
                        exercise =>
                          exercise.id ===
                          personalRecordsQuery.latestRecord!.exerciseId,
                      )?.name || null
                    : null
                }
                onOpen={openLatestPersonalRecord}
                onRegister={openRegisterPr}
              />
              <RecoveryGuidanceCard onPress={openEllieTab} />
            </View>
          </View>
        </View>

        <View style={styles.discoverySection}>
          <HomeSectionHeader
            title="Descubre"
            subtitle="Ideas, equipamiento y sesiones para seguir explorando"
          />
          <WearBanner onPress={() => setWearPreviewVisible(true)} />
          <WorkoutCarousel
            title="Recomendados para ti"
            subtitle="Seleccionados por ELLIE según tus objetivos"
            workouts={recommendedWorkouts}
            onSelectWorkout={openWorkoutDetail}
          />
        </View>
      </ScrollView>
      <WearPreviewModal
        visible={wearPreviewVisible}
        onClose={() => setWearPreviewVisible(false)}
      />
      {nutritionPlan ? (
        <NutritionLogModal
          visible={nutritionLogVisible}
          plan={nutritionPlan}
          todayLog={todayNutritionLog}
          saving={nutritionActions.isSavingTodayLog}
          onClose={() => setNutritionLogVisible(false)}
          onSave={handleSaveNutritionLog}
        />
      ) : null}
    </SafeAreaView>
  );
}
