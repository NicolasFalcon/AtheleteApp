import { ArrowLeft, ArrowRight, Calendar, Hash, Dumbbell, Heart, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Core33HabitSelection } from './Core33ChooseHabits';

interface Core33SummaryProps {
  habits: Core33HabitSelection;
  onConfirm: () => void;
  onBack: () => void;
}

const PILLAR_META = {
  training: { label: 'Entrenamiento', icon: Dumbbell },
  health: { label: 'Salud', icon: Heart },
  mind: { label: 'Mentalidad', icon: Brain },
} as const;

export function Core33Summary({ habits, onConfirm, onBack }: Core33SummaryProps) {
  const today = new Date();
  const formattedDate = today.toLocaleDateString('es-ES', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="flex h-full min-h-full flex-col px-5 pb-6 pt-5">
      <h1 className="text-xl font-bold text-foreground">Tu compromiso</h1>
      <p className="text-xs text-muted-foreground mt-1">Revisa tus hábitos antes de comenzar.</p>

      <div className="mt-5 space-y-2.5">
        {(Object.keys(PILLAR_META) as Array<keyof typeof PILLAR_META>).map((key) => {
          const meta = PILLAR_META[key];
          const Icon = meta.icon;
          return (
            <div key={key} className="card-elevated p-3.5 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {meta.label}
                </p>
                <p className="text-sm font-semibold text-foreground mt-0.5 truncate">
                  {habits[key]}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 card-elevated p-3.5">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Durante los próximos 33 días marcarás estos hábitos cada día. Si pierdes un día tu racha
          se reinicia, pero tu progreso se sigue registrando.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="card-elevated p-2.5 text-center">
          <Calendar className="mx-auto h-4 w-4 text-muted-foreground mb-1" />
          <p className="text-[10px] text-muted-foreground">Inicio</p>
          <p className="text-xs font-bold text-foreground mt-0.5">Hoy</p>
        </div>
        <div className="card-elevated p-2.5 text-center">
          <Hash className="mx-auto h-4 w-4 text-muted-foreground mb-1" />
          <p className="text-[10px] text-muted-foreground">Duración</p>
          <p className="text-xs font-bold text-foreground mt-0.5">33 días</p>
        </div>
        <div className="card-elevated p-2.5 text-center">
          <Dumbbell className="mx-auto h-4 w-4 text-muted-foreground mb-1" />
          <p className="text-[10px] text-muted-foreground">Hábitos</p>
          <p className="text-xs font-bold text-foreground mt-0.5">3</p>
        </div>
      </div>

      <p className="mt-3 text-center text-[11px] text-muted-foreground capitalize">
        {formattedDate}
      </p>

      <div className="flex-1" />

      <div className="mt-6 space-y-2">
        <Button onClick={onConfirm} size="lg" className="w-full rounded-full font-bold h-12 text-sm active:scale-[0.98] transition-transform">
          Comenzar reto
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
