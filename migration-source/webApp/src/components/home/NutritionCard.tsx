import { useState } from 'react';
import { Plus, UtensilsCrossed, Sparkles, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CircularProgress } from '@/components/ui/CircularProgress';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useApp } from '@/contexts/AppContext';
import { LogNutritionSheet } from '@/components/screens/LogNutritionSheet';
import { isDevRuntime } from '@/lib/runtimeEnv';

type DevNutritionState = 'real' | 'noPlan' | 'activePlan';

interface NutritionCardProps {
  onAskEllie: () => void;
  onViewPlan?: () => void;
}

export function NutritionCard({ onAskEllie, onViewPlan }: NutritionCardProps) {
  const { nutritionPlan, getTodayNutritionLog } = useApp();
  const todayLog = getTodayNutritionLog();
  const [showLogSheet, setShowLogSheet] = useState(false);
  const [devState, setDevState] = useState<DevNutritionState>('real');

  const effectiveState = getEffectiveState(devState, {
    hasPlan: nutritionPlan != null,
    hasLoggedToday: todayLog != null && (todayLog.calories > 0 || todayLog.protein > 0),
  });

  return (
    <>
      {effectiveState === 'noPlan' && (
        <StateNoPlan onAskEllie={onAskEllie} />
      )}
      {effectiveState === 'activePlanEmpty' && nutritionPlan && (
        <StateActivePlanEmpty
          plan={nutritionPlan}
          onAskEllie={onAskEllie}
          onLogMeal={() => setShowLogSheet(true)}
          onViewPlan={onViewPlan}
        />
      )}
      {effectiveState === 'activePlanLogged' && nutritionPlan && todayLog && (
        <StateActivePlanLogged
          plan={nutritionPlan}
          todayLog={todayLog}
          onAskEllie={onAskEllie}
          onLogMeal={() => setShowLogSheet(true)}
          onViewPlan={onViewPlan}
        />
      )}

      
      {showLogSheet && <LogNutritionSheet onClose={() => setShowLogSheet(false)} />}
    </>
  );
}

function getEffectiveState(
  devState: DevNutritionState,
  real: { hasPlan: boolean; hasLoggedToday: boolean },
): 'noPlan' | 'activePlanEmpty' | 'activePlanLogged' {
  if (devState !== 'real') {
    if (devState === 'noPlan') return 'noPlan';
    return real.hasLoggedToday ? 'activePlanLogged' : 'activePlanEmpty';
  }
  if (!real.hasPlan) return 'noPlan';
  if (!real.hasLoggedToday) return 'activePlanEmpty';
  return 'activePlanLogged';
}

/* State A: No nutrition setup */
function StateNoPlan({ onAskEllie }: { onAskEllie: () => void }) {
  return (
    <div className="card-elevated mx-4 p-4">
      <h3 className="font-semibold text-foreground">Nutrición de hoy</h3>
      <div className="flex flex-col items-center py-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary mb-3">
          <UtensilsCrossed className="h-7 w-7 text-muted-foreground/40" />
        </div>
        <p className="text-sm text-muted-foreground text-center">
          Aún no tienes un plan de nutrición
        </p>
        <p className="text-xs text-muted-foreground/60 text-center mt-1">
          ELLIE puede ayudarte a mantenerte constante con un registro y guía sencillos.
        </p>
        <Button onClick={onAskEllie} className="mt-4 rounded-full font-bold">
          <Sparkles className="mr-2 h-4 w-4" />
          Pregúntale a ELLIE
        </Button>
      </div>
    </div>
  );
}

/* State B: Active plan, no log today */
function StateActivePlanEmpty({
  plan,
  onAskEllie,
  onLogMeal,
  onViewPlan,
}: {
  plan: { targetCalories: number; targetProtein: number; targetCarbs?: number; targetFats?: number };
  onAskEllie: () => void;
  onLogMeal: () => void;
  onViewPlan?: () => void;
}) {
  const macros = buildMacros(plan, null);

  return (
    <div
      className="card-elevated mx-4 p-4 cursor-pointer"
      onClick={() => onViewPlan?.()}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Nutrición de hoy</h3>
        {onViewPlan && <ChevronRight className="h-4 w-4 text-muted-foreground/40" />}
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Objetivo: {plan.targetCalories.toLocaleString()} kcal · {plan.targetProtein}g proteína
      </p>

      <div className="mt-4 space-y-3">
        {macros.map(macro => (
          <div key={macro.name}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground font-medium">{macro.name}</span>
              <span className="text-muted-foreground">0 / {macro.goal} {macro.unit}</span>
            </div>
            <ProgressBar value={0} max={macro.goal} size="sm" className="mt-1" barClassName={macro.color} />
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2 justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onAskEllie(); }}
          className="rounded-full text-xs"
        >
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          Pregúntale a ELLIE
        </Button>
        <Button
          onClick={(e) => { e.stopPropagation(); onLogMeal(); }}
          className="rounded-full font-bold"
          size="sm"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Registrar comida
        </Button>
      </div>
    </div>
  );
}

/* State C: Active plan + logged */
function StateActivePlanLogged({
  plan,
  todayLog,
  onAskEllie,
  onLogMeal,
  onViewPlan,
}: {
  plan: { targetCalories: number; targetProtein: number; targetCarbs?: number; targetFats?: number };
  todayLog: { calories: number; protein: number; carbs?: number; fats?: number };
  onAskEllie: () => void;
  onLogMeal: () => void;
  onViewPlan?: () => void;
}) {
  const macros = buildMacros(plan, todayLog);

  return (
    <div
      className="card-elevated mx-4 p-4 cursor-pointer"
      onClick={() => onViewPlan?.()}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Nutrición de hoy</h3>
        {onViewPlan && <ChevronRight className="h-4 w-4 text-muted-foreground/40" />}
      </div>

      <div className="mt-4 flex items-center gap-6">
        <div className="flex-1 space-y-3">
          {macros.map(macro => (
            <div key={macro.name}>
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground font-medium">{macro.name}</span>
                <span className="text-muted-foreground">{macro.current} / {macro.goal} {macro.unit}</span>
              </div>
              <ProgressBar value={macro.current} max={macro.goal} size="sm" className="mt-1" barClassName={macro.color} />
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center">
          <CircularProgress
            value={todayLog.calories}
            max={plan.targetCalories}
            size="xl"
            valueLabel={todayLog.calories.toString()}
            subLabel={`/ ${plan.targetCalories}`}
          />
          <span className="mt-1 text-xs text-muted-foreground">kcal</span>
        </div>
      </div>

      <div className="mt-4 flex gap-2 justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onAskEllie(); }}
          className="rounded-full text-xs"
        >
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          Pregúntale a ELLIE
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onLogMeal(); }}
          className="rounded-full"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Añadir comida
        </Button>
      </div>
    </div>
  );
}

function buildMacros(
  plan: { targetProtein: number; targetCarbs?: number; targetFats?: number },
  log: { protein: number; carbs?: number; fats?: number } | null,
) {
  return [
    { name: 'Proteína', current: log?.protein ?? 0, goal: plan.targetProtein, unit: 'g', color: 'bg-foreground/80' },
    ...(plan.targetCarbs != null
      ? [{ name: 'Carbos', current: log?.carbs ?? 0, goal: plan.targetCarbs, unit: 'g', color: 'bg-foreground/70' }]
      : []),
    ...(plan.targetFats != null
      ? [{ name: 'Grasas', current: log?.fats ?? 0, goal: plan.targetFats, unit: 'g', color: 'bg-foreground/60' }]
      : []),
  ];
}

function DevStateSelector({ value, onChange }: { value: DevNutritionState; onChange: (v: DevNutritionState) => void }) {
  const [open, setOpen] = useState(false);
  if (!isDevRuntime()) return null;

  const options: { value: DevNutritionState; label: string }[] = [
    { value: 'real', label: 'Real' },
    { value: 'noPlan', label: 'noPlan' },
    { value: 'activePlan', label: 'activePlan' },
  ];

  return (
    <div className="mx-4 mt-1">
      <button onClick={() => setOpen(!open)} className="text-[10px] text-muted-foreground/30 hover:text-muted-foreground/50 transition-colors">
        Dev: Nutrition card state ({value})
      </button>
      {open && (
        <div className="flex flex-wrap gap-1 mt-1">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                value === opt.value
                  ? 'border-primary/50 text-primary bg-primary/10'
                  : 'border-border/40 text-muted-foreground/40 hover:text-muted-foreground/60'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
