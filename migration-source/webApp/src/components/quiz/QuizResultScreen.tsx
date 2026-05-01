import { Trophy, Star, ArrowRight, Home } from 'lucide-react';

interface QuizResultScreenProps {
  categoryName: string;
  correctCount: number;
  totalQuestions: number;
  pointsEarned: number;
  isPerfect: boolean;
  onGoHome: () => void;
  onRetry: () => void;
}

export function QuizResultScreen({
  categoryName,
  correctCount,
  totalQuestions,
  pointsEarned,
  isPerfect,
  onGoHome,
  onRetry,
}: QuizResultScreenProps) {
  const score = Math.round((correctCount / totalQuestions) * 100);

  const getMessage = () => {
    if (isPerfect) return '¡Puntuación perfecta! 🎉';
    if (score >= 80) return '¡Excelente resultado! 💪';
    if (score >= 60) return '¡Buen trabajo! 👍';
    if (score >= 40) return 'Sigue aprendiendo 📚';
    return 'No te rindas, inténtalo de nuevo 💡';
  };

  return (
    <div className="animate-fade-in min-h-screen flex flex-col items-center justify-center px-6 text-center">
      {/* Score circle */}
      <div className={`h-28 w-28 rounded-full flex items-center justify-center mb-4 ${
        isPerfect ? 'bg-foreground' : score >= 60 ? 'bg-accent-green/10' : 'bg-muted'
      }`}>
        <div className="text-center">
          <p className={`text-3xl font-bold ${
            isPerfect ? 'text-background' : score >= 60 ? 'text-accent-green' : 'text-foreground'
          }`}>
            {score}%
          </p>
        </div>
      </div>

      <h2 className="text-lg font-bold text-foreground mb-1">{getMessage()}</h2>
      <p className="text-sm text-muted-foreground mb-6">{categoryName}</p>

      {/* Stats */}
      <div className="flex items-center gap-6 mb-8">
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">{correctCount}/{totalQuestions}</p>
          <p className="text-[10px] text-muted-foreground">Correctas</p>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Star className="h-4 w-4 text-foreground" />
            <p className="text-lg font-bold text-foreground">+{pointsEarned}</p>
          </div>
          <p className="text-[10px] text-muted-foreground">Puntos ganados</p>
        </div>
      </div>

      {isPerfect && (
        <div className="mb-6 p-3 rounded-xl bg-secondary border border-border">
          <div className="flex items-center gap-2 justify-center">
            <Trophy className="h-4 w-4 text-foreground" />
            <p className="text-xs font-medium text-foreground">¡Bonus de puntuación perfecta! +25 pts</p>
          </div>
        </div>
      )}

      {/* Ellie note */}
      <p className="text-[11px] text-muted-foreground mb-8 italic">
        ELLIE sugiere seguir aprendiendo con más quizzes.
      </p>

      {/* CTAs */}
      <div className="w-full space-y-3">
        <button
          onClick={onRetry}
          className="w-full py-3 rounded-xl bg-foreground text-background text-sm font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          <ArrowRight className="h-4 w-4" />
          Intentar otro quiz
        </button>
        <button
          onClick={onGoHome}
          className="w-full py-3 rounded-xl bg-card border border-border text-foreground text-sm font-semibold active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          <Home className="h-4 w-4" />
          Volver al inicio
        </button>
      </div>
    </div>
  );
}