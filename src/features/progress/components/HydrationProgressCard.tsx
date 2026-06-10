import { useMemo } from 'react';
import { Droplets } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@app/components/ui';
import { useAppTheme } from '@app/hooks/useAppTheme';
import { getLocalDateKey } from '@app/lib/date';
import { ProgressBarChart } from '@app/features/progress/components/ProgressBarChart';
import type { HydrationLog } from '@app/shared';

type ProgressRange = 'week' | 'month';

type HydrationProgressCardProps = {
  logs: HydrationLog[];
  goalGlasses: number;
  range: ProgressRange;
};

function buildDateRange(range: ProgressRange): Date[] {
  const days = range === 'month' ? 30 : 7;
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - index));
    return date;
  });
}

export function HydrationProgressCard({
  logs,
  goalGlasses,
  range,
}: HydrationProgressCardProps) {
  const { theme } = useAppTheme();

  const chartData = useMemo(() => {
    const byDate = logs.reduce<Record<string, number>>((accumulator, log) => {
      accumulator[log.date] = log.waterMl;
      return accumulator;
    }, {});

    return buildDateRange(range).map(date => {
      const key = getLocalDateKey(date);
      const waterMl = byDate[key] || 0;
      const glasses = Math.floor(waterMl / 250);
      const liters = +(waterMl / 1000).toFixed(1);

      return {
        id: key,
        label:
          range === 'week'
            ? date
                .toLocaleDateString('es-CL', { weekday: 'short' })
                .replace('.', '')
                .slice(0, 3)
            : String(date.getDate()),
        tooltipTitle: `${glasses} vasos`,
        tooltipLines: [`${liters} L`],
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

  const styles = StyleSheet.create({
    card: {
      padding: 16,
      borderRadius: theme.radii.md,
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
    },
    summary: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
    },
    legend: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    swatch: {
      width: 8,
      height: 8,
      borderRadius: 999,
      backgroundColor: '#4C84D9',
    },
    dash: {
      width: 12,
      borderTopWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.colors.textSecondary,
      opacity: 0.55,
    },
    legendLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    footerText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
    },
  });

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Droplets color="#4C84D9" size={16} strokeWidth={2} />
          <Text style={styles.title}>
            Hidratación — {range === 'week' ? '7 días' : 'Mes'}
          </Text>
        </View>
        <Text style={styles.summary}>
          {daysMetGoal}/{chartData.length} días al objetivo
        </Text>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={styles.swatch} />
          <Text style={styles.legendLabel}>Vasos (250 ml)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.dash} />
          <Text style={styles.legendLabel}>Objetivo ({goalGlasses})</Text>
        </View>
      </View>

      <ProgressBarChart
        points={chartData}
        primaryColor="#4C84D9"
        targetValue={goalGlasses}
        labelInterval={range === 'month' ? 5 : 1}
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Objetivo: {goalGlasses} vasos/día (
          {((goalGlasses * 250) / 1000).toFixed(1)} L)
        </Text>
        <Text style={styles.footerText}>
          Prom: {averageLiters.toFixed(1)} L
        </Text>
      </View>
    </Card>
  );
}
