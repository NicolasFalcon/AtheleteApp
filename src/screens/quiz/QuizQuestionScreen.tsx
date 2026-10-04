import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import {
  AnswerTile,
  Button,
  haptics,
  IconButton,
  SegmentMeter,
  Sheet,
  StatusBarV2,
  TextV2,
  type AnswerTileState,
  type SegmentState,
} from '@app/components/v2';
import { APP_ROUTES } from '@app/constants/routes';
import {
  answerQuestion,
  feedbackTitle,
  INITIAL_ROUND,
  isAnswered,
  lastAnswer,
  nextQuestion,
  roundPoints,
  streakGlow,
  summarizeRound,
  type RoundState,
} from '@app/features/quiz/quizModel';
import { randomizeQuizOptions } from '@app/features/quiz/randomizeQuizOptions';
import {
  FeedbackPanel,
  FloatingPoints,
  RoundMessage,
  StreakChip,
} from '@app/features/quiz/v2/RoundParts';
import { useQuizQuestions } from '@app/hooks/useQuiz';
import { SceneScope } from '@app/providers/ThemeProvider';
import { createQuizAttemptId } from '@app/services/supabase/quiz';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'QuizQuestion'>;

type RoundAction = { type: 'answer'; question: Parameters<typeof answerQuestion>[1]; option: number } | { type: 'next' };

function roundReducer(state: RoundState, action: RoundAction): RoundState {
  return action.type === 'answer'
    ? answerQuestion(state, action.question, action.option)
    : nextQuestion(state);
}

// Quiz · ronda (QUIZ_03 … QUIZ_06): one question at a time, answered with a
// single touch. Right = Ember, "+N" rises and the streak lights the bar and
// the glow; wrong = shake and the right answer is revealed. The last
// "Ver resultado" hands the round to the result screen, which saves it. The
// round lives in one reducer and the questions never refetch, so going to
// the background changes nothing. A scene: dark in both modes.
export function QuizQuestionScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { categoryId, categoryName, categoryIcon } = route.params;
  const dev = __DEV__ ? route.params.devState : undefined;
  const attemptIdRef = useRef(createQuizAttemptId());
  const questionsQuery = useQuizQuestions(categoryId, attemptIdRef.current);
  const [confirmExit, setConfirmExit] = useState(false);
  const leavingRef = useRef(false);

  // Development: a round frozen at a sample moment (nothing is read).
  const fixtures = useMemo(() => {
    if (!__DEV__ || !dev || dev === 'loading' || dev === 'error' || dev === 'empty') {
      return null;
    }
    return require('@app/dev/quizFixtures') as typeof import('@app/dev/quizFixtures');
  }, [dev]);

  const questions = useMemo(
    () =>
      fixtures
        ? fixtures.QUIZ_FIXTURE_QUESTIONS
        : questionsQuery.data
        ? randomizeQuizOptions(questionsQuery.data)
        : null,
    [fixtures, questionsQuery.data],
  );

  const [round, dispatch] = useReducer(
    roundReducer,
    undefined,
    () =>
      fixtures && dev && dev !== 'loading' && dev !== 'error' && dev !== 'empty'
        ? fixtures.quizRoundFixture(dev)
        : INITIAL_ROUND,
  );

  const total = questions?.length ?? 0;
  const question = questions?.[round.index];
  const answered = isAnswered(round);
  const answer = answered ? lastAnswer(round) : null;
  const isLast = round.index === total - 1;

  // Haptics once per answer.
  const hapticIndex = useRef(-1);
  useEffect(() => {
    if (!answered || hapticIndex.current === round.index || dev) {
      return;
    }
    hapticIndex.current = round.index;
    if (answer?.isCorrect) {
      haptics.light();
    } else {
      haptics.error();
    }
  }, [answer?.isCorrect, answered, dev, round.index]);

  const exit = () => {
    leavingRef.current = true;
    navigation.popTo(APP_ROUTES.QuizLanding);
  };

  // Back gesture, hardware back and the X ask before leaving mid-round.
  useEffect(
    () =>
      navigation.addListener('beforeRemove', event => {
        if (leavingRef.current || round.answers.length === 0) {
          return;
        }
        event.preventDefault();
        setConfirmExit(true);
      }),
    [navigation, round.answers.length],
  );

  const forcedState = dev === 'loading' || dev === 'error' || dev === 'empty' ? dev : null;
  const loading = forcedState === 'loading' || (!dev && questionsQuery.isLoading);
  const failed = forcedState === 'error' || (!dev && questionsQuery.isError);
  const empty = forcedState === 'empty' || (!dev && !loading && !failed && total === 0);

  const handleNext = () => {
    if (!questions) {
      return;
    }
    if (!isLast) {
      dispatch({ type: 'next' });
      return;
    }
    const summary = summarizeRound(round.answers, total, round.bestStreak);
    leavingRef.current = true;
    navigation.replace(APP_ROUTES.QuizResult, {
      categoryId,
      categoryName,
      categoryIcon,
      attemptId: attemptIdRef.current,
      answers: round.answers.map(item => ({
        questionId: item.questionId,
        selectedAnswer: item.selectedAnswer,
        isCorrect: item.isCorrect,
        pointsEarned: item.pointsEarned,
      })),
      correctCount: summary.correctCount,
      totalQuestions: summary.totalQuestions,
      pointsEarned: summary.pointsEarned,
      score: summary.score,
      isPerfect: summary.isPerfect,
      bestStreak: summary.bestStreak,
      missed: summary.missed,
    });
  };

  const segments: SegmentState[] = Array.from({ length: total }, (_, index) => {
    const given = round.answers[index];
    if (given && (index < round.index || answered)) {
      return given.isCorrect ? 'done' : 'missed';
    }
    return index === round.index ? 'current' : 'idle';
  });
  const hot = round.streak >= 3;

  const optionState = (index: number): AnswerTileState => {
    if (!answered || !question) {
      return 'idle';
    }
    if (index === question.correctAnswer) {
      return 'correct';
    }
    return index === round.selected ? 'wrong' : 'dim';
  };

  return (
    <SceneScope>
      <View style={styles.screen}>
        <StatusBarV2 style="light" />
        <LinearGradient
          colors={[`rgba(255,91,31,${streakGlow(round.streak)})`, 'rgba(255,91,31,0)']}
          style={styles.glow}
          pointerEvents="none"
        />
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <IconButton
            icon={X}
            variant="glass"
            size={36}
            accessibilityLabel="Salir de la ronda"
            onPress={() => (round.answers.length === 0 ? exit() : setConfirmExit(true))}
          />
          {total > 0 ? (
            <SegmentMeter
              segments={segments}
              hot={hot}
              accessibilityLabel={`Pregunta ${round.index + 1} de ${total}`}
              style={styles.meter}
            />
          ) : (
            <View style={styles.meter} />
          )}
          {total > 0 ? <StreakChip streak={round.streak} /> : null}
        </View>

        {loading ? (
          <RoundMessage title="Cargando preguntas…" />
        ) : failed ? (
          <RoundMessage
            title="No pudimos cargar las preguntas"
            message="Revisa tu conexión e inténtalo de nuevo."
            actionLabel="Reintentar"
            onAction={() => questionsQuery.refetch().catch(() => {})}
            secondaryLabel="Volver"
            onSecondary={exit}
          />
        ) : empty || !question ? (
          <RoundMessage
            title="No hay preguntas disponibles"
            message="Esta categoría todavía no tiene preguntas activas para jugar."
            actionLabel="Volver a Quiz"
            onAction={exit}
          />
        ) : (
          <>
            <View style={styles.counter}>
              <TextV2 variant="caption" color="#8C8A85">
                {`Pregunta ${round.index + 1} de ${total}`}
              </TextV2>
              <TextV2 variant="captionStrong" color="#FFFFFF">
                {`${roundPoints(round.answers)} pts`}
              </TextV2>
            </View>

            <ScrollView
              key={round.index}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.body}
            >
              <TextV2 variant="eyebrow" color="#A8A6A1">
                {categoryName}
              </TextV2>
              <TextV2 variant="title24" color="#FFFFFF" style={styles.question} accessibilityRole="header">
                {question.question}
              </TextV2>
              <View style={styles.options}>
                {question.options.map((option, index) => (
                  <AnswerTile
                    key={`${question.id}-${index}`}
                    letter={String.fromCharCode(65 + index)}
                    text={option}
                    state={optionState(index)}
                    chosen={round.selected === index}
                    disabled={answered}
                    onPress={() => dispatch({ type: 'answer', question, option: index })}
                  />
                ))}
              </View>
            </ScrollView>

            {answered && answer?.isCorrect ? (
              <FloatingPoints points={answer.pointsEarned} trigger={round.answers.length} />
            ) : null}

            {answered && answer ? (
              <FeedbackPanel
                isCorrect={answer.isCorrect}
                title={feedbackTitle(answer.isCorrect, round.streak, round.index)}
                points={answer.pointsEarned}
                multiplier={answer.multiplier}
                correctText={question.options[question.correctAnswer]}
                explanation={question.explanation}
                buttonLabel={isLast ? 'Ver resultado' : answer.isCorrect ? 'Continuar' : 'Entendido'}
                onNext={handleNext}
              />
            ) : (
              <View style={[styles.hint, { paddingBottom: Math.max(insets.bottom, 16) + 18 }]}>
                <TextV2 variant="meta" color="#8C8A85">
                  Toca una respuesta
                </TextV2>
              </View>
            )}
          </>
        )}

        <Sheet
          open={confirmExit}
          onClose={() => setConfirmExit(false)}
          title="¿Salir de la ronda?"
          footer={
            <View style={styles.footer}>
              <Button
                label="Seguir jugando"
                variant="secondary"
                onPress={() => setConfirmExit(false)}
                style={styles.footerCancel}
              />
              <Button label="Salir" onPress={exit} style={styles.footerExit} />
            </View>
          }
        >
          <TextV2 variant="body" tone="secondary">
            Si sales ahora, esta ronda no se guarda y perderás lo que llevas.
          </TextV2>
        </Sheet>
      </View>
    </SceneScope>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#141312' },
  glow: { position: 'absolute', left: 0, right: 0, top: 0, height: 360 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 6 },
  meter: { flex: 1 },
  counter: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 6 },
  body: { paddingHorizontal: 20, paddingTop: 26, paddingBottom: 20, gap: 12 },
  question: { lineHeight: 31 },
  options: { gap: 10, marginTop: 14 },
  hint: { paddingTop: 12, alignItems: 'center' },
  footer: { flexDirection: 'row', gap: 12 },
  footerCancel: { flex: 1 },
  footerExit: { flex: 2 },
});
