import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WearBannerProps {
  onViewCollection: () => void;
}

export function WearBanner({ onViewCollection }: WearBannerProps) {
  return (
    <div className="relative mx-4 overflow-hidden rounded-2xl">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800&q=80')`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/35" />

      <div className="relative z-10 flex items-center justify-between p-4">
        <div>
          <span className="text-[10px] font-bold tracking-wider text-white uppercase">
            ATHELETE WEAR
          </span>
          <p className="mt-0.5 text-xs text-white/60">
            Diseñado para entrenar. Hecho para durar.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full text-xs border-white/25 text-white hover:bg-white/10"
          onClick={onViewCollection}
        >
          Ver colección
          <ArrowRight className="ml-1.5 h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
