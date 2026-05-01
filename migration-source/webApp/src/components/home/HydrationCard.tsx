import { useState } from 'react';
import { Droplets, Plus, GlassWater } from 'lucide-react';
import { useHydration } from '@/hooks/useHydration';
import { HydrationLogSheet } from './HydrationLogSheet';

export function HydrationCard() {
  const { todayGlasses, goalGlasses, todayMl, goalMl, todayPercentage, addWater, loading } = useHydration();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (loading) return null;

  if (!goalGlasses || goalGlasses <= 0) {
    return (
      <div className="card-elevated mx-4 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Droplets className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold text-foreground text-sm">Hidratación</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Aún no has definido tu meta de hidratación.
        </p>
        <button
          onClick={() => setSheetOpen(true)}
          className="text-xs font-medium text-foreground underline-offset-2 hover:underline"
        >
          Definir objetivo →
        </button>
        <HydrationLogSheet open={sheetOpen} onOpenChange={setSheetOpen} />
      </div>
    );
  }

  const liters = (todayMl / 1000).toFixed(1);
  const goalLiters = (goalMl / 1000).toFixed(1);

  return (
    <div className="card-elevated mx-4 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Droplets className="h-5 w-5 text-info" />
          <h3 className="font-semibold text-foreground text-sm">Hidratación hoy</h3>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {liters} / {goalLiters} L
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 relative flex items-center justify-center h-16 w-16">
          <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--secondary))" strokeWidth="5" />
            <circle
              cx="32" cy="32" r="28" fill="none"
              stroke="hsl(var(--info))"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 28}`}
              strokeDashoffset={`${2 * Math.PI * 28 * (1 - Math.min(1, todayPercentage / 100))}`}
              className="transition-all duration-500"
            />
          </svg>
          <GlassWater className="absolute h-4 w-4 text-info" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-lg font-bold text-foreground">
            {todayGlasses} <span className="text-xs font-normal text-muted-foreground">/ {goalGlasses} vasos</span>
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {todayPercentage >= 100 ? '¡Meta alcanzada! 🎉' : `Faltan ${goalGlasses - todayGlasses} vasos`}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => addWater(250)}
            className="flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1.5 text-[11px] font-medium text-foreground active:scale-95 transition-transform"
          >
            <Plus className="h-3 w-3" />
            1 vaso
          </button>
          <button
            onClick={() => addWater(500)}
            className="flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1.5 text-[11px] font-medium text-foreground active:scale-95 transition-transform"
          >
            <Plus className="h-3 w-3" />
            500 ml
          </button>
        </div>
      </div>

      <button
        onClick={() => setSheetOpen(true)}
        className="w-full mt-3 text-[11px] text-muted-foreground text-center"
      >
        Registrar otra cantidad →
      </button>

      <HydrationLogSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}