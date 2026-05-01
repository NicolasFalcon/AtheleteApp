import { useState } from 'react';
import { ArrowLeft, Check, X } from 'lucide-react';
import { useQuizQuestions, useQuizSubmit, QuizCategory } from '@/hooks/useQuiz';
import { useGamification } from '@/contexts/GamificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { QuizResultScreen } from './QuizResultScreen';

interface QuizQuestionScreenProps {
  category: QuizCategory;
  onBack: () => void;
  onFinish: () => void;
}

type AnswerState = 'unanswered' | 'correct' | 'incorrect';

export function QuizQuestionScreen({ category, onBack, onFinish }: QuizQuestionScreenProps) {
  const { questions, loading } = useQuizQuestions(category.id);
  const { submitAttempt } = useQuizSubmit();
  const { awardPoints, unlockBadge } = useGamification();
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>('unanswered');
  const [correctCount, setCorrectCount] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const currentQuestion = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;

  const handleSelectAnswer = (idx: number) => {
    if (answerState !== 'unanswered') return;
    setSelectedAnswer(idx);
  };

  const handleConfirm = () => {
    if (selectedAnswer === null) return;
    if (answerState === 'unanswered') {
      const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
      setAnswerState(isCorrect ? 'correct' : 'incorrect');
      if (isCorrect) {
        setCorrectCount(c => c + 1);
        setTotalPoints(p => p + currentQuestion.pointsReward);
      }
    } else {
      if (isLast) {
        finishQuiz();
      } else {
        setCurrentIndex(i => i + 1);
        setSelectedAnswer(null);
        setAnswerState('unanswered');
      }
    }
  };

  const finishQuiz = async () => {
    const isPerfect = correctCount === questions.length;
    const bonus = isPerfect ? 25 : 0;
    const earned = totalPoints + bonus;

    await submitAttempt(category.id, correctCount, questions.length, earned);
    awardPoints('quiz_completed');
    unlockBadge('first_quiz');

    if (isPerfect && user) {
      try {
        const { data: attempts } = await supabase
          .from('quiz_attempts')
          .select('category_id, score')
          .eq('user_id', user.id);

        const { data: categories } = await supabase
          .from('quiz_categories')
          .select('id')
          .eq('is_active', true);

        if (attempts && categories) {
          const allCatIds = categories.map(c => c.id);
          const perfectCats = new Set(
            attempts.filter(a => a.score === 100).map(a => a.category_id)
          );
          perfectCats.add(category.id);
          const allPerfect = allCatIds.every(id => perfectCats.has(id));
          if (allPerfect) {
            unlockBadge('quiz_master');
          }
        }
      } catch {}
    }

    setShowResults(true);
  };

  if (loading) {
    return (
      <div className="app-screen app-shell animate-fade-in bg-background flex flex-col page-safe-bottom">
        <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border">
          <div className="flex items-center gap-3 px-4 pb-3 safe-area-pt">
            <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary active:scale-95 transition-transform">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="page-title text-base">{category.name}</h1>
          </div>
        </div>
        <div className="px-4 pt-6 space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="app-screen app-shell animate-fade-in bg-background px-4 page-safe-top page-safe-bottom text-center">
        <p className="text-muted-foreground text-sm">No hay preguntas disponibles.</p>
        <button onClick={onBack} className="mt-4 text-foreground text-sm font-medium underline underline-offset-2">Volver</button>
      </div>
    );
  }

  if (showResults) {
    return (
      <QuizResultScreen
        categoryName={category.name}
        correctCount={correctCount}
        totalQuestions={questions.length}
        pointsEarned={totalPoints + (correctCount === questions.length ? 25 : 0)}
        isPerfect={correctCount === questions.length}
        onGoHome={onFinish}
        onRetry={() => {
          setCurrentIndex(0);
          setSelectedAnswer(null);
          setAnswerState('unanswered');
          setCorrectCount(0);
          setTotalPoints(0);
          setShowResults(false);
        }}
      />
    );
  }

  return (
    <div className="app-screen app-shell animate-fade-in bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 pb-3 safe-area-pt">
          <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary active:scale-95 transition-transform">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="page-title text-base flex-1">{category.name}</h1>
          <span className="text-xs text-muted-foreground">
            {currentIndex + 1} de {questions.length}
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-foreground transition-all duration-300"
            style={{ width: `${((currentIndex + (answerState !== 'unanswered' ? 1 : 0)) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 px-4 pt-6">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
          Pregunta {currentIndex + 1} de {questions.length}
        </p>
        <p className="text-base font-semibold text-foreground leading-snug mb-6">
          {currentQuestion.question}
        </p>

        {/* Options */}
        <div className="space-y-3">
          {currentQuestion.options.map((option, idx) => {
            const isSelected = selectedAnswer === idx;
            const isCorrectOption = idx === currentQuestion.correctAnswer;
            const answered = answerState !== 'unanswered';

            let borderClass = 'border-border';
            let bgClass = 'bg-card';
            let iconEl: React.ReactNode = null;

            if (answered && isCorrectOption) {
              borderClass = 'border-accent-green';
              bgClass = 'bg-accent-green/5';
              iconEl = <Check className="h-4 w-4 text-accent-green shrink-0" />;
            } else if (answered && isSelected && !isCorrectOption) {
              borderClass = 'border-destructive';
              bgClass = 'bg-destructive/5';
              iconEl = <X className="h-4 w-4 text-destructive shrink-0" />;
            } else if (!answered && isSelected) {
              borderClass = 'border-foreground';
              bgClass = 'bg-secondary';
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelectAnswer(idx)}
                disabled={answered}
                className={`w-full rounded-xl border ${borderClass} ${bgClass} p-3.5 text-left flex items-center gap-3 transition-all ${
                  !answered ? 'active:scale-[0.98]' : ''
                }`}
              >
                <span className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0 ${
                  isSelected && !answered
                    ? 'bg-foreground text-background'
                    : answered && isCorrectOption
                    ? 'bg-accent-green text-accent-green-foreground'
                    : answered && isSelected
                    ? 'bg-destructive text-destructive-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="text-sm text-foreground flex-1">{option}</span>
                {iconEl}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {answerState !== 'unanswered' && currentQuestion.explanation && (
          <div className="mt-4 p-3 rounded-xl bg-secondary border border-border">
            <p className="text-xs text-muted-foreground leading-relaxed">
              💡 {currentQuestion.explanation}
            </p>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="mt-auto border-t border-border bg-background px-4 pt-4 safe-area-pb">
        <button
          onClick={handleConfirm}
          disabled={selectedAnswer === null}
          className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
            selectedAnswer === null
              ? 'bg-muted text-muted-foreground'
              : 'bg-foreground text-background active:scale-[0.98]'
          }`}
        >
          {answerState === 'unanswered'
            ? 'Confirmar respuesta'
            : isLast
            ? 'Ver resultados'
            : 'Siguiente pregunta'}
        </button>
      </div>
    </div>
  );
}
