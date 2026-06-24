import { useMemo } from 'react';
import { Dumbbell } from 'lucide-react-native';
import { useAppTheme } from '@app/hooks/useAppTheme';
import { getLocalDateKey } from '@app/lib/date';
import { ProgressChartCard } from '@app/features/progress/components/ProgressChartCard';
import {
  buildProgressDateRange,
  formatProgressDayLabel,
  formatProgressTooltipLabel,
} from '@app/features/progress/progressDateRanges';
import type { WorkoutSession } from '@app/shared';

type ProgressRange = 'week' | 'month';

type TrainingProgressCardProps = {
  sessions: WorkoutSession[];
  range: ProgressRange;
};

function formatDuration(minutes: number): string {
  const rounded = Math.max(0, Math.round(minutes));
  if (rounded < 60) {
    return `${rounded} min`;
  }

  const hours = Math.floor(rounded / 60);
  const remaining = rounded % 60;
  return remaining > 0 ? `${hours} h ${remaining} min` : `${hours} h`;
}

type ChartPoint = {
  id: string;
  label: string;
  tooltipLabel: string;
  tooltipValue: string;
  primaryValue: number;
  sessions: number;
  calories: number;
};

export function TrainingProgressCard({
  sessions,
  range,
}: TrainingProgressCardProps) {
  const { theme } = useAppTheme();

  const chartData = useMemo<ChartPoint[]>(() => {
    const completed = sessions.filter(session => session.completed);
    const byDate = completed.reduce<
      Record<string, { minutes: number; sessions: number; calories: number }>
    >((accumulator, session) => {
      const key = session.date;
      const current = accumulator[key] || {
        minutes: 0,
        sessions: 0,
        calories: 0,
      };
      accumulator[key] = {
        minutes: current.minutes + Math.max(0, session.duration || 0),
        sessions: current.sessions + 1,
        calories: current.calories + Math.max(0, session.caloriesBurned || 0),
      };
      return accumulator;
    }, {});

    return buildProgressDateRange(range).map(date => {
      const key = getLocalDateKey(date);
      const totals = byDate[key] || { minutes: 0, sessions: 0, calories: 0 };

      return {
        id: key,
        label: formatProgressDayLabel(date, range),
        tooltipLabel: formatProgressTooltipLabel(date),
        tooltipValue: formatDuration(totals.minutes),
        primaryValue: totals.minutes,
        sessions: totals.sessions,
        calories: totals.calories,
      };
    });
  }, [range, sessions]);

  const totalSessions = chartData.reduce((sum, item) => sum + item.sessions, 0);
  const totalMinutes = chartData.reduce(
    (sum, item) => sum + item.primaryValue,
    0,
  );
  const activeDays = chartData.filter(item => item.sessions > 0).length;
  const averageMinutes =
    totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;
  const hasData = totalSessions > 0;

  return (
    <ProgressChartCard
      icon={
        <Dumbbell color={theme.colors.textPrimary} size={16} strokeWidth={2} />
      }
      title={`Entreno — ${range === 'week' ? '7 días' : 'Mes'}`}
      summary={`${totalSessions} ${
        totalSessions === 1 ? 'sesión' : 'sesiones'
      }`}
      range={range}
      points={chartData.map(point => ({
        id: point.id,
        label: point.label,
        value: point.primaryValue,
        tooltipLabel: point.tooltipLabel,
        tooltipValue: point.tooltipValue,
      }))}
      primaryColor={theme.colors.accent}
      legendItems={[{ label: 'Minutos', color: theme.colors.accent }]}
      hasData={hasData}
      emptyMessage="Sin entrenos registrados en este periodo."
      metrics={[
        {
          label: 'Total',
          value: `${totalSessions} ${
            totalSessions === 1 ? 'sesión' : 'sesiones'
          }`,
        },
        { label: 'Tiempo', value: formatDuration(totalMinutes) },
        { label: 'Prom', value: `${formatDuration(averageMinutes)}/sesión` },
        { label: 'Activos', value: `${activeDays} día${activeDays === 1 ? '' : 's'}` },
      ]}
    />
  );
}
