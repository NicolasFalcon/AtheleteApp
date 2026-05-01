import { ArrowLeft, Brain, Dumbbell, Apple, Trophy } from 'lucide-react';
import { useQuizCategories, QuizCategory } from '@/hooks/useQuiz';
import { Skeleton } from '@/components/ui/skeleton';

interface QuizLandingScreenProps {
  onBack: () => void;
  onSelectCategory: (category: QuizCategory) => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  dumbbell: <Dumbbell className="h-6 w-6 text-foreground" />,
  apple: <Apple className="h-6 w-6 text-foreground" />,
  brain: <Brain className="h-6 w-6 text-foreground" />,
};

const CATEGORY_BG: Record<string, string> = {
  dumbbell: 'bg-secondary',
  apple: 'bg-secondary',
  brain: 'bg-secondary',
};

export function QuizLandingScreen({ onBack, onSelectCategory }: QuizLandingScreenProps) {
  const { categories, loading } = useQuizCategories();

  return (
    <div className="app-screen app-shell animate-fade-in bg-background flex flex-col page-safe-bottom">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 pb-3 safe-area-pt">
          <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary active:scale-95 transition-transform">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="page-title text-base">Aprende y gana</h1>
        </div>
      </div>

      {/* Intro */}
      <div className="px-4 pt-5 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <Brain className="h-5 w-5 text-foreground" />
          <p className="text-sm font-semibold text-foreground">Quiz de fitness</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Responde preguntas sobre entrenamiento, nutrición y ciencia del cuerpo. Gana puntos con cada quiz completado.
        </p>
      </div>

      {/* Categories */}
      <div className="px-4 pt-4 space-y-3">
        {loading ? (
          <>
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </>
        ) : (
          categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat)}
              className="w-full rounded-2xl bg-card border border-border p-4 text-left active:scale-[0.98] transition-transform"
            >
              <div className="flex items-start gap-3">
                <div className={`h-12 w-12 rounded-xl ${CATEGORY_BG[cat.icon] ?? 'bg-secondary'} flex items-center justify-center shrink-0`}>
                  {CATEGORY_ICONS[cat.icon] ?? <Brain className="h-6 w-6 text-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{cat.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{cat.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-muted-foreground">{cat.questionCount} preguntas</span>
                    {cat.bestScore !== undefined && (
                      <span className="text-[10px] text-foreground flex items-center gap-0.5 font-medium">
                        <Trophy className="h-3 w-3" /> Mejor: {cat.bestScore}%
                      </span>
                    )}
                    {cat.attemptsCount !== undefined && cat.attemptsCount > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        {cat.attemptsCount} {cat.attemptsCount === 1 ? 'intento' : 'intentos'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
