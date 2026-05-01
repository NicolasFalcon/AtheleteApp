import { ArrowRight, HeartPulse } from 'lucide-react';

interface SpecialistBannerProps {
  onNavigateToSpecialists: () => void;
}

export function SpecialistBanner({ onNavigateToSpecialists }: SpecialistBannerProps) {
  return (
    <div className="px-4">
      <button
        onClick={onNavigateToSpecialists}
        className="card-interactive w-full text-left overflow-hidden"
      >
        <div className="flex items-center gap-3 p-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary flex-shrink-0">
            <HeartPulse className="h-5 w-5 text-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-bold text-foreground">¿Dolor o molestia?</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
              Encuentra un especialista que guíe tu recuperación.
            </p>
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary flex-shrink-0">
            <ArrowRight className="h-3.5 w-3.5 text-foreground" />
          </div>
        </div>
      </button>
    </div>
  );
}