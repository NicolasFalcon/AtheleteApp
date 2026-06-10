import { Sparkles } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@app/components/ui';
import { useAppTheme } from '@app/hooks/useAppTheme';

type EllieBriefingCardProps = {
  heroText: string;
  insights: string[];
  actionsCount: number;
};

export function EllieBriefingCard({
  heroText,
  insights,
  actionsCount,
}: EllieBriefingCardProps) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
      borderRadius: theme.radii.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    heroWrap: {
      flex: 1,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radii.pill,
      paddingHorizontal: 11,
      paddingVertical: 7,
    },
    badgeLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      fontWeight: theme.typography.weights.semibold,
    },
    summary: {
      borderRadius: theme.radii.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.background,
      paddingHorizontal: 12,
      paddingVertical: 11,
      minWidth: 92,
    },
    summaryEyebrow: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.monoFamily,
      fontSize: 10,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 0,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    summaryCount: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 18,
      fontWeight: theme.typography.weights.bold,
      textAlign: 'center',
      marginTop: 6,
    },
    summaryLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      fontWeight: theme.typography.weights.semibold,
      textAlign: 'center',
      marginTop: 2,
    },
    hero: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 16,
      fontWeight: theme.typography.weights.bold,
      lineHeight: 26,
      flex: 1,
      marginTop: 10,
    },
    insightCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: theme.colors.background,
      borderRadius: theme.radii.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      paddingHorizontal: 13,
      paddingVertical: 11,
    },
    insightDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.textSecondary,
      marginTop: 7,
    },
    insightText: {
      flex: 1,
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 19,
    },
  });

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={styles.heroWrap}>
          <View style={styles.badge}>
            <Sparkles
              color={theme.colors.textPrimary}
              size={14}
              strokeWidth={2}
            />
            <Text style={styles.badgeLabel}>Briefing de hoy</Text>
          </View>
          <Text style={styles.hero}>{heroText}</Text>
        </View>
        <View style={styles.summary}>
          <Text style={styles.summaryEyebrow}>En foco</Text>
          <Text style={styles.summaryCount}>{actionsCount}</Text>
          <Text style={styles.summaryLabel}>acciones</Text>
        </View>
      </View>

      {insights.map(insight => (
        <View key={insight} style={styles.insightCard}>
          <View style={styles.insightDot} />
          <Text style={styles.insightText}>{insight}</Text>
        </View>
      ))}
    </Card>
  );
}
