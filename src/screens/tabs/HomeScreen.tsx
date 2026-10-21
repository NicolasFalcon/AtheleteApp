import { GuideAnchor, useGuide } from '@app/features/guides/GuideAnchor';
import { RecoveryTiles } from '@app/features/home/v2/RecoveryTiles';
import { RouteCard } from '@app/features/home/v2/RouteCard';
import { useBreathingWeek, useSleepOverview } from '@app/hooks/useSleep';
import { WeekStrip } from '@app/features/home/v2/WeekStrip';
import { useCallback, useMemo, useRef } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBarV2, useThemeV2 } from '@app/components/v2';
import { APP_ROUTES, TAB_ROUTES } from '@app/constants/routes';
import { resolveCore33Invite } from '@app/features/core33/core33Invite';
import { useCore33InviteDismissals } from '@app/features/core33/useCore33InviteDismissals';
import {
  useOpenCore33,
  useOpenCore33Discovery,
} from '@app/features/core33/useOpenCore33';
import {
  allDoneLine,
  buildDayRings,
  homeDateLine,
  homeSectionOrder,
  isChallengeActive,
  isCoreClosedToday,
  quizMastery,
  resolveHomeMode,
  resolveHomeSlides,
  sessionActiveSeconds,
  trainedMinutesToday,
  toGlasses,
  waterGoalGlasses,
  type DayRingKind,
  type HomeChallengeState,
} from '@app/features/home/homePriority';
import { routeStore } from '@app/features/route/routeStore';
import type { RouteActivity } from '@app/features/route/routeTypes';
import { useRecentActivities, useTodayRouteActivity } from '@app/features/route/useRouteData';
import {
  homeChallengeCard,
} from '@app/features/home/homeChallengeSection';
import { useSocialResource } from '@app/features/social/useSocial';
import { EllieBand } from '@app/features/home/v2/EllieBand';
import { OfficialChallengeSection } from '@app/features/home/v2/OfficialChallengeSection';
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
import type { RoutineSuggestion } from '@app/services/routines/routinesService';
import { useAuth } from '@app/hooks/useAuth';
import { useEllieData } from '@app/hooks/useEllieData';
import { useHomeFeed } from '@app/hooks/useHomeFeed';
import { useUnreadNotifications } from '@app/features/social/useSocial';
import { useNotificationsOverview } from '@app/hooks/useNotificationsOverview';
import { useHydration } from '@app/hooks/useHydration';
import { useQuizCategories } from '@app/hooks/useQuizCategories';
import { useTabBarMetrics } from '@app/hooks/useTabBarMetrics';
import { useTabBarMotion } from '@app/hooks/useTabBarMotion';
import {
  useRoutine,
  useRoutineList,
  useTodaySuggestion,
} from '@app/hooks/useRoutines';
import { useWeekPlan } from '@app/hooks/useWeekPlan';
import { getGreeting, getLocalDateKey } from '@app/lib/date';
import { isRouteSession } from '@app/shared';
import type { TabScreenProps } from '@app/types/navigation';

type Props = TabScreenProps<'Home'>;


// TODO(core33-priority): the user cannot pin Core 33 as the priority yet (no
// such preference in the profile, BT-54). When it exists, read it here.
const CORE33_FIRST_PRIORITY = false;

// get_today_suggestion → the hero routine (null: no candidate today, the
// empty "Elige tu entreno de hoy").
function toHeroWorkout(suggestion: RoutineSuggestion | null): HeroWorkout | null {
  return suggestion
    ? {
        title: suggestion.title,
        typeLabel: workoutTypeLabel({
          routineCategory: suggestion.routineCategory,
          type: 'strength',
        }),
        minutes: suggestion.duration,
        reason: suggestion.reason,
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
  // Guía de Inicio (25.4): 4 steps, once per user.
  const scrollRef = useRef<ScrollView>(null);
  useGuide('home', { scrollRef });
  // Hero: today's suggestion (get_today_suggestion, one per local day). With
  // an active week plan it is that day's routine, or a rest day.
  const suggestionQuery = useTodaySuggestion();
  const suggestion = suggestionQuery.data?.suggestion ?? null;
  const restDay = suggestionQuery.data?.restDay ?? null;
  // "Tu semana" strip (get_week_plan).
  const weekQuery = useWeekPlan();
  // "Para entrenar esta semana": the first page of list_routines.
  const workoutsQuery = useRoutineList('all');
  const ellieData = useEllieData();
  const notifications = useNotificationsOverview();
  // Social notifications only add to the dot of the bell: no new screen. When
  // only they are pending, the bell opens them.
  const socialUnread = useUnreadNotifications();
  const quizQuery = useQuizCategories();
  const { addGlass } = useHydration();
  const openCore33 = useOpenCore33();
  const openCore33Discovery = useOpenCore33Discovery();
  const inviteDismissals = useCore33InviteDismissals();
  // Official challenge section (cache shared with Comunidad). Real data only.
  const challenges = useSocialResource('getMyChallenges', service =>
    service.getMyChallenges(),
  );
  // "Tu ruta real": today's activity from the server (get_today_route_activity).
  const todayRouteQuery = useTodayRouteActivity();
  const todayRoute: RouteActivity | null = todayRouteQuery.data ?? null;
  // The latest outdoor activity, for the card's "Última · N km".
  const latestRouteQuery = useRecentActivities(1);
  // Sueño + Respira tiles: the same reads as their screens.
  const sleepQuery = useSleepOverview();
  const breathingQuery = useBreathingWeek();
  const challengeCard = useMemo(
    () => homeChallengeCard(challenges.data),
    [challenges.data],
  );
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
      quizQuery.refetch().catch(() => {});
      workoutsQuery.refetch().catch(() => {});
      weekQuery.refetch().catch(() => {});
      sleepQuery.refetch().catch(() => {});
      breathingQuery.refetch().catch(() => {});
      // Today's suggestion is not asked again: one per local day (a new day
      // is a new key; a saved session drops it).
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
  const workouts = workoutsQuery.items;
  const recommended = useMemo(
    () => recommendRoutines(workouts, profile?.goal),
    [profile?.goal, workouts],
  );

  // ── Mode ────────────────────────────────────────────────────────────────
  const mode = overview
    ? resolveHomeMode({
        hasCompletedEver: overview.hasCompletedEver,
        workoutDoneToday: Boolean(overview.completedToday),
        hasResumableSession: Boolean(overview.resumable),
        challenge: challengeState,
      })
    : null;
  // Hero carousel: one slide per state of the day.
  const slides = overview
    ? resolveHomeSlides({
        hasCompletedEver: overview.hasCompletedEver,
        workoutDoneToday: Boolean(overview.completedToday),
        hasResumableSession: Boolean(overview.resumable),
        challenge: challengeState,
        core33FirstPriority: CORE33_FIRST_PRIORITY,
      })
    : null;
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
  const core33Invite =
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

  // The same suggestion for a new user (reason_code "first") and the rest.
  const heroWorkoutSource = suggestion;
  const resumable = overview?.resumable ?? null;
  const completedToday = overview?.completedToday ?? null;
  // Type of today's finished routine ("45 min de fuerza").
  const completedRoutineQuery = useRoutine(
    completedToday && !isRouteSession(completedToday)
      ? completedToday.workoutId
      : null,
    { refetchOnMount: true },
  );
  // profiles.daily_water_goal, the same goal ELLIE reads (null: none).
  const goalGlasses = waterGoalGlasses(profile?.dailyWaterGoal);
  const todayMl = overview?.hydration.todayMl ?? 0;
  const waterDone = goalGlasses !== null && toGlasses(todayMl) >= goalGlasses;

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
    profile?.preferredSessionMinutes || suggestion?.duration || 30;
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
    if (suggestion) {
      navigation.navigate(APP_ROUTES.WorkoutDetail, {
        workoutId: suggestion.routineId,
      });
      return;
    }
    openWorkouts();
  };

  const resumeSession = () => {
    const workoutId = resumable?.workoutId;
    // The session screen reads the routine with get_routine (any routine,
    // also the user's own).
    if (workoutId) {
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
        // The Nutrición ring opens the camera of Calorías (design §23.7).
        navigation.navigate(APP_ROUTES.CaloriesCamera, {
          source: 'home',
          todayKcal: overview?.todayNutritionLog?.calories ?? 0,
        });
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

  const completedWorkout = completedRoutineQuery.data ?? null;
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
        <GuideAnchor id="home.priority">
        <HomeHero
          slides={homeQuery.error ? null : slides}
          error={Boolean(homeQuery.error)}
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
            workout: toHeroWorkout(heroWorkoutSource),
            restDay: restDay ? { kind: restDay.kind } : null,
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
                  typeLabel: isRouteSession(completedToday)
                    ? 'ruta'
                    : workoutTypeLabel(completedWorkout).toLowerCase(),
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
          onOpenWeek={() => navigation.navigate(APP_ROUTES.Week)}
          onResume={resumeSession}
          onOpenProgress={() => navigation.navigate(TAB_ROUTES.Progress)}
        />
        </GuideAnchor>

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
              case 'week':
                return (
                  <GuideAnchor key={key} id="home.week">
                  <WeekStrip
                    week={weekQuery.data ?? null}
                    loading={weekQuery.isLoading}
                    error={weekQuery.isError}
                    onRetry={() => {
                      weekQuery.refetch().catch(() => {});
                    }}
                    onPress={() => navigation.navigate(APP_ROUTES.Week)}
                  />
                  </GuideAnchor>
                );
              case 'rings':
                return (
                  <GuideAnchor key={key} id="home.rings">
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
                  </GuideAnchor>
                );
              case 'recovery':
                return (
                  <RecoveryTiles
                    key={key}
                    sleep={sleepQuery.data ?? null}
                    breathingCount={breathingQuery.data?.weekCount ?? null}
                    onSleep={() => navigation.navigate(APP_ROUTES.Sleep)}
                    onBreathe={() => navigation.navigate(APP_ROUTES.Breathe)}
                  />
                );
              case 'route':
                return (
                  <RouteCard
                    key={key}
                    today={todayRoute}
                    latest={latestRouteQuery.data?.[0] ?? null}
                    onPress={() => {
                      if (todayRoute) {
                        routeStore.reset({ finished: todayRoute });
                        navigation.navigate(APP_ROUTES.RouteResult, { activityId: todayRoute.id });
                        return;
                      }
                      routeStore.reset();
                      navigation.navigate(APP_ROUTES.RoutePrep);
                    }}
                    onSeeAll={() => navigation.navigate(APP_ROUTES.Profile)}
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
                    onPress={() =>
                      challengeCard.state === 'joined'
                        ? navigation.navigate(APP_ROUTES.SocialChallenge, {
                            challengeId: challengeCard.id,
                          })
                        : // No challenge (or finished): the "Retos oficiales" view.
                          navigation.navigate(APP_ROUTES.SocialOfficialList)
                    }
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
