import { ArrowRight, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePremium } from '@/hooks/usePremium';

interface CoachBannerProps {
  onNavigateToCoaches: () => void;
}

export function CoachBanner({ onNavigateToCoaches }: CoachBannerProps) {
  const { isPremium } = usePremium();

  return (
    <div className="px-4">
      <div className="card-elevated overflow-hidden">
        <div className="relative flex min-h-[120px]">
          <div className="flex-1 p-4 flex flex-col justify-center">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Entrenamiento personal
              </span>
              {!isPremium && (
                <span className="flex items-center gap-0.5 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                  <Crown className="h-2.5 w-2.5" />
                  Premium
                </span>
              )}
            </div>
            <h3 className="mt-1 text-base font-bold text-foreground">
              Encuentra tu coach
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
              Conecta con un entrenador para rutinas, nutrición y suplementos personalizados.
            </p>
            <Button 
              onClick={onNavigateToCoaches}
              variant="outline"
              className="mt-2.5 w-fit rounded-full"
              size="sm"
            >
              {isPremium ? 'Buscar coach' : 'Desbloquear coaches'}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
          
          <div className="relative w-28 flex-shrink-0">
            <img
              src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=300&h=400&fit=crop"
              alt="Entrenador personal"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-card to-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
}
