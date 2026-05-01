import { Sparkles, ArrowRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEllieContext } from '@/hooks/useEllieContext';
import { generatePrimaryInsight, generateSmartRecommendations } from '@/lib/ellieEngine';

interface EllieCardProps {
  onAskEllie: () => void;
}

export function EllieCard({ onAskEllie }: EllieCardProps) {
  const { context } = useEllieContext();
  const insight = generatePrimaryInsight(context);
  const recommendations = generateSmartRecommendations(context);
  const topRec = recommendations[0];

  return (
    <div className="px-4">
      <div className="relative overflow-hidden rounded-2xl">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80&auto=format')`,
          }}
        />
        {/* Dark overlay for premium feel */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-black/75 to-black/60" />

        {/* Content */}
        <div className="relative z-10 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm border border-white/10">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="text-sm font-bold text-white tracking-tight">ELLIE</span>
              <span className="text-[11px] text-white/60 ml-1.5">Tu coach con IA</span>
            </div>
          </div>

          <p className="text-sm text-white/80 leading-relaxed mt-1">
            {insight}
          </p>

          <div className="flex gap-2 mt-4">
            <Button
              onClick={onAskEllie}
              size="sm"
              className="rounded-full bg-white text-black hover:bg-white/90 font-semibold"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Habla con ELLIE
            </Button>
            {topRec && (topRec.action === 'generate_workout' || topRec.action === 'generate_nutrition') && (
              <Button
                onClick={onAskEllie}
                size="sm"
                variant="outline"
                className="rounded-full border-white/25 text-white hover:bg-white/10"
              >
                <Zap className="mr-1.5 h-3.5 w-3.5" />
                {topRec.actionLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
