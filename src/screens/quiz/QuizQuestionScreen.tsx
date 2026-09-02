import {useRef, useState} from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Alert, StyleSheet, Text, View} from 'react-native';
import {AppHeader, ScreenContainer} from '@app/components';
import {Button, Card, EmptyState, Loader} from '@app/components/ui';
import {HOME_ROUTES} from '@app/constants/routes';
import {QuizAnswerOption} from '@app/features/quiz/components/QuizAnswerOption';
import {QuizProgressHeader} from '@app/features/quiz/components/QuizProgressHeader';
import {
  randomizeQuizOptions,
  type AttemptQuizQuestion,
} from '@app/features/quiz/randomizeQuizOptions';
import {useQuizQuestions, useQuizSubmit} from '@app/hooks/useQuiz';
import {createQuizAttemptId} from '@app/services/supabase/quiz';
import {useAppTheme} from '@app/hooks/useAppTheme';
import type {HomeStackParamList} from '@app/types/navigation';
import type {QuizAttemptAnswer} from '@app/types/quiz';

type Props = NativeStackScreenProps<HomeStackParamList, 'QuizQuestion'>;
type AnswerState = 'unanswered' | 'correct' | 'incorrect';

export function QuizQuestionScreen({navigation, route}: Props) {
  const {theme} = useAppTheme();
  const questionsQuery = useQuizQuestions(route.params.categoryId);
  const submitMutation = useQuizSubmit();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>('unanswered');
  const attemptIdRef = useRef(createQuizAttemptId());
  const answersRef = useRef<QuizAttemptAnswer[]>([]);
  const submissionStartedRef = useRef(false);
  const attemptQuestionsRef = useRef<AttemptQuizQuestion[] | null>(null);
  const returnToCategories = () => {
    navigation.popTo(HOME_ROUTES.QuizLanding);
  };

  const styles = StyleSheet.create({
    content: {
      gap: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
    },
    questionCard: {
      gap: theme.spacing.md,
    },
    questionCounter: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    question: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.titleSm,
      fontWeight: theme.typography.weights.bold,
      lineHeight: 34,
    },
    answers: {
      gap: theme.spacing.sm,
    },
    explanationCard: {
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.surfaceMuted,
    },
    explanationLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      fontWeight: theme.typography.weights.semibold,
      textTransform: 'uppercase',
      letterSpacing: 0.7,
    },
    explanationText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      lineHeight: 21,
    },
  });

  if (questionsQuery.isLoading) {
    return (
      <ScreenContainer>
        <Loader label="Cargando preguntas..." />
      </ScreenContainer>
    );
  }

  if (!attemptQuestionsRef.current && questionsQuery.data) {
    attemptQuestionsRef.current = randomizeQuizOptions(questionsQuery.data);
  }

  const questions = attemptQuestionsRef.current || [];
  const currentQuestion = questions[currentIndex];

  if (!currentQuestion) {
    return (
      <ScreenContainer>
        <AppHeader
          showBackButton
          title={route.params.categoryName}
          onBack={returnToCategories}
        />
        <EmptyState
          title="No hay preguntas disponibles"
          description="Esta categoría todavía no tiene suficientes preguntas activas para completar el quiz."
          actionLabel="Volver a categorías"
          onAction={returnToCategories}
        />
      </ScreenContainer>
    );
  }

  const isLast = currentIndex === questions.length - 1;
  const progressPct =
    ((currentIndex + (answerState !== 'unanswered' ? 1 : 0)) / questions.length) *
    100;

  const handleConfirm = async () => {
    if (selectedAnswer === null) {
      return;
    }

    if (answerState === 'unanswered') {
      const correct = selectedAnswer === currentQuestion.correctAnswer;
      setAnswerState(correct ? 'correct' : 'incorrect');
      const answer: QuizAttemptAnswer = {
        questionId: currentQuestion.id,
        selectedAnswer:
          currentQuestion.originalOptionIndexes[selectedAnswer] ??
          selectedAnswer,
        isCorrect: correct,
        pointsEarned: correct ? currentQuestion.pointsReward : 0,
      };
      answersRef.current = [
        ...answersRef.current.filter(
          item => item.questionId !== currentQuestion.id,
        ),
        answer,
      ];

      return;
    }

    if (!isLast) {
      setCurrentIndex(value => value + 1);
      setSelectedAnswer(null);
      setAnswerState('unanswered');
      return;
    }

    if (submissionStartedRef.current) {
      return;
    }

    const finalAnswers = questions
      .map(question =>
        answersRef.current.find(answer => answer.questionId === question.id),
      )
      .filter((answer): answer is QuizAttemptAnswer => Boolean(answer));

    if (finalAnswers.length !== questions.length) {
      Alert.alert(
        'Falta una respuesta',
        `Se registraron ${finalAnswers.length} de ${questions.length} respuestas. Vuelve a la pregunta pendiente.`,
      );
      return;
    }

    const correctCount = finalAnswers.filter(answer => answer.isCorrect).length;
    const basePoints = finalAnswers.reduce(
      (total, answer) => total + answer.pointsEarned,
      0,
    );
    const isPerfect = correctCount === questions.length;
    const perfectBonus = isPerfect ? 25 : 0;
    const totalEarned = basePoints + perfectBonus;
    submissionStartedRef.current = true;

    try {
      const result = await submitMutation.mutateAsync({
        attemptId: attemptIdRef.current,
        categoryId: route.params.categoryId,
        correctCount,
        totalQuestions: questions.length,
        pointsEarned: totalEarned,
        answers: finalAnswers,
      });

      navigation.replace(HOME_ROUTES.QuizResult, {
        categoryId: route.params.categoryId,
        categoryName: route.params.categoryName,
        categoryIcon: route.params.categoryIcon,
        correctCount,
        totalQuestions: questions.length,
        pointsEarned: totalEarned,
        score: Math.round((correctCount / questions.length) * 100),
        isPerfect,
        unlockedBadges: result.unlockedBadges,
      });
    } catch (error) {
      submissionStartedRef.current = false;
      Alert.alert(
        'No pudimos guardar tu intento',
        error instanceof Error
          ? error.message
          : 'Supabase devolvió una respuesta inesperada. Inténtalo nuevamente.',
      );
    }
  };

  return (
    <ScreenContainer scrollable contentContainerStyle={styles.content}>
      <QuizProgressHeader
        title={route.params.categoryName}
        current={currentIndex + 1}
        total={questions.length}
        progressPct={progressPct}
        onBack={returnToCategories}
      />

      <Card style={styles.questionCard}>
        <Text style={styles.questionCounter}>
          Pregunta {currentIndex + 1} de {questions.length}
        </Text>
        <Text style={styles.question}>{currentQuestion.question}</Text>
      </Card>

      <View style={styles.answers}>
        {currentQuestion.options.map((option, index) => (
          <QuizAnswerOption
            key={`${currentQuestion.id}-${index}`}
            label={String.fromCharCode(65 + index)}
            text={option}
            selected={selectedAnswer === index}
            answered={answerState !== 'unanswered'}
            correct={index === currentQuestion.correctAnswer}
            incorrectSelected={
              selectedAnswer === index &&
              answerState === 'incorrect' &&
              index !== currentQuestion.correctAnswer
            }
            onPress={() => {
              if (answerState === 'unanswered') {
                setSelectedAnswer(index);
              }
            }}
          />
        ))}
      </View>

      {answerState !== 'unanswered' && currentQuestion.explanation ? (
        <Card style={styles.explanationCard}>
          <Text style={styles.explanationLabel}>Explicación</Text>
          <Text style={styles.explanationText}>
            {currentQuestion.explanation}
          </Text>
        </Card>
      ) : null}

      <Button
        label={
          answerState === 'unanswered'
            ? 'Confirmar respuesta'
            : isLast
              ? 'Ver resultados'
              : 'Siguiente pregunta'
        }
        onPress={handleConfirm}
        disabled={selectedAnswer === null || submitMutation.isPending}
        loading={submitMutation.isPending}
      />
    </ScreenContainer>
  );
}
