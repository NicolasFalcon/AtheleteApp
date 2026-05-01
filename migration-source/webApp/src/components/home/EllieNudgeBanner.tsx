import { Sparkles, Dumbbell, Target, Droplets, UtensilsCrossed, Trophy, Heart, ChevronRight } from 'lucide-react';
import { useEllieContext } from '@/hooks/useEllieContext';
import { generateProactiveNudges, EllieNudge, EllieActionType } from '@/lib/ellieEngine';

const nudgeIconMap: Record<string, any> = {
  dumbbell: Dumbbell,
  target: Target,
  droplets: Droplets,
  utensils: UtensilsCrossed,
  sparkles: Sparkles,
  trophy: Trophy,
  heart: Heart,
};

const toneColors: Record<string, string> = {
  reminder: 'bg-secondary text-foreground',
  positive: 'bg-accent-green/10 text-accent-green',
  encouragement: 'bg-secondary text-foreground',
};

const toneIconColors: Record<string, string> = {
  reminder: 'text-foreground',
  positive: 'text-accent-green',
  encouragement: 'text-foreground',
};

interface EllieNudgeBannerProps {
  onStartWorkout: () => void;
  onLogNutrition: () => void;
  onViewChallenge: () => void;
  onLogHydration: () => void;
  onAskEllie: () => void;
}

export function EllieNudgeBanner({
  onStartWorkout, onLogNutrition, onViewChallenge, onLogHydration, onAskEllie,
}: EllieNudgeBannerProps) {
  const { context } = useEllieContext();
  const nudges = generateProactiveNudges(context);

  if (nudges.length === 0) return null;

  const handleAction = (nudge: EllieNudge) => {
    if (!nudge.action) return;
    switch (nudge.action) {
      case 'start_workout': onStartWorkout(); break;
      case 'log_nutrition': onLogNutrition(); break;
      case 'view_challenge': onViewChallenge(); break;
      case 'log_hydration': onLogHydration(); break;
      default: onAskEllie(); break;
    }
  };

  return (
    <div className="px-4">
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles className="h-3.5 w-3.5 text-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">ELLIE DICE</span>
      </div>
      <div className="space-y-2">
        {nudges.map(nudge => {
          const Icon = nudgeIconMap[nudge.icon] || Sparkles;
          const hasAction = !!nudge.action && !!nudge.actionLabel;
          return (
            <button
              key={nudge.id}
              onClick={() => handleAction(nudge)}
              disabled={!hasAction}
              className={`w-full flex items-center gap-3 rounded-xl p-3 text-left transition-colors ${
                hasAction ? 'card-elevated hover:bg-secondary/50 active:scale-[0.99]' : 'card-elevated'
              }`}
            >
              <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${toneColors[nudge.tone]}`}>
                <Icon className={`h-4 w-4 ${toneIconColors[nudge.tone]}`} />
              </div>
              <p className="flex-1 text-xs text-foreground leading-snug">{nudge.text}</p>
              {hasAction && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-[10px] font-medium text-foreground">{nudge.actionLabel}</span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}