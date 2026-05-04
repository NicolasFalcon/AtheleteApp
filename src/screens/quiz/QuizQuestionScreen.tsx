import {useState} from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Alert, StyleSheet, Text, View} from 'react-native';
import {AppHeader, ScreenContainer} from '@app/components';
import {Button, Card, EmptyState, Loader} from '@app/components/ui';
import {HOME_ROUTES} from '@app/constants/routes';
import {QuizAnswerOption} from '@app/features/quiz/components/QuizAnswerOption';
import {QuizProgressHeader} from '@app/features/quiz/components/QuizProgressHeader';
import {useQuizQuestions, useQuizSubmit} from '@app/hooks/useQuiz';
import {useAppTheme} from '@app/hooks/useAppTheme';
import type {HomeStackParamList} from '@app/types/navigation';

type Props = NativeStackScreenProps<HomeStackParamList, 'QuizQuestion'>;
type AnswerState = 'unanswered' | 'correct' | 'incorrect';

export function QuizQuestionScreen({navigation, route}: Props) {
  const {theme} = useAppTheme();
  const questionsQuery = useQuizQuestions(route.params.categoryId);
  const submitMutation = useQuizSubmit();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>('unanswered');
  const [correctCount, setCorrectCount] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);

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

  const questions = questionsQuery.data || [];
  const currentQuestion = questions[currentIndex];

  if (!currentQuestion) {
    return (
      <ScreenContainer>
        <AppHeader showBackButton title={route.params.categoryName} />
        <EmptyState
          title="No hay preguntas disponibles"
          description="Esta categoría todavía no tiene suficientes preguntas activas para completar el quiz."
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

      if (correct) {
        setCorrectCount(value => value + 1);
        setTotalPoints(value => value + currentQuestion.pointsReward);
      }

      return;
    }

    if (!isLast) {
      setCurrentIndex(value => value + 1);
      setSelectedAnswer(null);
      setAnswerState('unanswered');
      return;
    }

    const isPerfect = correctCount === questions.length;
    const perfectBonus = isPerfect ? 25 : 0;
    const totalEarned = totalPoints + perfectBonus;

    try {
      const result = await submitMutation.mutateAsync({
        categoryId: route.params.categoryId,
        correctCount,
        totalQuestions: questions.length,
        pointsEarned: totalEarned,
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
      Alert.alert(
        'No pudimos guardar tu intento',
        error instanceof Error ? error.message : 'Inténtalo nuevamente.',
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
        onBack={() => navigation.goBack()}
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
