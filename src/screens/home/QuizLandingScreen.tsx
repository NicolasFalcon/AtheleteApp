import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BackButton,
  GlassHeader,
  StatusBarV2,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { APP_ROUTES, ROOT_ROUTES } from '@app/constants/routes';
import { BlockError } from '@app/features/home/v2/BlockError';
import {
  categoryPhotoKey,
  historyRows,
  pickDailyChallenge,
  quizMasterProgress,
  ROUND_SIZE,
  weekLine,
  weekPlay,
} from '@app/features/quiz/quizModel';
import {
  ChallengeStrip,
  DailyChallengeCard,
  HistoryList,
  MasterRow,
  PointsFigure,
  QuizPortadaSkeleton,
  WeekDots,
  type QuizCategoryView,
} from '@app/features/quiz/v2/QuizParts';
import { useProfileOverview } from '@app/hooks/useProfileOverview';
import { useQuizOverview } from '@app/hooks/useQuiz';
import { safeGoBack } from '@app/navigation/safeGoBack';
import type { AppScreenProps } from '@app/types/navigation';
import type { QuizCategoryPreview, QuizOverview } from '@app/types/quiz';

type Props = AppScreenProps<'QuizLanding'>;

// Quiz · portada (QUIZ_01): points and the week of play, the challenge of the
// day as a hero, every category as a challenge with the record in a ring,
// the progress towards Quiz Master and the last rounds. Tapping a challenge
// opens its start screen. Data: categories, questions and attempts from
// Supabase (read only); points from the profile.
export function QuizLandingScreen({ navigation, route }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const dev = __DEV__ ? route.params?.devState : undefined;
  const overviewQuery = useQuizOverview();
  const profileQuery = useProfileOverview();
  const now = useMemo(() => new Date(), []);

  // Development: sample data, nothing is read.
  const sample = useMemo<{ overview: QuizOverview; points: number } | null>(() => {
    if (!__DEV__ || (dev !== 'data' && dev !== 'new' && dev !== 'perfect')) {
      return null;
    }
    const fixtures = require('@app/dev/quizFixtures') as typeof import('@app/dev/quizFixtures');
    return {
      overview: fixtures.quizOverviewFixture(dev, now),
      points: dev === 'new' ? 0 : fixtures.QUIZ_FIXTURE_POINTS,
    };
  }, [dev, now]);

  const overview = dev === 'empty' ? { categories: [], attempts: [] } : sample?.overview ?? overviewQuery.data;
  const points = sample ? sample.points : profileQuery.data?.points ?? null;
  const loading = dev === 'loading' || (!dev && overviewQuery.isLoading);
  const failed = dev === 'error' || (!dev && overviewQuery.isError && !overviewQuery.data);

  const views = useMemo<QuizCategoryView[]>(
    () =>
      (overview?.categories ?? []).map((category, index) => ({
        category,
        photo: categoryPhotoKey(category, index),
      })),
    [overview?.categories],
  );

  const open = (category: QuizCategoryPreview) =>
    navigation.navigate(APP_ROUTES.QuizChallenge, {
      categoryId: category.id,
      categoryName: category.name,
      categoryIcon: category.icon,
    });

  const week = weekPlay(overview?.attempts ?? [], now);
  const daily = pickDailyChallenge(
    views.map(view => ({ ...view, bestScore: view.category.bestScore })),
    now,
  );
  const master = quizMasterProgress(overview?.categories ?? []);
  const history = historyRows(overview?.attempts ?? [], overview?.categories ?? [], now);

  let content: React.ReactNode;
  if (failed) {
    content = (
      <BlockError
        message="No pudimos cargar el Quiz."
        onRetry={() => overviewQuery.refetch().catch(() => {})}
      />
    );
  } else if (loading) {
    content = <QuizPortadaSkeleton />;
  } else if (views.length === 0) {
    content = (
      <View style={styles.empty}>
        <TextV2 variant="sub" align="center">
          Aún no hay desafíos
        </TextV2>
        <TextV2 variant="body" tone="secondary" align="center">
          Cuando haya categorías activas, aparecerán aquí para jugar.
        </TextV2>
      </View>
    );
  } else {
    content = (
      <>
        <View style={styles.top}>
          <PointsFigure points={points} />
          <WeekDots days={week.days} line={weekLine(week.count)} />
        </View>
        {daily ? (
          <DailyChallengeCard
            view={daily}
            rounds={Math.min(daily.category.questionCount || ROUND_SIZE, ROUND_SIZE)}
            onPress={() => open(daily.category)}
          />
        ) : null}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <TextV2 variant="section" accessibilityRole="header">
              Desafíos
            </TextV2>
            <TextV2 variant="meta" tone="secondary">
              Supera tu récord
            </TextV2>
          </View>
          <ChallengeStrip views={views} onOpen={open} />
        </View>
        <MasterRow
          progress={master}
          perfect={views.map(view => view.category.bestScore === 100)}
        />
        {history.length > 0 ? <HistoryList rows={history} /> : null}
      </>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <GlassHeader
        title="Quiz"
        left={<BackButton onPress={() => safeGoBack(navigation, [ROOT_ROUTES.MainTabs])} />}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: layout.gutter, paddingBottom: insets.bottom + 44 },
        ]}
      >
        {content}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingTop: 6, gap: 26 },
  top: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  section: { gap: 14 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  empty: { gap: 8, alignItems: 'center', paddingVertical: 80 },
});
