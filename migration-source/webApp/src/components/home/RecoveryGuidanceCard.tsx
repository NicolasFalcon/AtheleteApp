import { ArrowRight, Heart, Sparkles } from 'lucide-react';

interface RecoveryGuidanceCardProps {
  onAskEllie: () => void;
}

export function RecoveryGuidanceCard({ onAskEllie }: RecoveryGuidanceCardProps) {
  return (
    <div className="px-4">
      <button
        onClick={onAskEllie}
        className="card-interactive w-full text-left overflow-hidden"
      >
        <div className="flex items-center gap-3 p-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary flex-shrink-0">
            <Heart className="h-5 w-5 text-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-bold text-foreground">Guía de recuperación</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
              ELLIE puede guiarte con recomendaciones orientadas a la recuperación.
            </p>
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary flex-shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-foreground" />
          </div>
        </div>
      </button>
    </div>
  );
}