import { useMemo, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, Loader } from '@app/components/ui';
import { TAB_ROUTES, HOME_ROUTES } from '@app/constants/routes';
import { RecoveryGuidanceCard } from '@app/features/home/components/RecoveryGuidanceCard';
import { QuizPromoCard } from '@app/features/home/components/QuizPromoCard';
import { RecentPRCard } from '@app/features/home/components/RecentPRCard';
import { useHomeFeed } from '@app/hooks/useHomeFeed';
import { useAuth } from '@app/hooks/useAuth';
import { useAppTheme } from '@app/hooks/useAppTheme';
import { useExerciseLibrary } from '@app/hooks/useExerciseLibrary';
import { usePersonalRecords } from '@app/hooks/usePersonalRecords';
import { useWorkoutLibrary } from '@app/hooks/useWorkoutLibrary';
import { ChallengeBannerCard } from '@app/features/home/components/ChallengeBannerCard';
import { HomeHeader } from '@app/features/home/components/HomeHeader';
import { HydrationOverviewCard } from '@app/features/home/components/HydrationOverviewCard';
import { NutritionOverviewCard } from '@app/features/home/components/NutritionOverviewCard';
import { TodayWorkoutCard } from '@app/features/home/components/TodayWorkoutCard';
import { WearBanner } from '@app/features/home/components/WearBanner';
import { WearPreviewModal } from '@app/features/home/components/WearPreviewModal';
import { WorkoutCarousel } from '@app/features/home/components/WorkoutCarousel';
import type { HomeStackParamList } from '@app/types/navigation';

type Props = NativeStackScreenProps<HomeStackParamList, 'HomeRoot'>;

export function HomeScreen({ navigation }: Props) {
  const { theme } = useAppTheme();
  const { profile } = useAuth();
  const homeQuery = useHomeFeed();
  const personalRecordsQuery = usePersonalRecords();
  const exercisesQuery = useExerciseLibrary();
  const workoutsQuery = useWorkoutLibrary();
  const [wearPreviewVisible, setWearPreviewVisible] = useState(false);

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
      paddingTop: theme.spacing.xs,
      paddingBottom: theme.spacing.xs,
      gap: theme.spacing.md,
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

  const openProgressTab = () => {
    navigation.getParent()?.navigate(TAB_ROUTES.Progress as never);
  };

  const openQuizLanding = () => {
    navigation.navigate(HOME_ROUTES.QuizLanding);
  };

  const openNutritionPlan = () => {
    navigation.navigate(HOME_ROUTES.NutritionPlan);
  };

  const openPersonalRecords = () => {
    navigation.navigate(HOME_ROUTES.PersonalRecords);
  };

  const handleTodayWorkoutPress = () => {
    const workoutId = homeQuery.data?.todaySession?.workoutId;

    if (
      workoutId &&
      (workoutsQuery.data || []).some(item => item.id === workoutId)
    ) {
      navigation.navigate(HOME_ROUTES.WorkoutSession, { workoutId });
      return;
    }

    openWorkoutsTab();
  };

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
          <HomeHeader />
          <EmptyState
            title="No pudimos cargar tu inicio"
            description="Revisa la configuración de Supabase o vuelve a intentarlo más tarde."
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
        <HomeHeader />
        <ChallengeBannerCard
          challenge={homeQuery.data?.challenge || null}
          onPress={openProgressTab}
        />
        <TodayWorkoutCard
          session={homeQuery.data?.todaySession || null}
          onPress={handleTodayWorkoutPress}
        />
        <NutritionOverviewCard
          plan={homeQuery.data?.nutritionPlan || null}
          todayLog={homeQuery.data?.todayNutritionLog || null}
          onAskEllie={openEllieTab}
          onOpenPlan={
            homeQuery.data?.nutritionPlan ? openNutritionPlan : undefined
          }
        />
        {homeQuery.data?.hydration ? (
          <HydrationOverviewCard
            todayMl={homeQuery.data.hydration.todayMl}
            goalMl={homeQuery.data.hydration.goalMl}
            todayGlasses={homeQuery.data.hydration.todayGlasses}
            goalGlasses={homeQuery.data.hydration.goalGlasses}
            todayPercentage={homeQuery.data.hydration.todayPercentage}
            streak={homeQuery.data.hydration.streak}
            loading={homeQuery.isAddingHydration}
            onAddWater={homeQuery.addHydration}
          />
        ) : null}
        <QuizPromoCard onPress={openQuizLanding} />
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
          onOpen={openPersonalRecords}
          onRegister={openPersonalRecords}
        />
        <RecoveryGuidanceCard onPress={openEllieTab} />
        <WearBanner onPress={() => setWearPreviewVisible(true)} />
        <WorkoutCarousel
          title="Recomendados para ti"
          subtitle="Seleccionados por ELLIE según tus objetivos"
          workouts={recommendedWorkouts}
          onSelectWorkout={openWorkoutDetail}
        />
      </ScrollView>
      <WearPreviewModal
        visible={wearPreviewVisible}
        onClose={() => setWearPreviewVisible(false)}
      />
    </SafeAreaView>
  );
}
