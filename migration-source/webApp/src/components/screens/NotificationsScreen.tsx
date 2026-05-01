import { ArrowLeft, Sparkles, Dumbbell, Target, Droplets, UtensilsCrossed, Trophy, Heart, X } from 'lucide-react';
import { useEllieContext } from '@/hooks/useEllieContext';
import { generateProactiveNudges, EllieNudge } from '@/lib/ellieEngine';
import { useState } from 'react';

const nudgeIconMap: Record<string, any> = {
  dumbbell: Dumbbell,
  target: Target,
  droplets: Droplets,
  utensils: UtensilsCrossed,
  sparkles: Sparkles,
  trophy: Trophy,
  heart: Heart,
};

interface NotificationsScreenProps {
  onBack: () => void;
  onStartWorkout: () => void;
  onLogNutrition: () => void;
  onViewChallenge: () => void;
  onLogHydration: () => void;
  onAskEllie: () => void;
}

export function NotificationsScreen({
  onBack,
  onStartWorkout,
  onLogNutrition,
  onViewChallenge,
  onLogHydration,
  onAskEllie,
}: NotificationsScreenProps) {
  const { context } = useEllieContext();
  const nudges = generateProactiveNudges(context);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const activeNudges = nudges.filter(n => !dismissed.includes(n.id));

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
    <div className="animate-fade-in page-safe-bottom">
      <header className="flex items-center gap-3 px-4 pb-3 pt-3 safe-area-pt">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-lg font-bold text-foreground tracking-tight">Notificaciones</h1>
      </header>

      <div className="px-4 mt-2">
        {activeNudges.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Todo al día</p>
            <p className="text-xs text-muted-foreground mt-1">No tienes notificaciones pendientes.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground mb-3">
              {activeNudges.length} {activeNudges.length === 1 ? 'recordatorio' : 'recordatorios'} de ELLIE
            </p>
            {activeNudges.map(nudge => {
              const Icon = nudgeIconMap[nudge.icon] || Sparkles;
              const hasAction = !!nudge.action && !!nudge.actionLabel;
              return (
                <div
                  key={nudge.id}
                  className="relative rounded-2xl bg-card border border-border overflow-hidden"
                >
                  <button
                    onClick={() => handleAction(nudge)}
                    disabled={!hasAction}
                    className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${
                      hasAction ? 'active:bg-secondary/50' : ''
                    }`}
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-secondary">
                      <Icon className="h-5 w-5 text-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-snug">{nudge.text}</p>
                      {hasAction && (
                        <span className="text-xs font-medium text-muted-foreground mt-1 inline-block">
                          {nudge.actionLabel} →
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDismissed(prev => [...prev, nudge.id]);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-secondary flex-shrink-0"
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
