import { Crown, ArrowRight, Dumbbell, Sparkles, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePremium } from '@/hooks/usePremium';

interface GoPremiumBannerProps {
  onUpgrade: () => void;
}

export function GoPremiumBanner({ onUpgrade }: GoPremiumBannerProps) {
  const { isPremium } = usePremium();

  if (isPremium) return null;

  return (
    <div className="px-4">
      <div className="card-elevated overflow-hidden relative">
        <div className="relative p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Crown className="h-4 w-4 text-foreground" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Premium
            </span>
          </div>

          <h3 className="text-base font-bold text-foreground tracking-tight">
            Desbloquea Athelete Premium
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
            Lleva tu entrenamiento al máximo nivel con funciones exclusivas.
          </p>

          <div className="mt-3 flex flex-col gap-1.5">
            {[
              { icon: Dumbbell, text: 'Rutinas premium de entrenamiento' },
              { icon: Sparkles, text: 'Análisis avanzados de ELLIE IA' },
              { icon: Target, text: 'Guía y análisis de progreso más profundos' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground">{text}</span>
              </div>
            ))}
          </div>

          <Button
            onClick={onUpgrade}
            className="mt-3 w-full rounded-full"
            size="sm"
          >
            Pasar a Premium
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}