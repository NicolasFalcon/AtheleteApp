import { useState } from 'react';
import { ArrowLeft, Droplets, Pill, Sparkles } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { mockCoachPlan } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface NutritionPlanScreenProps {
  onBack: () => void;
}

const mockMealStructure = [
  { name: 'Desayuno', kcalRange: '400–500 kcal', guideline: 'Alto en proteína, carbos moderados' },
  { name: 'Almuerzo', kcalRange: '600–700 kcal', guideline: 'Proteína magra con verduras y granos integrales' },
  { name: 'Cena', kcalRange: '500–600 kcal', guideline: 'Ligera, rica en proteína y grasas saludables' },
  { name: 'Snacks', kcalRange: '200–400 kcal', guideline: 'Frutas, frutos secos o batido de proteína' },
];

const mockGuidelines = [
  'Prioriza alimentos integrales y proteína magra.',
  'Limita bebidas azucaradas y ultraprocesados.',
  'Bebe al menos 2L de agua al día.',
  'Incluye una fuente de proteína en cada comida.',
  'Añade verduras al almuerzo y la cena.',
  'Evita comer 2 horas antes de dormir.',
];

export function NutritionPlanScreen({ onBack }: NutritionPlanScreenProps) {
  const { nutritionPlan, user, deactivateNutritionPlan } = useApp();
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState('');

  if (!nutritionPlan) return null;

  const goalLabels: Record<string, string> = {
    lose_weight: 'Pérdida de grasa',
    gain_muscle: 'Ganancia muscular',
    maintain: 'Mantenimiento',
    improve_health: 'Mejorar salud',
  };

  const supplements = mockCoachPlan.supplements;

  const handleDeactivatePlan = async () => {
    setIsDeactivating(true);
    setDeactivateError('');
    try {
      await deactivateNutritionPlan();
      setShowDeactivateDialog(false);
      onBack();
    } catch (error) {
      console.error('Error deactivating nutrition plan:', error);
      setDeactivateError('No pudimos cancelar el plan ahora. Inténtalo de nuevo.');
    } finally {
      setIsDeactivating(false);
    }
  };

  return (
    <>
    <div className="app-screen bg-background page-safe-bottom">
      <div className="sticky top-0 z-10 flex items-center gap-3 bg-background/80 px-4 pb-3 pt-3 backdrop-blur-md safe-area-pt">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <div>
          <h1 className="font-bold text-foreground text-lg">Plan de nutrición</h1>
          <p className="text-xs text-muted-foreground">
            Objetivo: {goalLabels[user.goal] ?? user.goal}
          </p>
        </div>
      </div>

      <div className="px-4 mt-2">
        <p className="text-2xl font-bold text-foreground">
          {nutritionPlan.targetCalories.toLocaleString()}{' '}
          <span className="text-base font-medium text-muted-foreground">kcal / día</span>
        </p>
      </div>

      <div className="px-4 mt-6 space-y-5">
        <div className="card-elevated p-4 space-y-4">
          <h2 className="font-semibold text-foreground text-sm">Macronutrientes</h2>
          <div className="grid grid-cols-3 gap-3">
            <MacroTile label="Proteína" value={`${nutritionPlan.targetProtein}g`} />
            {nutritionPlan.targetCarbs != null && <MacroTile label="Carbos" value={`${nutritionPlan.targetCarbs}g`} />}
            {nutritionPlan.targetFats != null && <MacroTile label="Grasas" value={`${nutritionPlan.targetFats}g`} />}
          </div>
          {nutritionPlan.notes && (
            <p className="text-xs text-muted-foreground italic">"{nutritionPlan.notes}"</p>
          )}
        </div>

        <div className="card-elevated p-4 space-y-3">
          <h2 className="font-semibold text-foreground text-sm">Estructura diaria</h2>
          <div className="space-y-0 divide-y divide-border/40">
            {mockMealStructure.map((meal) => (
              <div key={meal.name} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{meal.name}</span>
                  <span className="text-xs text-muted-foreground">{meal.kcalRange}</span>
                </div>
                <p className="text-xs text-muted-foreground/70 mt-0.5">{meal.guideline}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card-elevated p-4 space-y-3">
          <h2 className="font-semibold text-foreground text-sm">Guías generales</h2>
          <ul className="space-y-2">
            {mockGuidelines.map((g, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <Droplets className="h-3.5 w-3.5 mt-0.5 text-primary flex-shrink-0" />
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </div>

        {supplements.length > 0 && (
          <div className="card-elevated p-4 space-y-3">
            <h2 className="font-semibold text-foreground text-sm">Suplementos</h2>
            <div className="space-y-0 divide-y divide-border/40">
              {supplements.map((s) => (
                <div key={s.id} className="py-3 first:pt-0 last:pb-0 flex items-start gap-2.5">
                  <Pill className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.dose} · {s.timing}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 px-1 pt-2 pb-4">
          <Sparkles className="h-3.5 w-3.5 text-muted-foreground/50" />
          <p className="text-[11px] text-muted-foreground/50">
            Tus objetivos de nutrición Athelete
          </p>
        </div>

        <div className="card-elevated p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-foreground text-sm">Estado del plan</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Si dejas de seguir este plan, volverás al estado sin plan nutricional activo. Tus registros diarios se mantendrán guardados.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDeactivateError('');
                setShowDeactivateDialog(true);
              }}
              className="rounded-full border-border/80 text-xs"
            >
              Cancelar plan
            </Button>
          </div>
        </div>
      </div>
    </div>

    <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
      <AlertDialogContent className="max-w-[340px] rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>¿Cancelar tu plan nutricional actual?</AlertDialogTitle>
          <AlertDialogDescription>
            Volverás al estado sin plan nutricional activo. Tus registros de comidas e historial nutricional seguirán guardados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {deactivateError && (
          <p className="text-sm text-destructive">{deactivateError}</p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeactivating}>Mantener plan</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeactivatePlan}
            disabled={isDeactivating}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeactivating ? 'Cancelando...' : 'Confirmar cancelación'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

function MacroTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-secondary rounded-xl px-3 py-3 text-center">
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
