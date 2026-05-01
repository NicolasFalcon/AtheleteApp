import {Calendar} from 'lucide-react-native';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Card} from '@app/components/ui';
import {useAppTheme} from '@app/hooks/useAppTheme';
import type {EllieWeeklySummary} from '@app/shared';

type EllieWeeklySummaryCardProps = {
  summary: EllieWeeklySummary;
  onOpenChat: () => void;
};

export function EllieWeeklySummaryCard({
  summary,
  onOpenChat,
}: EllieWeeklySummaryCardProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      padding: 15,
      borderRadius: 28,
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
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    metricCard: {
      width: '47%',
      borderRadius: 16,
      backgroundColor: theme.colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      paddingHorizontal: 12,
      paddingVertical: 11,
      gap: 6,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
    },
    label: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
    },
    value: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
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
      marginTop: 2,
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
      <View style={styles.divider} />
      <Text style={styles.suggestion}>{summary.suggestion}</Text>
      <Pressable
        onPress={onOpenChat}
        style={({pressed}) => [styles.cta, pressed ? {opacity: 0.86} : null]}>
        <Text style={styles.ctaLabel}>Ver lectura semanal en chat</Text>
      </Pressable>
    </Card>
  );
}
