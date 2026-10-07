import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RotateCcw } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Button,
  Celebration,
  ProgressRing,
  Sheet,
  StatusBarV2,
  TextV2,
} from '@app/components/v2';
import { APP_ROUTES } from '@app/constants/routes';
import { badgeIcon } from '@app/features/gamification/badgeIcons';
import {
  isNewRecord,
  nextChallenge,
  resultCopy,
  resultTier,
} from '@app/features/quiz/quizModel';
import {
  RecordPill,
  ResultFx,
  ResultStat,
  ReviewList,
  SaveStatus,
} from '@app/features/quiz/v2/ResultParts';
import { formatThousands } from '@app/features/nutrition/nutritionModel';
import { useProfileOverview } from '@app/hooks/useProfileOverview';
import { useQuizOverview, useQuizSubmit } from '@app/hooks/useQuiz';
import { SceneScope } from '@app/providers/ThemeProvider';
import { ALL_BADGES } from '@app/shared';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'QuizResult'>;

type QuizAttemptBest = {
  score: number;
  correctCount: number;
  totalQuestions: number;
};

type SaveView = {
  status: 'saving' | 'error' | 'saved';
  // Best of the category read from the server before saving (null: none).
  previousBest: QuizAttemptBest | null;
  points: number | null;
  total: number | null;
  badges: string[];
  rewardPending: boolean;
};

// Quiz · resultado (QUIZ_07 … QUIZ_09): the score ring, a message that scales
// with the result, points, best streak and total, the topics to review and
// "Otra ronda" first. The score comes from the round itself; saving it in
// `quiz_attempts` (and the points, the new record and the medals) happens
// here, with "guardando" and an error with retry. The same attempt id makes a
// retry safe: it never creates a second row or a second event. The medal
// celebration comes from the server's answer (`new_badges`), not from a
// calculation of the app. A scene: dark in both modes.
export function QuizResultScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const params = route.params;
  const dev = __DEV__ ? params.devState : undefined;
  const overviewQuery = useQuizOverview();
  const profileQuery = useProfileOverview();
  const submit = useQuizSubmit();
  const startedRef = useRef(false);
  const [confirmLeave, setConfirmLeave] = useState<null | (() => void)>(null);
  const [celebrated, setCelebrated] = useState<string[]>([]);
  const leavingRef = useRef(false);

  const { correctCount, totalQuestions, categoryName } = params;
  const tier = resultTier(correctCount, totalQuestions);
  const copy = resultCopy(tier, correctCount, totalQuestions, categoryName);

  const save = useCallback(() => {
    submit.mutate({
      attemptId: params.attemptId,
      categoryId: params.categoryId,
      correctCount,
      totalQuestions,
      pointsEarned: params.pointsEarned,
      answers: params.answers,
    });
  }, [correctCount, params, submit, totalQuestions]);

  // The round is saved once on arrival; "Reintentar" repeats the same attempt.
  useEffect(() => {
    if (dev || startedRef.current) {
      return;
    }
    startedRef.current = true;
    save();
  }, [dev, save]);

  const view: SaveView = useMemo(() => {
    if (dev) {
      return {
        status: dev === 'saving' ? 'saving' : dev === 'error' ? 'error' : 'saved',
        points: params.pointsEarned,
        total: 4860,
        previousBest: params.devPreviousBest ?? null,
        badges: dev === 'firstQuiz' ? ['first_quiz'] : dev === 'master' ? ['first_quiz', 'quiz_master'] : [],
        rewardPending: false,
      };
    }
    if (submit.isError) {
      return { status: 'error', previousBest: null, points: null, total: null, badges: [], rewardPending: false };
    }
    if (submit.data) {
      return {
        status: 'saved',
        previousBest: submit.data.previousBest,
        // The server's points; the saved attempt's when it granted none now.
        points: submit.data.pointsAwarded ?? submit.data.attempt.pointsEarned,
        total: submit.data.totalPoints,
        badges: submit.data.unlockedBadges,
        rewardPending: submit.data.rewardPending,
      };
    }
    return { status: 'saving', previousBest: null, points: null, total: null, badges: [], rewardPending: false };
  }, [dev, params.devPreviousBest, params.pointsEarned, submit.data, submit.isError]);

  const saved = view.status === 'saved';
  const totalPoints = view.total ?? (saved ? profileQuery.data?.points ?? null : null);
  const pendingBadge = saved
    ? view.badges.find(id => !celebrated.includes(id))
    : undefined;
  const badge = ALL_BADGES.find(item => item.id === pendingBadge);

  const next = nextChallenge(overviewQuery.data?.categories ?? [], params.categoryId);

  // Leaving with the round unsaved asks first (it would be lost).
  const leave = (go: () => void) => {
    if (saved || dev) {
      leavingRef.current = true;
      go();
      return;
    }
    setConfirmLeave(() => () => {
      leavingRef.current = true;
      go();
    });
  };

  useEffect(
    () =>
      navigation.addListener('beforeRemove', event => {
        if (leavingRef.current || saved || dev) {
          return;
        }
        event.preventDefault();
        setConfirmLeave(() => () => {
          leavingRef.current = true;
          navigation.dispatch(event.data.action);
        });
      }),
    [dev, navigation, saved],
  );

  const again = () =>
    leave(() =>
      navigation.replace(APP_ROUTES.QuizQuestion, {
        categoryId: params.categoryId,
        categoryName,
        categoryIcon: params.categoryIcon,
      }),
    );
  const goNext = () =>
    next &&
    leave(() =>
      navigation.replace(APP_ROUTES.QuizChallenge, {
        categoryId: next.id,
        categoryName: next.name,
        categoryIcon: next.icon,
      }),
    );
  const close = () => leave(() => navigation.popTo(APP_ROUTES.QuizLanding));

  // "Nuevo récord" is known once the server has answered (it compares with the
  // best read from the server just before saving, not with a cached list).
  const prev = view.previousBest;
  const record = saved && isNewRecord(correctCount, totalQuestions, prev);
  const eyebrow = record
    ? null
    : !saved
    ? categoryName
    : `${categoryName} · ${
        prev ? `récord ${prev.correctCount}/${prev.totalQuestions}` : 'sin récord aún'
      }`;
  const busy = view.status === 'saving';

  return (
    <SceneScope>
      <View style={styles.screen}>
        <StatusBarV2 style="light" />
        <ResultFx tier={tier} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 40 }]}
        >
          <View style={styles.top}>
            {record ? (
              <RecordPill />
            ) : (
              <TextV2 variant="eyebrow" color="#8C8A85">
                {eyebrow}
              </TextV2>
            )}
            <ProgressRing
              size={196}
              strokeWidth={12}
              progress={totalQuestions > 0 ? correctCount / totalQuestions : 0}
              duration={1100}
            >
              <TextV2 variant="displayM" color="#FFFFFF" style={styles.score}>
                {String(correctCount)}
              </TextV2>
              <TextV2 variant="label" color="#8C8A85" style={styles.of}>
                {`de ${totalQuestions}`}
              </TextV2>
            </ProgressRing>
            <Animated.View entering={FadeInDown.delay(350).duration(400)} style={styles.copy}>
              <TextV2 variant="title26" color="#FFFFFF" align="center" style={styles.head} accessibilityRole="header">
                {copy.head}
              </TextV2>
              <TextV2 variant="bodyL" color="#A8A6A1" align="center" style={styles.message}>
                {copy.message}
              </TextV2>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(550).duration(400)} style={styles.trio}>
              <ResultStat
                value={view.points === null ? '—' : `+${view.points}`}
                label="puntos"
              />
              <View style={styles.rule} />
              <ResultStat value={String(params.bestStreak)} label="mejor racha" />
              <View style={styles.rule} />
              <ResultStat
                value={totalPoints === null ? '—' : formatThousands(totalPoints)}
                label="total"
              />
            </Animated.View>
            {tier !== 'perfect' && params.missed.length > 0 ? (
              <ReviewList items={params.missed.slice(0, 3)} />
            ) : null}
          </View>
        </ScrollView>

        <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 16) + 6 }]}>
          {view.status !== 'saved' ? (
            <SaveStatus kind={view.status} onRetry={view.status === 'error' ? save : undefined} />
          ) : view.rewardPending ? (
            <SaveStatus kind="reward" onRetry={save} />
          ) : null}
          <Button
            label="Otra ronda"
            icon={RotateCcw}
            iconPosition="start"
            variant={tier === 'perfect' ? 'commit' : 'onScene'}
            disabled={busy}
            onPress={again}
          />
          {next ? (
            <Button
              label={`Siguiente desafío · ${next.name}`}
              variant="secondary"
              disabled={busy}
              onPress={goNext}
              fullWidth
            />
          ) : (
            <Button label="Volver a Quiz" variant="secondary" disabled={busy} onPress={close} fullWidth />
          )}
        </View>

        <Celebration
          key={badge?.id}
          visible={Boolean(badge)}
          icon={badgeIcon(badge?.icon)}
          eyebrow="Logro desbloqueado"
          value={badge?.title ?? ''}
          valueSize={38}
          subtitle={badge?.description}
          onClose={() => badge && setCelebrated(list => [...list, badge.id])}
        />

        <Sheet
          open={confirmLeave !== null}
          onClose={() => setConfirmLeave(null)}
          title="¿Salir sin guardar?"
          footer={
            <View style={styles.footer}>
              <Button
                label="Reintentar"
                variant="secondary"
                onPress={() => {
                  setConfirmLeave(null);
                  save();
                }}
                style={styles.footerCancel}
              />
              <Button
                label="Salir"
                onPress={() => {
                  const go = confirmLeave;
                  setConfirmLeave(null);
                  go?.();
                }}
                style={styles.footerExit}
              />
            </View>
          }
        >
          <TextV2 variant="body" tone="secondary">
            Tu ronda todavía no se ha guardado. Si sales ahora, se pierde y no suma puntos.
          </TextV2>
        </Sheet>
      </View>
    </SceneScope>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#141312' },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  top: { alignItems: 'center', gap: 14 },
  score: { fontSize: 60, lineHeight: 66, fontWeight: '600' },
  of: { fontWeight: '400' },
  copy: { alignItems: 'center', gap: 14 },
  head: { fontWeight: '700' },
  message: { maxWidth: 300 },
  trio: { flexDirection: 'row', gap: 14, alignSelf: 'stretch', maxWidth: 320, marginTop: 6 },
  rule: { width: 1, backgroundColor: 'rgba(255,255,255,.12)' },
  bottom: { paddingHorizontal: 20, gap: 8 },
  footer: { flexDirection: 'row', gap: 12 },
  footerCancel: { flex: 1 },
  footerExit: { flex: 2 },
});
