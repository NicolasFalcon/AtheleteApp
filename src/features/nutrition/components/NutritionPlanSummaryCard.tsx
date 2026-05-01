import {Sparkles} from 'lucide-react-native';
import {StyleSheet, Text, View} from 'react-native';
import {Card} from '@app/components/ui';
import {useAppTheme} from '@app/hooks/useAppTheme';
import type {DailyNutritionLog} from '@app/shared';

type NutritionPlanSummaryCardProps = {
  summary: string;
  sourceLabel: string;
  todayLog: DailyNutritionLog | null;
};

export function NutritionPlanSummaryCard({
  summary,
  sourceLabel,
  todayLog,
}: NutritionPlanSummaryCardProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      padding: 18,
      borderRadius: 26,
      gap: 14,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.surfaceMuted,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    chipText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 0.3,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 17,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: -0.3,
    },
    summary: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      lineHeight: 20,
    },
    statsWrap: {
      flexDirection: 'row',
      gap: 10,
    },
    stat: {
      flex: 1,
      borderRadius: 16,
      backgroundColor: theme.colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      paddingHorizontal: 12,
      paddingVertical: 12,
      gap: 3,
    },
    statLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    statValue: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 15,
      fontWeight: theme.typography.weights.semibold,
    },
    statHint: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
    },
  });

  return (
    <Card style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.chip}>
          <Sparkles color={theme.colors.textPrimary} size={13} strokeWidth={2} />
          <Text style={styles.chipText}>{sourceLabel}</Text>
        </View>
      </View>

      <View>
        <Text style={styles.title}>Resumen del plan</Text>
        <Text style={styles.summary}>{summary}</Text>
      </View>

      <View style={styles.statsWrap}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Hoy</Text>
          <Text style={styles.statValue}>
            {todayLog?.calories ? `${todayLog.calories} kcal` : 'Sin registro'}
          </Text>
          <Text style={styles.statHint}>
            {todayLog?.protein ? `${todayLog.protein} g proteína` : 'Aún no registras comidas'}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Adherencia</Text>
          <Text style={styles.statValue}>
            {todayLog?.adherence ? `${Math.round(todayLog.adherence)}%` : '—'}
          </Text>
          <Text style={styles.statHint}>Frente a tu objetivo diario</Text>
        </View>
      </View>
    </Card>
  );
}
