import { ELLIE_ASKS } from '@app/features/ellie/chatModel';
import { useOpenEllieChat } from '@app/features/ellie/useOpenEllieChat';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { EllieSurface, StatusBarV2, useThemeV2 } from '@app/components/v2';
import { APP_ROUTES, TAB_ROUTES } from '@app/constants/routes';
import { resolveCore33Invite } from '@app/features/core33/core33Invite';
import { useCore33InviteDismissals } from '@app/features/core33/useCore33InviteDismissals';
import {
  useOpenCore33,
  useOpenCore33Discovery,
} from '@app/features/core33/useOpenCore33';
import {
  DEFAULT_WATER_GOAL_GLASSES,
  allDoneLine,
  bestMarkParts,
  buildDayRings,
  homeDateLine,
  isChallengeActive,
  isCoreClosedToday,
  prCurve,
  quizMastery,
  resolveHomeMode,
  sessionActiveSeconds,
  trainedMinutesToday,
  toGlasses,
  type DayRingKind,
  type HomeChallengeState,
} from '@app/features/home/homePriority';
import {
  BestMarkCard,
  type BestMark,
} from '@app/features/home/v2/BestMarkCard';
import { Core33InviteCard } from '@app/features/home/v2/Core33InviteCard';
import { DayRingsCard } from '@app/features/home/v2/DayRingsCard';
import {
  HERO_HEIGHT,
  HomeHero,
  type HeroWorkout,
} from '@app/features/home/v2/HomeHero';
import { workoutTypeLabel } from '@app/features/home/v2/homeLabels';
import { QuizBanner } from '@app/features/home/v2/QuizBanner';
import { WearBannerV2 } from '@app/features/home/v2/WearBannerV2';
import { WeekCarousel } from '@app/features/home/v2/WeekCarousel';
import { recommendRoutines } from '@app/features/workouts/workoutsModel';
import { WearPreviewModal } from '@app/features/home/components/WearPreviewModal';
import { NutritionLogModal } from '@app/features/nutrition/components/NutritionLogModal';
import { useHomeModeOverride } from '@app/dev/homeModeOverride';
import { useAuth } from '@app/hooks/useAuth';
import { useEllieData } from '@app/hooks/useEllieData';
import { useExerciseLibrary } from '@app/hooks/useExerciseLibrary';
import { useHomeFeed } from '@app/hooks/useHomeFeed';
import { useNotificationsOverview } from '@app/hooks/useNotificationsOverview';
import { useNutritionPlan } from '@app/hooks/useNutritionPlan';
import { usePersonalRecords } from '@app/hooks/usePersonalRecords';
import { useQuizCategories } from '@app/hooks/useQuizCategories';
import { useTabBarMetrics } from '@app/hooks/useTabBarMetrics';
import { useTabBarMotion } from '@app/hooks/useTabBarMotion';
import { useWorkoutLibrary } from '@app/hooks/useWorkoutLibrary';
import { getGreeting, getLocalDateKey } from '@app/lib/date';
import { getBestPR, type Workout } from '@app/shared';
import type { TabScreenProps } from '@app/types/navigation';

type Props = TabScreenProps<'Home'>;

const ELLIE_FALLBACK = 'ELLIE está lista para ayudarte con tu progreso de hoy.';

function toHeroWorkout(workout: Workout | null): HeroWorkout | null {
  return workout
    ? {
        title: workout.title,
        typeLabel: workoutTypeLabel(workout),
        minutes: workout.duration,
        exercises: workout.exercises.length,
        calories: workout.calories,
      }
    : null;
}

// Inicio v2 (Home.dc.html · HOME_01–07). Every block reads real Supabase data
// through the existing services and has its own loading / empty / error state.
export function HomeScreen({ navigation }: Props) {
  const { colors, layout, radius } = useThemeV2();
  const tabBarMotion = useTabBarMotion();
  const { bottomClearance } = useTabBarMetrics();
  const { profile } = useAuth();
  const homeQuery = useHomeFeed();
  const workoutsQuery = useWorkoutLibrary();
  const recordsQuery = usePersonalRecords();
  const exercisesQuery = useExerciseLibrary();
  const ellieData = useEllieData();
  const notifications = useNotificationsOverview();
  const quizQuery = useQuizCategories();
  const nutritionActions = useNutritionPlan();
  const openCore33 = useOpenCore33();
  const openCore33Discovery = useOpenCore33Discovery();
  const homeOverride = useHomeModeOverride();
  const modeOverride = homeOverride?.mode ?? null;
  const inviteDismissals = useCore33InviteDismissals();
  const [wearVisible, setWearVisible] = useState(false);
  const [nutritionLogVisible, setNutritionLogVisible] = useState(false);

  // Refresh everything when coming back to Inicio (not on the first mount).
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      homeQuery.refetch().catch(() => {});
      ellieData.overviewQuery.refetch().catch(() => {});
      recordsQuery.refetch().catch(() => {});
      quizQuery.refetch().catch(() => {});
      workoutsQuery.refetch().catch(() => {});
      // refetch functions are stable; listing the query objects would
      // re-run this effect on every render.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const overview = homeQuery.data;
  const challenge = overview?.challenge ?? null;
  const challengeState: HomeChallengeState = challenge
    ? {
        active: challenge.status === 'active',
        completedToday: challenge.completedToday,
        totalHabits: challenge.totalHabits,
      }
    : null;
  const coreActive = isChallengeActive(challengeState);
  const coreClosed = isCoreClosedToday(challengeState);

  // ── Routines: current recommendation score by goal ──────────────────────
  const workouts = workoutsQuery.data;
  const recommended = useMemo(
    () => recommendRoutines(workouts || [], profile?.goal),
    [profile?.goal, workouts],
  );

  // First session for a new user: shortest beginner routine (DA-42).
  const firstSession = useMemo(() => {
    const all = workouts || [];
    const beginners = all.filter(workout => workout.difficulty === 'beginner');
    const pool = beginners.length > 0 ? beginners : all;
    return [...pool].sort((a, b) => a.duration - b.duration)[0] ?? null;
  }, [workouts]);

  const findWorkout = (id?: string | null) =>
    id ? (workouts || []).find(workout => workout.id === id) ?? null : null;

  // ── Mode ────────────────────────────────────────────────────────────────
  const realMode = overview
    ? resolveHomeMode({
        hasCompletedEver: overview.hasCompletedEver,
        workoutDoneToday: Boolean(overview.completedToday),
        hasResumableSession: Boolean(overview.resumable),
        challenge: challengeState,
      })
    : null;
  // Development-only visual override ("Ver modos de Inicio"); null in prod.
  const mode = modeOverride ?? realMode;
  const openEllieChat = useOpenEllieChat();
  const isNewUser = mode === 'new';

  // Core 33 discovery card (HOME_10 / HOME_11): only without a current
  // challenge (an active one lives in the hero). The app has no "prepared,
  // not started" state yet: a participation is active from the start.
  const core33History = overview?.core33History;
  const realInvite =
    overview && inviteDismissals.loaded
      ? resolveCore33Invite({
          hasCurrentChallenge: challenge?.status === 'active',
          completedCount: core33History?.completedCount ?? 0,
          lastDay33: core33History?.lastDay33 ?? null,
          dismissedAt: inviteDismissals.dismissedAt,
          today: getLocalDateKey(),
          now: new Date(),
        })
      : null;
  const core33Invite = homeOverride ? homeOverride.core33Card : realInvite;

  const heroWorkoutSource = mode === 'new' ? firstSession : recommended[0];
  const resumable = overview?.resumable ?? null;
  const completedToday = overview?.completedToday ?? null;
  const goalGlasses = profile?.dailyWaterGoal || DEFAULT_WATER_GOAL_GLASSES;
  const todayMl = overview?.hydration.todayMl ?? 0;
  const waterDone = toGlasses(todayMl) >= goalGlasses;

  const firstName = profile?.name?.trim().split(/\s+/)[0] || 'Athelete';
  const greeting =
    mode === 'workoutDone' || mode === 'allDone'
      ? `Buen trabajo, ${firstName}`
      : mode === 'new'
      ? `Hola, ${firstName}`
      : `${getGreeting()}, ${firstName}`;
  const streak = ellieData.context?.training.currentStreak ?? 0;

  // ── Tu día ──────────────────────────────────────────────────────────────
  const targetMinutes =
    profile?.preferredSessionMinutes || heroWorkoutSource?.duration || 30;
  const { rings, dayPct } = buildDayRings({
    mode: mode ?? 'workout',
    challenge: challengeState,
    workout: {
      // Active minutes (pauses excluded) of today's completed, saved and
      // in-progress sessions; refreshed every time Inicio gains focus.
      minutesToday: trainedMinutesToday(overview?.todaySessions ?? []),
      completedToday: Boolean(completedToday),
      targetMinutes,
    },
    nutrition: {
      hasPlan: Boolean(overview?.nutritionPlan),
      calories: overview?.todayNutritionLog?.calories ?? 0,
      targetCalories: overview?.nutritionPlan?.targetCalories ?? 0,
    },
    hydration: { todayMl, goalGlasses },
  });

  // ── Tu mejor marca ──────────────────────────────────────────────────────
  const latestRecord = recordsQuery.latestRecord;
  const bestMark = useMemo<BestMark | null>(() => {
    if (!latestRecord) {
      return null;
    }
    const exerciseRecords = recordsQuery.records.filter(
      record => record.exerciseId === latestRecord.exerciseId,
    );
    const best =
      getBestPR(exerciseRecords, latestRecord.prType) ?? latestRecord;
    const parts = bestMarkParts(best);
    const exerciseName =
      (exercisesQuery.data || []).find(
        exercise => exercise.id === latestRecord.exerciseId,
      )?.name || 'Ejercicio';

    return {
      exerciseName,
      value: parts.value,
      unit: parts.unit,
      isNew: parts.isNew,
      curve: prCurve(exerciseRecords, latestRecord.prType),
    };
  }, [exercisesQuery.data, latestRecord, recordsQuery.records]);

  // ── Navigation ──────────────────────────────────────────────────────────
  const openWorkouts = () => navigation.navigate(TAB_ROUTES.Workouts);

  const startHeroWorkout = () => {
    if (heroWorkoutSource) {
      navigation.navigate(APP_ROUTES.WorkoutDetail, {
        workoutId: heroWorkoutSource.id,
      });
      return;
    }
    openWorkouts();
  };

  const resumeSession = () => {
    const workoutId = resumable?.workoutId;
    if (workoutId && findWorkout(workoutId)) {
      // The exact session: a 'saved' one may be from another day.
      navigation.navigate(APP_ROUTES.WorkoutSession, {
        workoutId,
        sessionId: resumable?.id,
      });
      return;
    }
    openWorkouts();
  };

  const addWater = () => {
    homeQuery.addHydration(250).catch(() => {
      Alert.alert(
        'No pudimos registrar el agua',
        'Inténtalo nuevamente en unos segundos.',
      );
    });
  };

  const openRing = (kind: DayRingKind) => {
    switch (kind) {
      case 'core33':
        openCore33();
        return;
      case 'workout':
        if (resumable) {
          resumeSession();
        } else {
          startHeroWorkout();
        }
        return;
      case 'nutrition':
        if (overview?.nutritionPlan) {
          setNutritionLogVisible(true);
        } else {
          navigation.navigate(APP_ROUTES.NutritionPlan);
        }
        return;
      case 'hydration':
        navigation.navigate(APP_ROUTES.NutritionPlan);
        return;
    }
  };

  const handleSaveNutritionLog = async (
    input: Parameters<typeof nutritionActions.saveTodayLog>[0],
  ) => {
    try {
      await nutritionActions.saveTodayLog(input);
      setNutritionLogVisible(false);
      homeQuery.refetch().catch(() => {});
    } catch (error) {
      Alert.alert(
        'No pudimos guardar tu nutrición',
        error instanceof Error ? error.message : 'Inténtalo nuevamente.',
      );
    }
  };

  const completedWorkout = findWorkout(completedToday?.workoutId);
  const points =
    ellieData.context?.achievements.totalPoints ??
    ellieData.overviewQuery.data?.profileExtras.points ??
    null;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 style="light" />
      <ScrollView
        onScroll={tabBarMotion.onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomClearance }}
      >
        <HomeHero
          mode={homeQuery.error && !modeOverride ? null : mode}
          error={Boolean(homeQuery.error) && !modeOverride}
          onRetry={() => {
            homeQuery.refetch().catch(() => {});
          }}
          greeting={greeting}
          dateLine={homeDateLine(new Date(), streak)}
          identity={{
            avatarKey: profile?.avatarKey,
            profilePhotoUrl: profile?.profilePhotoUrl,
          }}
          hasNotifications={notifications.unreadCount > 0}
          data={{
            core: challenge
              ? {
                  day: challenge.challengeDay,
                  habits: challenge.habits.map((habit, index) => ({
                    name: habit.name,
                    done: Boolean(challenge.todayHabits[index]),
                  })),
                  left: Math.max(
                    challenge.totalHabits - challenge.completedToday,
                    0,
                  ),
                }
              : null,
            workout: toHeroWorkout(heroWorkoutSource ?? null),
            resume: resumable
              ? {
                  title: resumable.workoutTitle,
                  done: resumable.completedExercises.length,
                  total: resumable.totalExercises,
                  minutes: Math.floor(
                    sessionActiveSeconds(resumable) / 60,
                  ),
                  inProgress: resumable.status === 'in_progress',
                }
              : null,
            done: completedToday
              ? {
                  minutes: completedToday.duration,
                  typeLabel: workoutTypeLabel(completedWorkout).toLowerCase(),
                }
              : null,
            allDoneLine: allDoneLine({ coreActive, coreClosed, waterDone }),
          }}
          onOpenProfile={() => navigation.navigate(APP_ROUTES.Profile)}
          onOpenNotifications={() =>
            navigation.navigate(APP_ROUTES.Notifications)
          }
          onOpenCore33={openCore33}
          onStartWorkout={startHeroWorkout}
          onResume={resumeSession}
          onOpenProgress={() => navigation.navigate(TAB_ROUTES.Progress)}
        />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.bg,
              borderTopLeftRadius: radius.rise,
              borderTopRightRadius: radius.rise,
              paddingHorizontal: layout.gutter,
            },
          ]}
        >
          <DayRingsCard
            loading={homeQuery.isLoading}
            error={Boolean(homeQuery.error)}
            onRetry={() => {
              homeQuery.refetch().catch(() => {});
            }}
            rings={rings}
            dayPct={dayPct}
            isNewUser={isNewUser}
            addingWater={homeQuery.isAddingHydration}
            onAddWater={addWater}
            onOpenRing={openRing}
          />

          {core33Invite ? (
            <Core33InviteCard
              variant={core33Invite}
              completedCount={Math.max(core33History?.completedCount ?? 0, 1)}
              onPress={openCore33Discovery}
              onDismiss={() =>
                inviteDismissals.dismiss()
              }
            />
          ) : null}

          <EllieSurface
            message={ellieData.heroInsight?.text ?? ELLIE_FALLBACK}
            action={{
              label: 'Hablar con ELLIE',
              onPress: () =>
                openEllieChat(
                  mode === 'workoutDone' || mode === 'allDone'
                    ? ELLIE_ASKS.recovery
                    : ELLIE_ASKS.adjustToday,
                ),
            }}
            orbSize={48}
            style={{ marginHorizontal: -layout.gutter }}
          />

          <BestMarkCard
            loading={recordsQuery.isLoading}
            error={Boolean(recordsQuery.error)}
            onRetry={() => {
              recordsQuery.refetch().catch(() => {});
            }}
            mark={bestMark}
            onOpenRecords={() =>
              navigation.navigate(APP_ROUTES.PersonalRecords)
            }
            onRegister={() =>
              navigation.navigate(APP_ROUTES.RegisterPr, {
                showExercisePicker: true,
              })
            }
          />

          <WeekCarousel
            loading={workoutsQuery.isLoading}
            error={Boolean(workoutsQuery.error)}
            onRetry={() => {
              workoutsQuery.refetch().catch(() => {});
            }}
            workouts={recommended}
            onOpenWorkout={workoutId =>
              navigation.navigate(APP_ROUTES.WorkoutDetail, { workoutId })
            }
            onOpenAll={openWorkouts}
          />

          <QuizBanner
            loading={ellieData.overviewQuery.isLoading || quizQuery.isLoading}
            points={points}
            mastery={quizQuery.data ? quizMastery(quizQuery.data) : null}
            onPress={() => navigation.navigate(APP_ROUTES.QuizLanding)}
          />

          <WearBannerV2 onPress={() => setWearVisible(true)} />
        </View>
      </ScrollView>

      <WearPreviewModal
        visible={wearVisible}
        onClose={() => setWearVisible(false)}
      />
      {overview?.nutritionPlan ? (
        <NutritionLogModal
          visible={nutritionLogVisible}
          plan={overview.nutritionPlan}
          todayLog={overview.todayNutritionLog}
          saving={nutritionActions.isSavingTodayLog}
          onClose={() => setNutritionLogVisible(false)}
          onSave={handleSaveNutritionLog}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  // Surface that rises 32 pt over the hero (radius 32 on top).
  sheet: {
    marginTop: -32,
    paddingTop: 28,
    gap: 32,
    minHeight: HERO_HEIGHT,
  },
});
