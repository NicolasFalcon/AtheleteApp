import { useState } from 'react';
import { Droplets, Plus } from 'lucide-react';
import { useHydration } from '@/hooks/useHydration';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface HydrationLogSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRESETS = [
  { label: '+1 vaso', ml: 250 },
  { label: '+500 ml', ml: 500 },
  { label: '+1 L', ml: 1000 },
];

export function HydrationLogSheet({ open, onOpenChange }: HydrationLogSheetProps) {
  const { todayGlasses, goalGlasses, todayMl, goalMl, addWater } = useHydration();
  const [customMl, setCustomMl] = useState('');

  const handlePreset = async (ml: number) => {
    await addWater(ml);
  };

  const handleCustom = async () => {
    const ml = parseInt(customMl, 10);
    if (!ml || ml <= 0) return;
    await addWater(ml);
    setCustomMl('');
  };

  const todayPercentage = goalMl > 0 ? Math.min(100, Math.round((todayMl / goalMl) * 100)) : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-info" />
            Registrar agua
          </SheetTitle>
          <SheetDescription>
            Hoy: {todayGlasses}/{goalGlasses} vasos ({todayPercentage}%)
          </SheetDescription>
        </SheetHeader>

        <div className="w-full h-2 rounded-full bg-secondary mb-5">
          <div
            className="h-full rounded-full bg-info transition-all"
            style={{ width: `${Math.min(100, todayPercentage)}%` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          {PRESETS.map(p => (
            <button
              key={p.ml}
              onClick={() => handlePreset(p.ml)}
              className="flex flex-col items-center gap-1 rounded-xl bg-secondary p-3 active:scale-95 transition-transform"
            >
              <Plus className="h-4 w-4 text-foreground" />
              <span className="text-xs font-medium text-foreground">{p.label}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            type="number"
            inputMode="numeric"
            placeholder="Cantidad en ml"
            value={customMl}
            onChange={e => setCustomMl(e.target.value)}
            className="flex-1"
          />
          <Button
            onClick={handleCustom}
            disabled={!customMl || parseInt(customMl) <= 0}
          >
            Añadir
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}