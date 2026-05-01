import { Sparkles, Dumbbell, UtensilsCrossed, Target, Zap, TrendingUp, Droplets } from 'lucide-react';
import { useEllieContext } from '@/hooks/useEllieContext';
import { generateSmartRecommendations, EllieSmartRecommendation } from '@/lib/ellieEngine';

const iconMap: Record<string, any> = {
  dumbbell: Dumbbell, utensils: UtensilsCrossed, target: Target,
  sparkles: Sparkles, zap: Zap, 'trending-up': TrendingUp, droplets: Droplets,
};

interface EllieSmartRowProps {
  onStartWorkout: () => void;
  onLogNutrition: () => void;
  onViewChallenge: () => void;
  onAskEllie: () => void;
  onLogHydration?: () => void;
}

export function EllieSmartRow({ onStartWorkout, onLogNutrition, onViewChallenge, onAskEllie, onLogHydration }: EllieSmartRowProps) {
  const { context } = useEllieContext();
  const recommendations = generateSmartRecommendations(context);

  if (recommendations.length === 0) return null;

  const handleAction = (rec: EllieSmartRecommendation) => {
    switch (rec.action) {
      case 'start_workout': onStartWorkout(); break;
      case 'log_nutrition': onLogNutrition(); break;
      case 'view_challenge': onViewChallenge(); break;
      case 'log_hydration': onLogHydration?.(); break;
      default: onAskEllie(); break;
    }
  };

  const topRecs = recommendations.slice(0, 3);

  return (
    <div className="px-4">
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles className="h-3.5 w-3.5 text-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">ELLIE recomienda</span>
      </div>
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
        {topRecs.map(rec => {
          const Icon = iconMap[rec.icon] || Sparkles;
          return (
            <button
              key={rec.id}
              onClick={() => handleAction(rec)}
              className="flex-shrink-0 w-[160px] card-elevated p-3 rounded-xl text-left hover:bg-secondary/50 transition-colors"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary mb-2">
                <Icon className="h-3.5 w-3.5 text-foreground" />
              </div>
              <p className="text-xs font-medium text-foreground leading-tight">{rec.title}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{rec.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}