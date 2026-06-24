import { useMemo, useState } from 'react';
import { Utensils } from 'lucide-react-native';
import { useAppTheme } from '@app/hooks/useAppTheme';
import { getLocalDateKey } from '@app/lib/date';
import { ProgressChartCard } from '@app/features/progress/components/ProgressChartCard';
import {
  buildProgressDateRange,
  formatProgressDayLabel,
  formatProgressTooltipLabel,
} from '@app/features/progress/progressDateRanges';
import type { DailyNutritionLog, NutritionPlan } from '@app/shared';

type ProgressRange = 'week' | 'month';

type NutritionProgressCardProps = {
  logs: DailyNutritionLog[];
  plan: NutritionPlan | null;
  range: ProgressRange;
  onOpen?: () => void;
};

type NutritionDataset = 'calories' | 'protein';

export function NutritionProgressCard({
  logs,
  plan,
  range,
}: NutritionProgressCardProps) {
  const { theme } = useAppTheme();
  const [activeDataset, setActiveDataset] =
    useState<NutritionDataset>('calories');
  const targetCalories = plan?.targetCalories || 2300;

  const chartData = useMemo(() => {
    const byDate = logs.reduce<Record<string, DailyNutritionLog>>(
      (accumulator, log) => {
        accumulator[log.date] = log;
        return accumulator;
      },
      {},
    );

    return buildProgressDateRange(range).map(date => {
      const key = getLocalDateKey(date);
      const log = byDate[key];
      const calories = Math.round(log?.calories || 0);
      const protein = Math.round(log?.protein || 0);

      return {
        id: key,
        label: formatProgressDayLabel(date, range),
        tooltipLabel: formatProgressTooltipLabel(date),
        calories,
        protein,
      };
    });
  }, [logs, range]);

  const activeUnit = activeDataset === 'calories' ? 'kcal' : 'g';
  const activeLabel = activeDataset === 'calories' ? 'Calorías' : 'Proteína';
  const activeColor =
    activeDataset === 'calories'
      ? theme.colors.accent
      : theme.colors.textPrimary;
  const activeAverage = Math.round(
    chartData.reduce((sum, point) => sum + point[activeDataset], 0) /
      Math.max(chartData.length, 1),
  );
  const hasData = chartData.some(point => point[activeDataset] > 0);

  return (
    <ProgressChartCard
      icon={
        <Utensils
          color={theme.colors.textPrimary}
          size={16}
          strokeWidth={2}
        />
      }
      title={`Nutrición — ${range === 'week' ? '7 días' : 'Mes'}`}
      range={range}
      points={chartData.map(point => ({
        id: `${point.id}-${activeDataset}`,
        label: point.label,
        value: point[activeDataset],
        tooltipLabel: point.tooltipLabel,
        tooltipValue: `${point[activeDataset].toLocaleString(
          'es-CL',
        )} ${activeUnit}`,
      }))}
      primaryColor={activeColor}
      legendItems={[
        {
          label: 'Calorías',
          color: theme.colors.accent,
          active: activeDataset === 'calories',
          onPress: () => setActiveDataset('calories'),
        },
        {
          label: 'Proteína',
          color: theme.colors.textPrimary,
          active: activeDataset === 'protein',
          onPress: () => setActiveDataset('protein'),
        },
      ]}
      hasData={hasData}
      emptyMessage={`Sin registros de ${activeLabel.toLowerCase()} en este periodo.`}
      targetValue={activeDataset === 'calories' ? targetCalories : undefined}
      metrics={[
        ...(activeDataset === 'calories'
          ? [
              {
                label: 'Objetivo',
                value: `${targetCalories.toLocaleString('es-CL')} kcal/día`,
              },
            ]
          : []),
        {
          label: `Prom ${activeLabel.toLowerCase()}`,
          value: `${activeAverage.toLocaleString('es-CL')} ${activeUnit}`,
        },
      ]}
    />
  );
}
