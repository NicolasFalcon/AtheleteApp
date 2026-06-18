import { Calendar } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@app/components/ui';
import { useAppTheme } from '@app/hooks/useAppTheme';
import type { EllieWeeklySummary } from '@app/shared';

type EllieWeeklySummaryCardProps = {
  summary: EllieWeeklySummary;
  onOpenChat: () => void;
};

export function EllieWeeklySummaryCard({
  summary,
  onOpenChat,
}: EllieWeeklySummaryCardProps) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      padding: 15,
      borderRadius: theme.radii.md,
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
    interpretation: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: theme.typography.weights.semibold,
    },
    metricsGrid: {
      flexDirection: 'row',
      borderRadius: theme.radii.sm,
      backgroundColor: theme.colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      paddingVertical: 11,
    },
    metricCard: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 5,
    },
    label: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
    },
    value: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      fontWeight: theme.typography.weights.semibold,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
    },
    suggestion: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 18,
    },
    cta: {
      minHeight: 46,
      borderRadius: theme.radii.pill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      marginTop: 1,
    },
    ctaLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      fontWeight: theme.typography.weights.semibold,
    },
  });

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Calendar color={theme.colors.textPrimary} size={16} strokeWidth={2} />
        <Text style={styles.title}>Resumen semanal</Text>
      </View>

      <Text style={styles.interpretation}>{summary.suggestion}</Text>
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.label}>Entrenos</Text>
          <Text style={styles.value}>
            {summary.workoutsCompleted} / {summary.workoutsGoal}
          </Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.label}>Adherencia</Text>
          <Text style={styles.value}>{summary.nutritionAdherence}%</Text>
        </View>
        {summary.challengeProgress ? (
          <View style={styles.metricCard}>
            <Text style={styles.label}>Reto</Text>
            <Text style={styles.value}>{summary.challengeProgress}</Text>
          </View>
        ) : null}
        <View style={styles.metricCard}>
          <Text style={styles.label}>Puntos</Text>
          <Text style={styles.value}>{summary.pointsEarned}</Text>
        </View>
      </View>
      <Pressable
        onPress={onOpenChat}
        style={({ pressed }) => [
          styles.cta,
          pressed ? { opacity: 0.86 } : null,
        ]}
      >
        <Text style={styles.ctaLabel}>Ver lectura semanal en chat</Text>
      </Pressable>
    </Card>
  );
}
