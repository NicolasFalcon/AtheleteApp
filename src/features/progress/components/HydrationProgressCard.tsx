import { useMemo } from 'react';
import { Droplets } from 'lucide-react-native';
import { getLocalDateKey } from '@app/lib/date';
import { ProgressChartCard } from '@app/features/progress/components/ProgressChartCard';
import {
  buildProgressDateRange,
  formatProgressDayLabel,
  formatProgressTooltipLabel,
} from '@app/features/progress/progressDateRanges';
import type { HydrationLog } from '@app/shared';

type ProgressRange = 'week' | 'month';

type HydrationProgressCardProps = {
  logs: HydrationLog[];
  goalGlasses: number;
  range: ProgressRange;
};

export function HydrationProgressCard({
  logs,
  goalGlasses,
  range,
}: HydrationProgressCardProps) {
  const chartData = useMemo(() => {
    const byDate = logs.reduce<Record<string, number>>((accumulator, log) => {
      accumulator[log.date] = log.waterMl;
      return accumulator;
    }, {});

    return buildProgressDateRange(range).map(date => {
      const key = getLocalDateKey(date);
      const waterMl = byDate[key] || 0;
      const glasses = Math.floor(waterMl / 250);
      const liters = +(waterMl / 1000).toFixed(1);

      return {
        id: key,
        label: formatProgressDayLabel(date, range),
        tooltipLabel: formatProgressTooltipLabel(date),
        tooltipValue: `${glasses} vaso${glasses === 1 ? '' : 's'}`,
        primaryValue: glasses,
        liters,
      };
    });
  }, [logs, range]);

  const daysMetGoal = chartData.filter(
    point => point.primaryValue >= goalGlasses,
  ).length;
  const averageLiters =
    chartData.reduce((sum, point) => sum + point.liters, 0) /
    Math.max(chartData.length, 1);
  const hasData = chartData.some(point => point.primaryValue > 0);

  return (
    <ProgressChartCard
      icon={<Droplets color="#4C84D9" size={16} strokeWidth={2} />}
      title={`Hidratación — ${range === 'week' ? '7 días' : 'Mes'}`}
      summary={`${daysMetGoal}/${chartData.length} días al objetivo`}
      range={range}
      points={chartData.map(point => ({
        id: point.id,
        label: point.label,
        value: point.primaryValue,
        tooltipLabel: point.tooltipLabel,
        tooltipValue: point.tooltipValue,
      }))}
      primaryColor="#4C84D9"
      legendItems={[
        { label: 'Vasos (250 ml)', color: '#4C84D9' },
        { label: `Objetivo (${goalGlasses})`, dashed: true },
      ]}
      hasData={hasData}
      emptyMessage="Sin registros de hidratación en este periodo."
      targetValue={goalGlasses}
      chartHeightOverride={range === 'month' ? 112 : undefined}
      metrics={[
        {
          label: 'Objetivo',
          value: `${goalGlasses} vasos/día (${(
            (goalGlasses * 250) /
            1000
          ).toFixed(1)} L)`,
        },
        { label: 'Prom', value: `${averageLiters.toFixed(1)} L` },
      ]}
    />
  );
}
