import {useMemo} from 'react';
import {Utensils} from 'lucide-react-native';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Card} from '@app/components/ui';
import {useAppTheme} from '@app/hooks/useAppTheme';
import {getLocalDateKey} from '@app/lib/date';
import {ProgressBarChart} from '@app/features/progress/components/ProgressBarChart';
import type {DailyNutritionLog, NutritionPlan} from '@app/shared';

type ProgressRange = 'week' | 'month';

type NutritionProgressCardProps = {
  logs: DailyNutritionLog[];
  plan: NutritionPlan | null;
  range: ProgressRange;
  onOpen?: () => void;
};

function buildDateRange(range: ProgressRange): Date[] {
  const days = range === 'month' ? 30 : 7;
  return Array.from({length: days}, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - index));
    return date;
  });
}

export function NutritionProgressCard({
  logs,
  plan,
  range,
  onOpen,
}: NutritionProgressCardProps) {
  const {theme} = useAppTheme();
  const targetCalories = plan?.targetCalories || 2300;

  const chartData = useMemo(() => {
    const byDate = logs.reduce<Record<string, DailyNutritionLog>>((accumulator, log) => {
      accumulator[log.date] = log;
      return accumulator;
    }, {});

    return buildDateRange(range).map(date => {
      const key = getLocalDateKey(date);
      const log = byDate[key];

      return {
        id: key,
        label:
          range === 'week'
            ? date
                .toLocaleDateString('es-CL', {weekday: 'short'})
                .replace('.', '')
                .slice(0, 3)
            : String(date.getDate()),
        tooltipTitle: log
          ? `${Math.round(log.calories)} kcal`
          : date.toLocaleDateString('es-CL', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            }),
        tooltipLines: log
          ? [`${Math.round(log.protein)} g proteína`]
          : ['Sin registro'],
        primaryValue: log?.calories || 0,
        secondaryValue: (log?.protein || 0) * 10,
      };
    });
  }, [logs, range]);

  const averageCalories = Math.round(
    chartData.reduce((sum, point) => sum + point.primaryValue, 0) /
      Math.max(chartData.length, 1),
  );

  const styles = StyleSheet.create({
    card: {
      padding: 16,
      borderRadius: 24,
      gap: 12,
    },
    header: {
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
    <Pressable
      onPress={onOpen}
      disabled={!onOpen}
      style={({pressed}) => [pressed && onOpen ? {opacity: 0.92} : null]}>
      <Card style={styles.card}>
      <View style={styles.header}>
        <Utensils color={theme.colors.textPrimary} size={16} strokeWidth={2} />
        <Text style={styles.title}>
          Nutrición — {range === 'week' ? '7 días' : 'Mes'}
        </Text>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, {backgroundColor: theme.colors.accent}]} />
          <Text style={styles.legendLabel}>Calorías</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.swatch,
              {backgroundColor: theme.colors.surfaceMuted},
            ]}
          />
          <Text style={styles.legendLabel}>Proteína (g×10)</Text>
        </View>
      </View>

      <ProgressBarChart
        points={chartData}
        primaryColor={theme.colors.accent}
        secondaryColor={theme.colors.surfaceMuted}
        targetValue={targetCalories}
        labelInterval={range === 'month' ? 5 : 1}
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Objetivo: {targetCalories.toLocaleString('es-CL')} kcal/día
        </Text>
        <Text style={styles.footerText}>
          Prom: {averageCalories.toLocaleString('es-CL')} kcal
        </Text>
      </View>
      </Card>
    </Pressable>
  );
}
