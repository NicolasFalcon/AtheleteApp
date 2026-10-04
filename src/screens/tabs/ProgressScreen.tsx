import { ELLIE_ASKS } from '@app/features/ellie/chatModel';
import { useOpenEllieChat } from '@app/features/ellie/useOpenEllieChat';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  EllieSurface,
  MetricTrio,
  Segmented,
  StatusBarShield,
  StatusBarV2,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { APP_ROUTES } from '@app/constants/routes';
import {
  useOpenCore33,
  useOpenCore33Discovery,
} from '@app/features/core33/useOpenCore33';
import { BlockError } from '@app/features/home/v2/BlockError';
import {
  buildHero,
  buildHydrationWeek,
  buildMonth,
  buildNutritionWeek,
  buildWeek,
  currentStreak,
  longestStreak,
  monthComparisonLine,
  weekComparisonLine,
  weekKeys,
  type ProgressPeriod,
} from '@app/features/progress/progressModel';
import { groupRecords } from '@app/features/progress/recordsModel';
import {
  HERO_HEIGHT,
  ProgressHeroView,
} from '@app/features/progress/v2/ProgressHeroView';
import {
  HeroSkeleton,
  SheetSkeleton,
} from '@app/features/progress/v2/ProgressSkeleton';
import { RetosHero, RetosSheet } from '@app/features/progress/v2/RetosView';
import {
  MonthBlock,
  NutritionHydrationRow,
  RecordsBlock,
  TrainingWeekBlock,
} from '@app/features/progress/v2/SummaryBlocks';
import { DEFAULT_WATER_GOAL_GLASSES } from '@app/features/nutrition/nutritionModel';
import { useAuth } from '@app/hooks/useAuth';
import { useEllieData } from '@app/hooks/useEllieData';
import { useProgressSummary } from '@app/hooks/useProgressSummary';
import { useTabBarMetrics } from '@app/hooks/useTabBarMetrics';
import { useTabBarMotion } from '@app/hooks/useTabBarMotion';
import { SceneScope } from '@app/providers/ThemeProvider';
import { getLocalDateKey } from '@app/lib/date';
import type { TabScreenProps } from '@app/types/navigation';

type Props = TabScreenProps<'Progress'>;
type Section = 'summary' | 'challenges';

const ELLIE_FALLBACK = 'ELLIE está lista para ayudarte con tu progreso.';

// Progreso v2 (PROGRESS_01–04, STATE_03): dark evolution hero, the week or the
// month in the sheet, ELLIE and "Tus marcas". Segment "Retos" shows Core 33.
export function ProgressScreen({ navigation, route }: Props) {
  const { colors, layout, radius } = useThemeV2();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tabBarMotion = useTabBarMotion();
  const { bottomClearance } = useTabBarMetrics();
  const { profile } = useAuth();
  const ellie = useEllieData();
  const openEllieChat = useOpenEllieChat();
  const openCore33 = useOpenCore33();
  const openCore33Discovery = useOpenCore33Discovery();
  const summary = useProgressSummary();
  const dev = __DEV__ ? route.params?.devState : undefined;

  const [section, setSection] = useState<Section>(
    route.params?.segment ?? 'summary',
  );
  const [period, setPeriod] = useState<ProgressPeriod>(
    route.params?.period ?? 'week',
  );
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const devScroll = __DEV__ ? route.params?.devScroll : undefined;
  useEffect(() => {
    if (devScroll) {
      const timer = setTimeout(
        () => scrollRef.current?.scrollTo({ y: devScroll, animated: false }),
        1200,
      );
      return () => clearTimeout(timer);
    }
  }, [devScroll, section, period]);

  // Tab params (dev screen cycler, deep links).
  useEffect(() => {
    if (route.params?.segment) {
      setSection(route.params.segment);
    }
    if (route.params?.period) {
      setPeriod(route.params.period);
    }
  }, [route.params?.segment, route.params?.period]);

  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      summary.refetchAll().catch(() => {});
      // refetchAll only reads stable query objects.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.setValue(event.nativeEvent.contentOffset.y);
      tabBarMotion.onScroll(event);
    },
    [scrollY, tabBarMotion],
  );

  const now = useMemo(() => new Date(), []);
  const fixture = useMemo(() => {
    if (!__DEV__ || dev !== 'data') {
      return null;
    }
     
    return require('@app/dev/progressFixtures') as typeof import('@app/dev/progressFixtures');
  }, [dev]);
  const sample = useMemo(
    () => fixture?.progressFixture(now) ?? null,
    [fixture, now],
  );

  const overview = summary.overviewQuery.data;
  const forced = Boolean(sample) || dev === 'empty';
  const sessionsData = summary.sessions;
  const recordsData = summary.recordsQuery.records;
  const data = useMemo(
    () => ({
      sessions: sample ? sample.sessions : forced ? [] : sessionsData,
      hydrationLogs: sample
        ? sample.hydration
        : forced
        ? []
        : overview?.hydrationLogs ?? [],
      nutritionLogs: sample
        ? sample.nutrition
        : forced
        ? []
        : overview?.dailyNutritionLogs ?? [],
      challenge: sample
        ? sample.challenge
        : forced
        ? null
        : overview?.challenge ?? null,
      records: sample ? sample.records : forced ? [] : recordsData,
      hasPlan: sample ? true : Boolean(overview?.nutritionPlan),
      goalProtein: sample ? 168 : overview?.nutritionPlan?.targetProtein,
      goalGlasses: sample ? DEFAULT_WATER_GOAL_GLASSES : overview?.dailyWaterGoal || DEFAULT_WATER_GOAL_GLASSES,
    }),
    [forced, overview, recordsData, sample, sessionsData],
  );
  const {
    sessions,
    hydrationLogs,
    nutritionLogs,
    challenge,
    records,
    hasPlan,
    goalProtein,
    goalGlasses,
  } = data;

  const loading = dev === 'loading' || (!dev && summary.isLoading);
  const failed = dev === 'error' || (!dev && Boolean(summary.error));

  const model = useMemo(() => {
    const todayKey = getLocalDateKey(now);
    const keys = weekKeys(now);
    const names = (id: string) =>
      sample
        ? fixture?.FIXTURE_EXERCISE_NAMES[id] ?? 'Ejercicio'
        : summary.exercisesQuery.data?.find(item => item.id === id)?.name ??
          'Ejercicio';
    return {
      hero: buildHero(sessions, now),
      week: buildWeek(sessions, now, {
        goalSessions: profile?.trainingDaysPerWeek,
        sessionMinutes: profile?.preferredSessionMinutes,
      }),
      month: buildMonth(sessions, now),
      streak: currentStreak(sessions, now),
      best: longestStreak(sessions),
      nutrition: buildNutritionWeek(nutritionLogs, goalProtein, keys, todayKey),
      hydration: buildHydrationWeek(hydrationLogs, goalGlasses, keys, todayKey),
      groups: groupRecords(records, names, now),
    };
  }, [
    fixture,
    goalGlasses,
    goalProtein,
    hydrationLogs,
    nutritionLogs,
    now,
    profile?.preferredSessionMinutes,
    profile?.trainingDaysPerWeek,
    records,
    sample,
    sessions,
    summary.exercisesQuery.data,
  ]);

  const copyTop = insets.top + 82;
  const headerTop = insets.top + 8;
  const hasData = model.hero.kind !== 'empty';
  const isWeek = period === 'week';
  const { week, month } = model;

  const header = (
    <SceneScope>
      <View style={[styles.header, { top: headerTop }]}>
        <TextV2
          variant="title26"
          color="#FFFFFF"
          style={styles.title}
          accessibilityRole="header"
        >
          Progreso
        </TextV2>
        <Segmented
          options={[
            { key: 'summary', label: 'Resumen' },
            { key: 'challenges', label: 'Retos' },
          ]}
          value={section}
          onChange={key => {
            setSection(key);
            scrollY.setValue(0);
          }}
          style={styles.segmented}
        />
      </View>
    </SceneScope>
  );

  let hero: React.ReactNode;
  let sheet: React.ReactNode;

  if (loading) {
    hero = <HeroSkeleton top={copyTop} />;
    sheet = <SheetSkeleton />;
  } else if (failed) {
    hero = <View style={[styles.plainHero, { height: HERO_HEIGHT }]} />;
    sheet = (
      <BlockError
        message="No pudimos cargar tu progreso."
        onRetry={() => {
          summary.refetchAll().catch(() => {});
        }}
      />
    );
  } else if (section === 'challenges') {
    hero = (
      <RetosHero
        challenge={challenge}
        top={copyTop}
        width={width}
        onOpen={openCore33}
        onDiscover={openCore33Discovery}
      />
    );
    sheet = (
      <RetosSheet
        streak={model.streak}
        bestStreak={model.best}
        challenge={challenge}
      />
    );
  } else {
    hero = <ProgressHeroView hero={model.hero} top={copyTop} width={width} />;
    sheet = (
      <>
        <View style={styles.between}>
          <TextV2 variant="section">{isWeek ? 'Tu semana' : 'Tu mes'}</TextV2>
          <Segmented
            size="compact"
            style={styles.periodSegmented}
            options={[
              { key: 'week', label: 'Semana' },
              { key: 'month', label: 'Mes' },
            ]}
            value={period}
            onChange={setPeriod}
          />
        </View>

        {hasData ? (
          <View style={styles.summaryText}>
            <MetricTrio
              items={
                isWeek
                  ? [
                      {
                        value: String(week.sessions),
                        unit: `/${week.goalSessions}`,
                        label: 'Sesiones',
                      },
                      {
                        value: String(week.minutes),
                        unit: 'min',
                        label: 'Entreno',
                      },
                      {
                        value: String(model.streak),
                        unit: 'días',
                        label: 'Racha',
                      },
                    ]
                  : [
                      { value: String(month.sessions), label: 'Sesiones' },
                      {
                        value: String(month.minutes),
                        unit: 'min',
                        label: 'Entreno',
                      },
                      {
                        value: String(month.activeDays),
                        label: 'Días activos',
                      },
                    ]
              }
            />
            <TextV2 variant="body">
              {isWeek ? weekComparisonLine(week) : monthComparisonLine(month)}
            </TextV2>
          </View>
        ) : null}

        {isWeek ? (
          <>
            <TrainingWeekBlock week={week} empty={!hasData} />
            <NutritionHydrationRow
              nutrition={model.nutrition}
              hydration={model.hydration}
              hasPlan={hasPlan}
              onOpen={() => navigation.navigate(APP_ROUTES.NutritionPlan)}
            />
          </>
        ) : (
          <MonthBlock month={month} now={now} />
        )}

        <EllieSurface
          eyebrow=""
          message={ellie.heroInsight?.text ?? ELLIE_FALLBACK}
          action={{
            label: 'Hablar con ELLIE',
            onPress: () => openEllieChat(ELLIE_ASKS.week),
          }}
          style={{ marginHorizontal: -layout.gutter }}
        />

        <RecordsBlock
          groups={model.groups}
          onOpen={group =>
            navigation.navigate(APP_ROUTES.PersonalRecords, {
              exerciseId: group.exerciseId,
              exerciseName: group.exerciseName,
            })
          }
          onOpenAll={() => navigation.navigate(APP_ROUTES.PersonalRecords, {})}
          onRegister={() =>
            navigation.navigate(APP_ROUTES.RegisterPr, {
              showExercisePicker: true,
            })
          }
        />
      </>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 style="light" />
      <ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <View>
          {hero}
          {header}
        </View>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.bg,
              borderTopLeftRadius: radius.sheet,
              borderTopRightRadius: radius.sheet,
              paddingHorizontal: layout.gutter,
              paddingBottom: bottomClearance,
            },
          ]}
        >
          {sheet}
        </View>
      </ScrollView>
      <StatusBarShield scrollY={scrollY} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontWeight: '700' },
  segmented: { width: 188 },
  periodSegmented: { width: 146 },
  plainHero: { backgroundColor: '#141312' },
  sheet: { marginTop: -28, paddingTop: 26, gap: 30, minHeight: 420 },
  between: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryText: { gap: 16, marginTop: -10 },
});
