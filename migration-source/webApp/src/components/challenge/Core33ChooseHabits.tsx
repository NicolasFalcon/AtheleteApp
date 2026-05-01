import { useState } from 'react';
import { ArrowRight, ArrowLeft, Dumbbell, Heart, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface Core33HabitSelection {
  training: string;
  health: string;
  mind: string;
}

interface Core33ChooseHabitsProps {
  onNext: (habits: Core33HabitSelection) => void;
  onBack: () => void;
  initialHabits?: Core33HabitSelection;
}

const PILLARS = [
  {
    key: 'training' as const,
    label: 'Entrenamiento',
    icon: Dumbbell,
    presets: ['Entrenar 30 min', '10K pasos', 'Estirar 5 min'],
  },
  {
    key: 'health' as const,
    label: 'Salud',
    icon: Heart,
    presets: ['Beber 2L de agua', 'Sin bebidas azucaradas', 'Comer 1 ensalada'],
  },
  {
    key: 'mind' as const,
    label: 'Mentalidad',
    icon: Brain,
    presets: ['Leer 10 min', 'Escribir diario 5 min', 'Meditar 5 min'],
  },
];

export function Core33ChooseHabits({ onNext, onBack, initialHabits }: Core33ChooseHabitsProps) {
  const [selected, setSelected] = useState<Core33HabitSelection>(
    initialHabits || { training: '', health: '', mind: '' }
  );
  const [customInputs, setCustomInputs] = useState({ training: '', health: '', mind: '' });

  const handlePresetClick = (pillar: keyof Core33HabitSelection, preset: string) => {
    setSelected(prev => ({
      ...prev,
      [pillar]: prev[pillar] === preset ? '' : preset,
    }));
    setCustomInputs(prev => ({ ...prev, [pillar]: '' }));
  };

  const handleCustomChange = (pillar: keyof Core33HabitSelection, value: string) => {
    setCustomInputs(prev => ({ ...prev, [pillar]: value }));
    setSelected(prev => ({ ...prev, [pillar]: value }));
  };

  const getActiveHabit = (pillar: keyof Core33HabitSelection) => selected[pillar];
  const allSelected = selected.training && selected.health && selected.mind;

  return (
    <div className="flex h-full min-h-full flex-col pb-6">
      <div className="px-5 pt-4">
        <h1 className="text-xl font-bold text-foreground">Elige tus 3 hábitos</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Un hábito por pilar. Simples y realistas.
        </p>
      </div>

      <div className="mt-4 space-y-3 px-4 flex-1">
        {PILLARS.map((pillar) => {
          const activeHabit = getActiveHabit(pillar.key);
          const isPreset = pillar.presets.includes(activeHabit);
          const isCustom = activeHabit && !isPreset;

          return (
            <div key={pillar.key} className="card-elevated p-3.5">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary">
                  <pillar.icon className="h-3.5 w-3.5 text-foreground" />
                </div>
                <span className="font-semibold text-foreground text-sm">{pillar.label}</span>
                {activeHabit && (
                  <span className="ml-auto text-[10px] text-accent-green font-bold bg-accent-green/10 px-2 py-0.5 rounded-full">✓</span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {pillar.presets.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handlePresetClick(pillar.key, preset)}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-xs font-medium transition-all border active:scale-95',
                      activeHabit === preset
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-transparent text-muted-foreground border-border'
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <Input
                placeholder="Hábito personalizado…"
                value={isCustom ? activeHabit : customInputs[pillar.key]}
                onChange={(e) => handleCustomChange(pillar.key, e.target.value)}
                className="h-8 text-xs bg-secondary border-border/60 rounded-xl placeholder:text-muted-foreground/60"
              />
            </div>
          );
        })}
      </div>

      {(selected.training || selected.health || selected.mind) && (
        <div className="mx-4 mt-3 card-elevated p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
            Tu selección
          </p>
          <div className="space-y-1">
            {selected.training && (
              <p className="text-xs text-foreground">
                <span className="text-muted-foreground">Entrenamiento · </span>{selected.training}
              </p>
            )}
            {selected.health && (
              <p className="text-xs text-foreground">
                <span className="text-muted-foreground">Salud · </span>{selected.health}
              </p>
            )}
            {selected.mind && (
              <p className="text-xs text-foreground">
                <span className="text-muted-foreground">Mentalidad · </span>{selected.mind}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="px-5 mt-5 space-y-2">
        <Button
          onClick={() => onNext(selected)}
          disabled={!allSelected}
          size="lg"
          className="w-full rounded-full font-bold h-12 text-sm active:scale-[0.98] transition-transform"
        >
          Continuar
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <button
          onClick={onBack}
          className="w-full py-2 text-xs font-medium text-muted-foreground active:text-foreground transition-colors"
        >
          <ArrowLeft className="inline h-3.5 w-3.5 mr-1" />
          Volver
        </button>
      </div>
    </div>
  );
}
