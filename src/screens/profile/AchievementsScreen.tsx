import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BackButton,
  GlassHeader,
  Skeleton,
  SkeletonGroup,
  StatusBarV2,
  useThemeV2,
} from '@app/components/v2';
import { ROOT_ROUTES } from '@app/constants/routes';
import { BlockError } from '@app/features/home/v2/BlockError';
import {
  buildBadgeStats,
  buildShelves,
  type ShelfItem,
} from '@app/features/progress/badgesModel';
import { currentStreak } from '@app/features/progress/progressModel';
import {
  BadgeSheet,
  CollectionHeader,
  ShelfRow,
} from '@app/features/progress/v2/AchievementViews';
import { useProfileOverview } from '@app/hooks/useProfileOverview';
import { useProgressSummary } from '@app/hooks/useProgressSummary';
import { safeGoBack } from '@app/navigation/safeGoBack';
import { ALL_BADGES } from '@app/shared';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'Achievements'>;

const BACK_FALLBACKS = [ROOT_ROUTES.MainTabs];

// Logros v2 (ACHIEVEMENTS_01 / 02): the collection count, one shelf per
// category with the medals (locked ones with a progress ring) and the detail
// sheet. Badges come from user_badges; the progress is measured from the
// sessions, the hydration and Core 33.
export function AchievementsScreen({ navigation, route }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const dev = __DEV__ ? route.params?.devState : undefined;
  const overviewQuery = useProfileOverview();
  const summary = useProgressSummary();
  const now = useMemo(() => new Date(), []);

  const sample = useMemo(() => {
    if (!__DEV__ || dev !== 'data') {
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fixtures =
      require('@app/dev/progressFixtures') as typeof import('@app/dev/progressFixtures');
    return fixtures.progressFixture(now);
  }, [dev, now]);

  const overview = overviewQuery.data;
  const overviewData = summary.overviewQuery.data;
  const sessionsData = summary.sessions;

  const result = useMemo(() => {
    const earned = sample ? sample.badges : overview?.badges ?? [];
    const sessions = sample ? sample.sessions : sessionsData;
    const stats = buildBadgeStats({
      sessions,
      streakDays: sample
        ? currentStreak(sample.sessions, now)
        : overview?.currentStreak ?? 0,
      hydrationLogs: sample
        ? sample.hydration
        : overviewData?.hydrationLogs ?? [],
      goalGlasses: sample ? 14 : overviewData?.dailyWaterGoal ?? 14,
      challengeDays: sample
        ? sample.challenge.completedDays
        : overview?.challenge?.completedDays ?? 0,
      today: now,
    });
    return buildShelves(earned, stats);
  }, [now, overview, overviewData, sample, sessionsData]);

  const [selected, setSelected] = useState<ShelfItem | null>(null);

  // Development only: open a medal's sheet once (first earned / first locked).
  const devSheet = __DEV__ ? route.params?.devSheet : undefined;
  const devOpened = useRef(false);
  useEffect(() => {
    if (!devSheet || devOpened.current) {
      return;
    }
    const all = result.shelves.flatMap(shelf => shelf.items);
    const target =
      devSheet === 'locked'
        ? all.find(item => !item.earned && item.progress)
        : all.find(item => item.earned);
    if (target) {
      // iOS does not present a modal during the screen's push animation.
      const timer = setTimeout(() => {
        devOpened.current = true;
        setSelected(target);
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [devSheet, result.shelves]);

  const loading =
    dev === 'loading' ||
    (!dev && (overviewQuery.isLoading || summary.isLoading));
  const failed =
    dev === 'error' || (!dev && Boolean(overviewQuery.error || summary.error));
  const retry = () => {
    overviewQuery.refetch().catch(() => {});
    summary.refetchAll().catch(() => {});
  };

  let content: React.ReactNode;
  if (failed) {
    content = (
      <BlockError message="No pudimos cargar tus logros." onRetry={retry} />
    );
  } else if (loading) {
    content = (
      <SkeletonGroup>
        <View style={styles.skeleton}>
          <Skeleton width={120} height={72} radius={14} />
          <Skeleton width="80%" height={14} radius={7} />
          <Skeleton height={3} radius={2} />
          {[0, 1].map(shelf => (
            <View key={shelf} style={styles.skeletonShelf}>
              <Skeleton width={140} height={20} radius={10} />
              <View style={styles.skeletonMedals}>
                {[0, 1, 2].map(index => (
                  <Skeleton key={index} width={82} height={92} radius={20} />
                ))}
              </View>
            </View>
          ))}
        </View>
      </SkeletonGroup>
    );
  } else {
    content = (
      <>
        <CollectionHeader
          earned={result.earnedCount}
          total={ALL_BADGES.length}
        />
        {result.shelves.map(shelf => (
          <ShelfRow key={shelf.key} shelf={shelf} onOpen={setSelected} />
        ))}
      </>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <GlassHeader
        title="Logros"
        left={
          <BackButton onPress={() => safeGoBack(navigation, BACK_FALLBACKS)} />
        }
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingHorizontal: layout.gutter,
            paddingBottom: insets.bottom + 40,
          },
        ]}
      >
        {content}
      </ScrollView>
      <BadgeSheet item={selected} onClose={() => setSelected(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingTop: 16, gap: 26 },
  skeleton: { gap: 18, paddingTop: 8 },
  skeletonShelf: { gap: 16, paddingTop: 12 },
  skeletonMedals: { flexDirection: 'row', gap: 14 },
});
