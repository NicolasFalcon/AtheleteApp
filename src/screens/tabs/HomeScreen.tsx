import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBarV2, useThemeV2, useToast } from '@app/components/v2';
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
  buildDayRings,
  homeDateLine,
  homeSectionOrder,
  isChallengeActive,
  isCoreClosedToday,
  quizMastery,
  resolveHomeMode,
  resolveHomeSlides,
  slideFor,
  sessionActiveSeconds,
  trainedMinutesToday,
  toGlasses,
  type DayRingKind,
  type HomeChallengeState,
} from '@app/features/home/homePriority';
import { homeChallengeCard } from '@app/features/home/homeChallengeSection';
import { useSocialResource, useSocialService } from '@app/features/social/useSocial';
import { EllieBand } from '@app/features/home/v2/EllieBand';
import { OfficialChallengeSection } from '@app/features/home/v2/OfficialChallengeSection';
import { RouteInviteCard } from '@app/features/home/v2/RouteInviteCard';
import { Core33InviteCard } from '@app/features/home/v2/Core33InviteCard';
import { DayRingsCard } from '@app/features/home/v2/DayRingsCard';
import {
  HERO_HEIGHT,
  HomeHero,
  type HeroWorkout,
} from '@app/features/home/v2/HomeHero';
import { workoutTypeLabel } from '@app/features/home/v2/homeLabels';
import { QuizBanner } from '@app/features/home/v2/QuizBanner';
import { WearCard } from '@app/features/wear/WearCard';
import { WeekCarousel } from '@app/features/home/v2/WeekCarousel';
import { recommendRoutines } from '@app/features/workouts/workoutsModel';
import { devHomeScroll, useHomeModeOverride } from '@app/dev/homeModeOverride';
import { useAuth } from '@app/hooks/useAuth';
import { useEllieData } from '@app/hooks/useEllieData';
import { useHomeFeed } from '@app/hooks/useHomeFeed';
import { useUnreadNotifications } from '@app/features/social/useSocial';
import { useNotificationsOverview } from '@app/hooks/useNotificationsOverview';
import { useHydration } from '@app/hooks/useHydration';
import { useQuizCategories } from '@app/hooks/useQuizCategories';
import { useTabBarMetrics } from '@app/hooks/useTabBarMetrics';
import { useTabBarMotion } from '@app/hooks/useTabBarMotion';
import { useWorkoutLibrary } from '@app/hooks/useWorkoutLibrary';
import { getGreeting, getLocalDateKey } from '@app/lib/date';
import type { Workout } from '@app/shared';
import type { TabScreenProps } from '@app/types/navigation';

type Props = TabScreenProps<'Home'>;


// TODO(core33-priority): the user cannot pin Core 33 as the priority yet (no
// such preference in the profile, BT-54). When it exists, read it here.
const CORE33_FIRST_PRIORITY = false;

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
  const ellieData = useEllieData();
  const notifications = useNotificationsOverview();
  // Social notifications only add to the dot of the bell: no new screen. When
  // only they are pending, the bell opens them.
  const socialUnread = useUnreadNotifications();
  const quizQuery = useQuizCategories();
  const { addGlass } = useHydration();
  const openCore33 = useOpenCore33();
  const openCore33Discovery = useOpenCore33Discovery();
  const homeOverride = useHomeModeOverride();
  const modeOverride = homeOverride?.mode ?? null;
  const inviteDismissals = useCore33InviteDismissals();
  // Official challenge section (cache shared with Comunidad: joining updates
  // both at once through the service's optimistic layer).
  const toast = useToast();
  const socialService = useSocialService();
  const challenges = useSocialResource('getMyChallenges', service =>
    service.getMyChallenges(),
  );
  const challengeCard = useMemo(
    () => homeChallengeCard(challenges.data),
    [challenges.data],
  );
  const [joining, setJoining] = useState(false);

  // Refresh everything when coming back to Inicio (not on the first mount).
  // Development only: open already scrolled (`-homeScroll N`), for captures.
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    const y = devHomeScroll();
    if (y > 0) {
      const id = setTimeout(() => scrollRef.current?.scrollTo({ y, animated: false }), 900);
      return () => clearTimeout(id);
    }
  }, []);

  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      homeQuery.refetch().catch(() => {});
      ellieData.overviewQuery.refetch().catch(() => {});
      quizQuery.refetch().catch(() => {});
      workoutsQuery.refetch().catch(() => {});
      challenges.reload();
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
  // Hero carousel: one slide per state of the day.
  const realSlides = overview
    ? resolveHomeSlides({
        hasCompletedEver: overview.hasCompletedEver,
        workoutDoneToday: Boolean(overview.completedToday),
        hasResumableSession: Boolean(overview.resumable),
        challenge: challengeState,
        core33FirstPriority: CORE33_FIRST_PRIORITY,
      })
    : null;
  const slides = homeOverride ? homeOverride.slides.map(slideFor) : realSlides;
  const isNewUser = mode === 'new';

  // Core 33 discovery card (HOME_10 / HOME_11): only without a current
  // challenge (an active one lives in the hero). The app has no "prepared,
  // not started" state yet: a participation is active from the start.
  const core33History = overview?.core33History;
  // Day 33 of the latest finished challenge: start + 32 days (approximation)
  // or, when later, the day the profile says it was completed
  // (profiles.core33_completed_at): completing late no longer shows the card
  // the same day.
  const completedKey = profile?.core33CompletedAt
    ? getLocalDateKey(new Date(profile.core33CompletedAt))
    : null;
  const approxDay33 = core33History?.lastDay33 ?? null;
  const latestDay33 =
    completedKey && (!approxDay33 || completedKey > approxDay33)
      ? completedKey
      : approxDay33;
  const realInvite =
    overview && inviteDismissals.loaded
      ? resolveCore33Invite({
          hasCurrentChallenge: challenge?.status === 'active',
          completedCount: core33History?.completedCount ?? 0,
          lastDay33: latestDay33,
          dismissedAt: inviteDismissals.dismissedAt,
          dismissCount: inviteDismissals.dismissCount,
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
    // Immediate: the glass shows up in the ring before the write returns.
    addGlass(() =>
      Alert.alert(
        'No pudimos registrar el agua',
        'Inténtalo nuevamente en unos segundos.',
      ),
    );
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
        // Registrar nutrición opens over the Nutrición screen (with or
        // without a plan: the sheet adds to the day's totals).
        navigation.navigate(APP_ROUTES.NutritionPlan, { openLog: true });
        return;
      case 'hydration':
        navigation.navigate(APP_ROUTES.NutritionPlan);
        return;
    }
  };

  const sections = homeSectionOrder({
    core33Invite: Boolean(core33Invite),
    challenge: challengeCard !== null,
  });

  // Optimistic: the service flips `official.mine` in the cache at once and
  // rolls it back (with a toast) if the server refuses.
  const joinOfficial = async () => {
    if (!challengeCard || joining) {
      return;
    }
    setJoining(true);
    try {
      const result = await socialService.joinOfficialChallenge(challengeCard.id);
      if (!result.ok) {
        toast.show(
          result.error === 'not_available'
            ? 'Este reto ya no está disponible'
            : 'No se pudo completar la acción',
          { tone: 'error' },
        );
        return;
      }
      toast.show('Te uniste al reto');
    } catch {
      toast.show('No se pudo completar la acción', { tone: 'error' });
    } finally {
      setJoining(false);
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
        ref={scrollRef}
        onScroll={tabBarMotion.onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomClearance }}
      >
        <HomeHero
          slides={homeQuery.error && !homeOverride ? null : slides}
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
          hasNotifications={notifications.unreadCount > 0 || socialUnread > 0}
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
            navigation.navigate(
              notifications.unreadCount === 0 && socialUnread > 0
                ? APP_ROUTES.SocialNotifications
                : APP_ROUTES.Notifications,
            )
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
          {sections.map(key => {
            switch (key) {
              case 'rings':
                return (
                  <DayRingsCard
                    key={key}
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
                );
              case 'route':
                // TODO(ruta): the Ruta flow replaces this placeholder (Fase 5).
                return (
                  <RouteInviteCard
                    key={key}
                    onPress={() => navigation.navigate(APP_ROUTES.RouteSoon)}
                  />
                );
              case 'core33Invite':
                return core33Invite ? (
                  <Core33InviteCard
                    key={key}
                    variant={core33Invite}
                    completedCount={Math.max(core33History?.completedCount ?? 0, 1)}
                    onPress={() =>
                      openCore33Discovery(core33History?.completedCount ?? 0)
                    }
                    onDismiss={() => inviteDismissals.dismiss()}
                  />
                ) : null;
              case 'ellie':
                // Opens the chat; nothing is sent.
                return (
                  <EllieBand
                    key={key}
                    onPress={() =>
                      navigation.navigate(APP_ROUTES.EllieChat, { focusInput: true })
                    }
                  />
                );
              case 'challenge':
                return challengeCard ? (
                  <OfficialChallengeSection
                    key={key}
                    card={challengeCard}
                    joining={joining}
                    onPress={() =>
                      navigation.navigate(APP_ROUTES.SocialChallenge, {
                        challengeId: challengeCard.id,
                      })
                    }
                    onJoin={joinOfficial}
                  />
                ) : null;
              case 'routines':
                return (
                  <WeekCarousel
                    key={key}
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
                );
              case 'quiz':
                return (
                  <QuizBanner
                    key={key}
                    loading={ellieData.overviewQuery.isLoading || quizQuery.isLoading}
                    points={points}
                    mastery={quizQuery.data ? quizMastery(quizQuery.data) : null}
                    onPress={() => navigation.navigate(APP_ROUTES.QuizLanding)}
                  />
                );
              case 'wear':
                return (
                  <WearCard
                    key={key}
                    onPress={() => navigation.navigate(APP_ROUTES.Wear)}
                  />
                );
            }
          })}
        </View>
      </ScrollView>
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
