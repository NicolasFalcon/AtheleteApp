import { useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useApp } from '@/contexts/AppContext';

interface LogNutritionSheetProps {
  onClose: () => void;
}

const quickCalButtons = [
  { label: '+200 snack', value: 200 },
  { label: '+400 comida', value: 400 },
  { label: '+600 plato fuerte', value: 600 },
];

export function LogNutritionSheet({ onClose }: LogNutritionSheetProps) {
  const { nutritionPlan, getTodayNutritionLog, upsertTodayNutritionLog } = useApp();
  const todayLog = getTodayNutritionLog();

  const [calories, setCalories] = useState(todayLog?.calories ?? 0);
  const [protein, setProtein] = useState(todayLog?.protein ?? 0);
  const [carbs, setCarbs] = useState(todayLog?.carbs ?? 0);
  const [fats, setFats] = useState(todayLog?.fats ?? 0);
  const [followedPlan, setFollowedPlan] = useState((todayLog?.adherence ?? 0) >= 80);

  const handleSave = () => {
    upsertTodayNutritionLog({
      calories,
      protein,
      carbs: nutritionPlan?.targetCarbs != null ? carbs : undefined,
      fats: nutritionPlan?.targetFats != null ? fats : undefined,
      adherence: followedPlan ? 100 : 0,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg rounded-t-3xl bg-card border-t border-border p-6 pb-10 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-foreground">Registrar nutrición de hoy</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-secondary">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {nutritionPlan && (
          <p className="text-xs text-muted-foreground mb-5">
            Meta: {nutritionPlan.targetCalories.toLocaleString()} kcal · {nutritionPlan.targetProtein}g proteínas
            {nutritionPlan.targetCarbs != null && ` · ${nutritionPlan.targetCarbs}g carbos`}
            {nutritionPlan.targetFats != null && ` · ${nutritionPlan.targetFats}g grasas`}
          </p>
        )}

        <div className="space-y-5">
          <div>
            <Label className="text-foreground text-sm">Calorías (kcal)</Label>
            <Input
              type="number"
              min={0}
              value={calories || ''}
              onChange={e => setCalories(Number(e.target.value))}
              className="mt-1.5 bg-secondary border-border"
              placeholder="0"
            />
            <div className="flex gap-2 mt-2">
              {quickCalButtons.map(btn => (
                <button
                  key={btn.label}
                  onClick={() => setCalories(prev => prev + btn.value)}
                  className="flex-1 rounded-full bg-secondary border border-border py-1.5 text-xs font-medium text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-foreground text-sm">Proteínas (g)</Label>
            <Input
              type="number"
              min={0}
              value={protein || ''}
              onChange={e => setProtein(Number(e.target.value))}
              className="mt-1.5 bg-secondary border-border"
              placeholder="0"
            />
          </div>

          {nutritionPlan?.targetCarbs != null && (
            <div>
              <Label className="text-foreground text-sm">Carbohidratos (g)</Label>
              <Input
                type="number"
                min={0}
                value={carbs || ''}
                onChange={e => setCarbs(Number(e.target.value))}
                className="mt-1.5 bg-secondary border-border"
                placeholder="0"
              />
            </div>
          )}

          {nutritionPlan?.targetFats != null && (
            <div>
              <Label className="text-foreground text-sm">Grasas (g)</Label>
              <Input
                type="number"
                min={0}
                value={fats || ''}
                onChange={e => setFats(Number(e.target.value))}
                className="mt-1.5 bg-secondary border-border"
                placeholder="0"
              />
            </div>
          )}

          <div className="flex items-center justify-between rounded-xl bg-secondary p-3">
            <span className="text-sm text-foreground">Seguí mi plan de comidas hoy</span>
            <Switch checked={followedPlan} onCheckedChange={setFollowedPlan} />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button variant="outline" className="flex-1 rounded-full" onClick={onClose}>
            Cancelar
          </Button>
          <Button className="flex-1 rounded-full font-bold" onClick={handleSave}>
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}
