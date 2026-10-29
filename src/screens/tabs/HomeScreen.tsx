import { GuideAnchor, useGuide } from '@app/features/guides/GuideAnchor';
import { RecoveryTiles } from '@app/features/home/v2/RecoveryTiles';
import { RouteCard } from '@app/features/home/v2/RouteCard';
import { useBreathingWeek, useSleepOverview } from '@app/hooks/useSleep';
import { useCallback, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBarV2, TextV2, useThemeV2 } from '@app/components/v2';
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
  formatThousands,
  homeDateLine,
  homeSectionOrder,
  type DayWorkout,
  isChallengeActive,
  isCoreClosedToday,
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
import { levelProgress } from '@app/features/play/playModel';
import { usePlayHome } from '@app/features/play/usePlay';
import { WearCard } from '@app/features/wear/WearCard';
import type { RoutineSuggestion } from '@app/services/routines/routinesService';
import { useAuth } from '@app/hooks/useAuth';
import { useEllieData } from '@app/hooks/useEllieData';
import { useHomeFeed } from '@app/hooks/useHomeFeed';
import { useUnreadNotifications } from '@app/features/social/useSocial';
import { useNotificationsOverview } from '@app/hooks/useNotificationsOverview';
import { useHydration } from '@app/hooks/useHydration';
import { buildPlan } from '@app/features/session/sessionModel';
import { fetchSessionDetail } from '@app/services/supabase/session';
import { useRoutine, useTodaySuggestion } from '@app/hooks/useRoutines';
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
  const insets = useSafeAreaInsets();
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
  // Week strip of Tu día (get_week_plan).
  const weekQuery = useWeekPlan();
  const ellieData = useEllieData();
  const notifications = useNotificationsOverview();
  // Social notifications only add to the dot of the bell: no new screen. When
  // only they are pending, the bell opens them.
  const socialUnread = useUnreadNotifications();
  // Athelete Play card: points, player level and the Racha de Play, the same
  // get_play_home as Play's portada.
  const playQuery = usePlayHome();
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
      playQuery.refetch().catch(() => {});
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

  // ── Tu día (v2.18 §28.14) ───────────────────────────────────────────────
  // Today's routine: the pending session's, else the finished one's, else
  // today's suggestion. Its planned sets are the session plan's (buildPlan).
  const dayRoutineId =
    resumable?.workoutId ??
    (completedToday && !isRouteSession(completedToday) ? completedToday.workoutId : null) ??
    suggestion?.routineId ??
    null;
  const dayRoutineQuery = useRoutine(dayRoutineId, { refetchOnMount: true });
  const dayRoutine = dayRoutineQuery.data ?? null;
  const setsTotal = dayRoutine
    ? buildPlan(dayRoutine.exercises).reduce((total, exercise) => total + exercise.sets, 0)
    : null;
  // Sets already logged in the pending session (workout_session_sets).
  const resumeDetail = useQuery({
    queryKey: ['home', 'resume-sets', resumable?.id],
    enabled: Boolean(resumable?.id),
    queryFn: () => fetchSessionDetail(resumable!.id),
  });
  const dayWorkout: DayWorkout =
    resumable || completedToday || suggestion
      ? {
          plan: 'session',
          setsDone: resumeDetail.data?.sets.length ?? 0,
          setsTotal: completedToday && isRouteSession(completedToday) ? null : setsTotal,
          completedToday: Boolean(completedToday),
        }
      : restDay
      ? { plan: 'rest' }
      : { plan: 'none' };
  const { rings, dayPct } = buildDayRings({
    isNewUser,
    challenge: challengeState,
    workout: dayWorkout,
    nutrition: {
      hasPlan: Boolean(overview?.nutritionPlan),
      calories: overview?.todayNutritionLog?.calories ?? 0,
      targetCalories: overview?.nutritionPlan?.targetCalories ?? 0,
    },
    hydration: { todayMl, goalGlasses },
  });

  // "Retomar · quedan ~N min": the routine's estimate minus the active
  // minutes so far; without one, the pace of the exercises already done.
  // Never 0; null when there is nothing to estimate from.
  const resumeMinutesLeft = (() => {
    if (!resumable) {
      return null;
    }
    const elapsed = sessionActiveSeconds(resumable) / 60;
    const estimate =
      resumable.workoutId === dayRoutine?.id && dayRoutine.duration > 0
        ? dayRoutine.duration
        : resumable.completedExercises.length > 0 && resumable.totalExercises > 0
        ? (elapsed / resumable.completedExercises.length) * resumable.totalExercises
        : null;
    return estimate === null ? null : Math.max(1, Math.round(estimate - elapsed));
  })();

  const playPlayer = playQuery.data?.player ?? null;

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
        // Rest day → Semana; nothing planned → Entrenos; else the routine.
        if (dayWorkout.plan === 'rest') {
          navigation.navigate(APP_ROUTES.Week);
        } else if (dayWorkout.plan === 'none') {
          openWorkouts();
        } else if (resumable) {
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

  const sections = homeSectionOrder({ core33Invite: Boolean(core33Invite) });

  const completedWorkout = completedRoutineQuery.data ?? null;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 style="light" />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
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
                  minutesLeft: resumeMinutesLeft,
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
              case 'day':
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
                    onTrain={openWorkouts}
                    week={weekQuery.data ?? null}
                    weekLoading={weekQuery.isLoading}
                    onOpenWeek={() => navigation.navigate(APP_ROUTES.Week)}
                    // No insight from today's data yet (the sleep one needs
                    // Apple Health, §28.12): the note stays hidden.
                    insight={null}
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
              case 'recovery':
                return (
                  <HomeSection key={key} title="Recupera">
                    <RecoveryTiles
                      sleep={sleepQuery.data ?? null}
                      breathingCount={breathingQuery.data?.weekCount ?? null}
                      onSleep={() => navigation.navigate(APP_ROUTES.Sleep)}
                      onBreathe={() => navigation.navigate(APP_ROUTES.Breathe)}
                    />
                  </HomeSection>
                );
              case 'compete':
                return (
                  <HomeSection key={key} title="Muévete y compite">
                    {challengeCard ? (
                      <OfficialChallengeSection
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
                    ) : null}
                    <RouteCard
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
                  </HomeSection>
                );
              case 'play':
                return (
                  <HomeSection key={key} title="Aprende y juega">
                    <QuizBanner
                      loading={playQuery.isLoading}
                      points={playPlayer?.totalPoints ?? null}
                      mastery={
                        playPlayer
                          ? {
                              progress: levelProgress(playPlayer.pointsInLevel, playPlayer.pointsToNext),
                              line: playPlayer.nextTitle
                                ? `Nivel ${playPlayer.level} · ${formatThousands(playPlayer.pointsToNext)} pts para ${playPlayer.nextTitle}`
                                : `Nivel ${playPlayer.level} · ${playPlayer.title}`,
                            }
                          : null
                      }
                      streak={playQuery.data?.streak.days ?? null}
                      onPress={() => navigation.navigate(APP_ROUTES.PlayHome)}
                    />
                  </HomeSection>
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

// Section of Inicio (v2.18): small caps title (11/600, .08 em, secondary)
// over its cards, 12 pt apart.
function HomeSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <TextV2 variant="eyebrow" tone="secondary" style={styles.sectionTitle}>
        {title}
      </TextV2>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  sectionTitle: {
    paddingLeft: 2,
  },
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
