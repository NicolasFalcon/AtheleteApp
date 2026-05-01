import {useMemo} from 'react';
import {Dumbbell} from 'lucide-react-native';
import {StyleSheet, Text, View} from 'react-native';
import {Card} from '@app/components/ui';
import {useAppTheme} from '@app/hooks/useAppTheme';
import {getLocalDateKey} from '@app/lib/date';
import {ProgressBarChart} from '@app/features/progress/components/ProgressBarChart';
import type {WorkoutSession} from '@app/shared';

type ProgressRange = 'week' | 'month';

type TrainingProgressCardProps = {
  sessions: WorkoutSession[];
  range: ProgressRange;
};

function getRangeDays(range: ProgressRange) {
  return range === 'month' ? 30 : 7;
}

function buildDateRange(range: ProgressRange): Date[] {
  const days = getRangeDays(range);
  return Array.from({length: days}, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - index));
    return date;
  });
}

function formatDuration(minutes: number): string {
  const rounded = Math.max(0, Math.round(minutes));
  if (rounded < 60) {
    return `${rounded} min`;
  }

  const hours = Math.floor(rounded / 60);
  const remaining = rounded % 60;
  return remaining > 0 ? `${hours} h ${remaining} min` : `${hours} h`;
}

function formatFullLabel(date: Date): string {
  return date.toLocaleDateString('es-CL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

type ChartPoint = {
  id: string;
  label: string;
  tooltipTitle: string;
  tooltipLines: string[];
  primaryValue: number;
  sessions: number;
  calories: number;
};

export function TrainingProgressCard({
  sessions,
  range,
}: TrainingProgressCardProps) {
  const {theme} = useAppTheme();

  const chartData = useMemo<ChartPoint[]>(() => {
    const completed = sessions.filter(session => session.completed);
    const byDate = completed.reduce<Record<string, {minutes: number; sessions: number; calories: number}>>(
      (accumulator, session) => {
        const key = session.date;
        const current = accumulator[key] || {minutes: 0, sessions: 0, calories: 0};
        accumulator[key] = {
          minutes: current.minutes + Math.max(0, session.duration || 0),
          sessions: current.sessions + 1,
          calories: current.calories + Math.max(0, session.caloriesBurned || 0),
        };
        return accumulator;
      },
      {},
    );

    return buildDateRange(range).map(date => {
      const key = getLocalDateKey(date);
      const totals = byDate[key] || {minutes: 0, sessions: 0, calories: 0};

      return {
        id: key,
        label:
          range === 'week'
            ? date
                .toLocaleDateString('es-CL', {weekday: 'short'})
                .replace('.', '')
                .slice(0, 3)
            : String(date.getDate()),
        tooltipTitle: totals.sessions
          ? `${totals.sessions} ${totals.sessions === 1 ? 'sesión' : 'sesiones'}`
          : formatFullLabel(date),
        tooltipLines: totals.sessions
          ? [formatDuration(totals.minutes), `${totals.calories} kcal`]
          : ['Sin entreno'],
        primaryValue: totals.minutes,
        sessions: totals.sessions,
        calories: totals.calories,
      };
    });
  }, [range, sessions]);

  const totalSessions = chartData.reduce((sum, item) => sum + item.sessions, 0);
  const totalMinutes = chartData.reduce((sum, item) => sum + item.primaryValue, 0);
  const activeDays = chartData.filter(item => item.sessions > 0).length;
  const averageMinutes = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;

  const styles = StyleSheet.create({
    card: {
      padding: 16,
      borderRadius: 24,
      gap: 12,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 15,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: -0.3,
    },
    summary: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
    },
    legend: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    bullet: {
      width: 8,
      height: 8,
      borderRadius: 999,
      backgroundColor: theme.colors.accent,
    },
    legendLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
    },
    footer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      paddingTop: 4,
    },
    metric: {
      width: '47%',
      gap: 2,
    },
    metricLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
    },
    metricValue: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      fontWeight: theme.typography.weights.semibold,
    },
  });

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Dumbbell color={theme.colors.textPrimary} size={16} strokeWidth={2} />
          <Text style={styles.title}>
            Entreno — {range === 'week' ? '7 días' : 'Mes'}
          </Text>
        </View>
        <Text style={styles.summary}>
          {totalSessions} {totalSessions === 1 ? 'sesión' : 'sesiones'}
        </Text>
      </View>

      <View style={styles.legend}>
        <View style={styles.bullet} />
        <Text style={styles.legendLabel}>Minutos</Text>
      </View>

      <ProgressBarChart
        points={chartData}
        primaryColor={theme.colors.accent}
        labelInterval={range === 'month' ? 5 : 1}
      />

      <View style={styles.footer}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Total</Text>
          <Text style={styles.metricValue}>
            {totalSessions} {totalSessions === 1 ? 'sesión' : 'sesiones'}
          </Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Tiempo</Text>
          <Text style={styles.metricValue}>{formatDuration(totalMinutes)}</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Prom</Text>
          <Text style={styles.metricValue}>{formatDuration(averageMinutes)}/sesión</Text>
        </View>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>Activos</Text>
          <Text style={styles.metricValue}>
            {activeDays} día{activeDays === 1 ? '' : 's'}
          </Text>
        </View>
      </View>
    </Card>
  );
}
