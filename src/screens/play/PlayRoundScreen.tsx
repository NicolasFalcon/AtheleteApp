import { useEffect, useReducer, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, Lock, X } from 'lucide-react-native';
import {
  AnswerTile,
  IconButton,
  PressableScale,
  SegmentMeter,
  StatusBarV2,
  TextV2,
  useToast,
  type AnswerTileState,
  type SegmentState,
} from '@app/components/v2';
import { APP_ROUTES } from '@app/constants/routes';
import {
  answerQuestion,
  answersPayload,
  correctCount,
  feedbackTitle,
  INITIAL_ROUND,
  isAnswered,
  lastAnswer,
  nextQuestion,
  roundPoints,
  streakGlow,
  timeOutQuestion,
  TIMED_OUT,
  unlockHint,
  type RoundState,
} from '@app/features/play/playModel';
import { useBackgroundLimit, useQuestionTimer } from '@app/features/play/useRoundClock';
import { usePlayHome } from '@app/features/play/usePlay';
import {
  FeedbackCard,
  FloatingPoints,
  QuestionClock,
  StreakChip,
} from '@app/features/play/v2/RoundParts';
import { routeTitleOf } from '@app/features/play/v2/playVisuals';
import { answerCue, playTickCue } from '@app/features/sound/soundModel';
import { playCue, playSound, useSoundPreload } from '@app/features/sound/soundService';
import { SceneScope } from '@app/providers/ThemeProvider';
import { deviceTimeZone, type PlayQuestion } from '@app/services/supabase/play';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'PlayRound'>;

const ROUND_SOUNDS = ['play-correct', 'play-combo', 'play-wrong', 'play-tick', 'play-timeup'] as const;

type RoundAction =
  | { type: 'answer'; question: PlayQuestion; choice: number; elapsedMs: number }
  | { type: 'timeout'; question: PlayQuestion }
  | { type: 'next' };

function roundReducer(state: RoundState, action: RoundAction): RoundState {
  switch (action.type) {
    case 'answer':
      return answerQuestion(state, action.question, action.choice, action.elapsedMs);
    case 'timeout':
      return timeOutQuestion(state, action.question);
    default:
      return nextQuestion(state);
  }
}

// Play · ronda (§28.6.1): the questions served by start_play_round, one at a
// time, answered with a single touch within 15 s. The feedback is local
// (correct_index, the streak chip and its multiplier); points, record and
// unlocks come later from the server. Closing abandons the round without a
// question or a call; more than 120 s in the background drops it. Without
// connection the round still finishes with the downloaded questions. A
// scene: dark in both modes.
export function PlayRoundScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { round } = route.params;
  const homeQuery = usePlayHome();
  const routeTitle = routeTitleOf(homeQuery.data)(round.route);
  const [state, dispatch] = useReducer(roundReducer, INITIAL_ROUND);
  const durationMs = Math.max(5, round.secondsPerQuestion) * 1000;

  const total = round.questions.length;
  const question = round.questions[state.index];
  const answered = isAnswered(state);
  const answer = answered ? lastAnswer(state) : null;
  const isLast = state.index === total - 1;

  useSoundPreload(ROUND_SOUNDS);

  // Sound (and haptic) once per answer: correct / combo by the streak, wrong,
  // or time up.
  const soundIndex = useRef(-1);
  useEffect(() => {
    if (!answered || soundIndex.current === state.index) {
      return;
    }
    soundIndex.current = state.index;
    if (state.selected === TIMED_OUT) {
      playSound('play-timeup');
    } else {
      playCue(answerCue(Boolean(answer?.correct), state.streak));
    }
  }, [answer?.correct, answered, state.index, state.selected, state.streak]);

  const clock = useQuestionTimer({
    questionKey: state.index,
    running: Boolean(question) && !answered,
    durationMs,
    onSecond: seconds => playCue(playTickCue(seconds)),
    onExpire: () => {
      if (question) {
        dispatch({ type: 'timeout', question });
      }
    },
  });

  // Closing = abandoning: nothing is saved and nothing is called.
  const leave = () => navigation.popTo(APP_ROUTES.PlayHome);

  useBackgroundLimit(() => {
    toast.show('La ronda se descartó por estar en segundo plano', { tone: 'error' });
    leave();
  });

  const finish = () => {
    navigation.replace(APP_ROUTES.PlayResult, {
      round: {
        roundId: round.roundId,
        route: round.route,
        level: round.level,
        levelName: round.levelName,
        isDailyChallenge: round.isDailyChallenge,
        dailyBonusAvailable: round.dailyBonusAvailable,
        bestScore: round.bestScore,
        hitsToUnlock: round.hitsToUnlock,
        secondsPerQuestion: round.secondsPerQuestion,
      },
      answers: answersPayload(round.questions, state.answers),
      // Device time when the round ended; the server validates it.
      finishedAt: new Date().toISOString(),
      tz: deviceTimeZone(),
      localScore: correctCount(state.answers),
      localBestStreak: state.bestStreak,
    });
  };

  const handleNext = () => (isLast ? finish() : dispatch({ type: 'next' }));

  const segments: SegmentState[] = round.questions.map((item, index) => {
    const given = state.answers.find(a => a.questionId === item.id);
    if (given) {
      return given.correct ? 'done' : 'missed';
    }
    return index === state.index ? 'current' : 'idle';
  });
  const hot = state.streak >= 3;
  const hint = unlockHint(round.hitsToUnlock, state.answers, total);

  const optionState = (index: number): AnswerTileState => {
    if (!answered || !question) {
      return 'idle';
    }
    if (index === question.correctIndex) {
      return 'correct';
    }
    return index === state.selected ? 'wrong' : 'dim';
  };

  return (
    <SceneScope>
      <View style={styles.screen}>
        <StatusBarV2 style="light" />
        <LinearGradient
          colors={[`rgba(255,91,31,${streakGlow(state.streak)})`, 'rgba(255,91,31,0)']}
          style={styles.glow}
          pointerEvents="none"
        />
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <IconButton icon={X} variant="glass" size={36} accessibilityLabel="Salir de la ronda" onPress={leave} />
          <SegmentMeter
            segments={segments}
            hot={hot}
            accessibilityLabel={`Pregunta ${state.index + 1} de ${total}`}
            style={styles.meter}
          />
          <StreakChip streak={state.streak} />
        </View>

        {question ? (
          <>
            <QuestionClock
              label={`Pregunta ${state.index + 1} de ${total}`}
              remainingMs={clock.remainingMs}
              durationMs={durationMs}
              answered={answered}
            />
            <ScrollView key={state.index} showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
              <View style={styles.meta}>
                <TextV2 variant="captionStrong" color="#FF5B1F" style={styles.eyebrow} numberOfLines={1}>
                  {`${routeTitle.toUpperCase()} · NIVEL ${round.level}`}
                </TextV2>
                <View style={styles.metaRight}>
                  {hint ? (
                    <View style={styles.hint}>
                      <Lock size={12} color="rgba(255,255,255,.55)" strokeWidth={2} />
                      <TextV2 variant="caption" color="#8C8A85">
                        {hint}
                      </TextV2>
                    </View>
                  ) : null}
                  <TextV2 variant="captionStrong" color="#FFFFFF">
                    {`${roundPoints(state.answers)} pts`}
                  </TextV2>
                </View>
              </View>
              <TextV2 variant="title26" color="#FFFFFF" style={styles.prompt} accessibilityRole="header">
                {question.prompt}
              </TextV2>
              <View style={styles.options}>
                {question.options.map((option, index) => (
                  <AnswerTile
                    key={`${question.id}-${index}`}
                    letter={String.fromCharCode(65 + index)}
                    text={option}
                    state={optionState(index)}
                    chosen={state.selected === index}
                    disabled={answered}
                    onPress={() =>
                      dispatch({ type: 'answer', question, choice: index, elapsedMs: clock.elapsedMs() })
                    }
                  />
                ))}
              </View>
              {answered && answer ? (
                <FeedbackCard
                  correct={answer.correct}
                  title={feedbackTitle(answer.correct, state.streak, state.index, answer.choice === null)}
                  points={answer.points}
                  multiplier={answer.multiplier}
                  correctMark={String.fromCharCode(65 + question.correctIndex)}
                  correctText={question.options[question.correctIndex]}
                  explanation={question.explanation}
                />
              ) : null}
            </ScrollView>

            {answered && answer?.correct ? (
              <FloatingPoints points={answer.points} trigger={state.answers.length} />
            ) : null}

            <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 16) + 14 }]}>
              {answered ? (
                <PressableScale accessibilityRole="button" onPress={handleNext} style={styles.next}>
                  <TextV2 variant="cta" color="#111111" style={styles.nextText}>
                    {isLast ? 'Ver resultado' : 'Siguiente pregunta'}
                  </TextV2>
                  <ArrowRight size={17} color="#111111" strokeWidth={2.4} />
                </PressableScale>
              ) : (
                <View style={styles.waiting}>
                  <TextV2 variant="meta" color="#8C8A85">
                    Toca una respuesta
                  </TextV2>
                </View>
              )}
            </View>
          </>
        ) : null}
      </View>
    </SceneScope>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#121110' },
  glow: { position: 'absolute', left: 0, right: 0, top: 0, height: 340 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  meter: { flex: 1, minWidth: 0 },
  body: { paddingHorizontal: 20, paddingTop: 26, paddingBottom: 18, gap: 12 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  eyebrow: { fontWeight: '700', letterSpacing: 0.96, flexShrink: 1 },
  metaRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  prompt: { fontWeight: '700', lineHeight: 32 },
  options: { gap: 10, marginTop: 12 },
  bottom: { paddingHorizontal: 20, paddingTop: 8 },
  next: {
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FF5B1F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    boxShadow: '0 12px 30px rgba(255,91,31,.3)',
  },
  nextText: { fontWeight: '700' },
  waiting: { height: 58, alignItems: 'center', justifyContent: 'center' },
});
