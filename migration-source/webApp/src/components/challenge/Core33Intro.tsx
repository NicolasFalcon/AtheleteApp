import { ArrowRight, Dumbbell, CheckCircle2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Core33IntroProps {
  onNext: () => void;
}

export function Core33Intro({ onNext }: Core33IntroProps) {
  const steps = [
    {
      icon: Dumbbell,
      text: 'Elige 3 hábitos simples (entrenamiento, salud, mentalidad).',
    },
    {
      icon: CheckCircle2,
      text: 'Márcalos todos los días durante 33 días.',
    },
    {
      icon: TrendingUp,
      text: 'Sigue tu racha y tu progreso general.',
    },
  ];

  return (
    <div className="flex h-full min-h-full flex-col px-5 pb-6 pt-6">
      <span className="self-start inline-block rounded-full bg-foreground px-3.5 py-1 text-[11px] font-bold tracking-widest text-background uppercase">
        Core · 33
      </span>

      <h1 className="mt-5 text-2xl font-bold text-foreground leading-tight">
        3 hábitos. 33 días.<br />
        Disciplina real.
      </h1>

      <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">
        Construye disciplina un día a la vez con 3 hábitos simples en entrenamiento, salud y mentalidad.
      </p>

      <div className="mt-8">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-4">
          Cómo funciona
        </h3>
        <div className="space-y-3.5">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary">
                <step.icon className="h-4 w-4 text-foreground" />
              </div>
              <p className="text-foreground pt-1.5 text-sm leading-relaxed">
                {step.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1" />

      <Button onClick={onNext} size="lg" className="w-full rounded-full font-bold mt-6 h-12 text-sm active:scale-[0.98] transition-transform">
        Elegir mis hábitos
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
