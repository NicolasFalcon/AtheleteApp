import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useApp } from '@/contexts/AppContext';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Utensils } from 'lucide-react';

interface DayData {
  label: string;
  calories: number;
  protein: number;
  date: string;
}

export function NutritionHistoryChart() {
  const { dailyNutritionLogs, nutritionPlan } = useApp();

  const chartData = useMemo<DayData[]>(() => {
    const today = new Date();
    const days: DayData[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = date.toISOString().split('T')[0];
      const log = dailyNutritionLogs.find(l => l.date === dateStr);

      days.push({
        label: format(date, 'EEE', { locale: es }).slice(0, 3),
        calories: log?.calories ?? 0,
        protein: log?.protein ?? 0,
        date: dateStr,
      });
    }

    return days;
  }, [dailyNutritionLogs]);

  const targetCalories = nutritionPlan?.targetCalories ?? 2300;
  const maxCalories = Math.max(...chartData.map(d => d.calories), targetCalories);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload as DayData;
    return (
      <div className="rounded-xl bg-popover border border-border px-3 py-2 text-xs shadow-lg">
        <p className="font-medium text-foreground">{data.calories} kcal</p>
        <p className="text-muted-foreground">{data.protein}g proteína</p>
      </div>
    );
  };

  return (
    <div className="card-elevated p-4">
      <div className="flex items-center gap-2 mb-1">
        <Utensils className="h-4 w-4 text-foreground" />
        <h3 className="font-semibold text-foreground text-sm">Nutrición — 7 días</h3>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-sm bg-foreground" />
          <span className="text-[10px] text-muted-foreground">Calorías</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-sm bg-muted-foreground/40" />
          <span className="text-[10px] text-muted-foreground">Proteína (g×10)</span>
        </div>
      </div>

      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barCategoryGap="20%">
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'hsl(0 0% 50%)' }}
            />
            <YAxis
              hide
              domain={[0, Math.ceil(maxCalories * 1.15)]}
            />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Bar
              dataKey="calories"
              fill="hsl(0 0% 35%)"
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
            />
            <Bar
              dataKey={(entry: DayData) => entry.protein * 10}
              fill="hsl(0 0% 75%)"
              radius={[4, 4, 0, 0]}
              maxBarSize={24}
              name="protein_scaled"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Target line label */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-muted-foreground">
          Objetivo: {targetCalories.toLocaleString()} kcal/día
        </span>
        <span className="text-[10px] text-muted-foreground">
          Prom: {Math.round(chartData.reduce((s, d) => s + d.calories, 0) / 7).toLocaleString()} kcal
        </span>
      </div>
    </div>
  );
}