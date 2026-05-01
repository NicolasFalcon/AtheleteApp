import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts';
import { useHydration } from '@/hooks/useHydration';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Droplets } from 'lucide-react';

interface DayData {
  label: string;
  glasses: number;
  liters: number;
  date: string;
}

export function WaterHistoryChart() {
  const { chartData, goalGlasses, goalMl, daysMetGoal, weeklyAverageMl, loading } = useHydration();

  const data = useMemo<DayData[]>(() => {
    return chartData.map(d => {
      const date = new Date(d.date + 'T12:00:00');
      const glasses = Math.floor(d.water_ml / 250);
      return {
        label: format(date, 'EEE', { locale: es }).slice(0, 3),
        glasses,
        liters: +(d.water_ml / 1000).toFixed(1),
        date: d.date,
      };
    });
  }, [chartData]);

  const hasData = chartData.some(d => d.water_ml > 0);
  const maxGlasses = Math.max(...data.map(d => d.glasses), goalGlasses);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload as DayData;
    return (
      <div className="rounded-xl bg-popover border border-border px-3 py-2 text-xs shadow-lg">
        <p className="font-medium text-foreground">{d.glasses} vasos</p>
        <p className="text-muted-foreground">{d.liters} L</p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="card-elevated p-4">
        <div className="flex items-center gap-2 mb-1">
          <Droplets className="h-4 w-4 text-info" />
          <h3 className="font-semibold text-foreground text-sm">Hidratación — 7 días</h3>
        </div>
        <div className="h-36 flex items-center justify-center">
          <span className="text-xs text-muted-foreground">Cargando...</span>
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="card-elevated p-4">
        <div className="flex items-center gap-2 mb-1">
          <Droplets className="h-4 w-4 text-info" />
          <h3 className="font-semibold text-foreground text-sm">Hidratación — 7 días</h3>
        </div>
        <div className="h-36 flex flex-col items-center justify-center gap-2">
          <Droplets className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground text-center">
            Aún no registras agua.<br />Empieza desde la pantalla de inicio.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-elevated p-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Droplets className="h-4 w-4 text-info" />
          <h3 className="font-semibold text-foreground text-sm">Hidratación — 7 días</h3>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {daysMetGoal}/7 días al objetivo
        </span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-sm bg-info" />
          <span className="text-[10px] text-muted-foreground">Vasos (250 ml)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-[1px] w-3 border-t border-dashed border-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">Objetivo ({goalGlasses})</span>
        </div>
      </div>

      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="20%">
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'hsl(0 0% 50%)' }}
            />
            <YAxis
              hide
              domain={[0, Math.ceil(maxGlasses * 1.2)]}
            />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <ReferenceLine
              y={goalGlasses}
              stroke="hsl(0 0% 50%)"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <Bar
              dataKey="glasses"
              fill="hsl(213 60% 55%)"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-muted-foreground">
          Objetivo: {goalGlasses} vasos/día ({(goalMl / 1000).toFixed(1)} L)
        </span>
        <span className="text-[10px] text-muted-foreground">
          Prom: {(weeklyAverageMl / 1000).toFixed(1)} L
        </span>
      </div>
    </div>
  );
}