import { Brain, ChevronRight } from 'lucide-react';

interface QuizCardProps {
  onStartQuiz: () => void;
}

export function QuizCard({ onStartQuiz }: QuizCardProps) {
  return (
    <div className="mx-4">
      <button
        onClick={onStartQuiz}
        className="w-full rounded-2xl bg-card border border-border overflow-hidden active:scale-[0.98] transition-transform"
      >
        <div className="p-4 flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-secondary flex items-center justify-center shrink-0">
            <Brain className="h-5 w-5 text-foreground" />
          </div>
          <div className="text-left flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">Aprende y gana puntos</p>
              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-secondary text-muted-foreground">
                Nuevo
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pon a prueba tus conocimientos sobre entrenamiento, nutrición y fitness.
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
      </button>
    </div>
  );
}
