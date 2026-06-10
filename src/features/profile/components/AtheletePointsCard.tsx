import { Flame, Trophy, Zap } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@app/components/ui';
import { useAppTheme } from '@app/hooks/useAppTheme';

type AtheletePointsCardProps = {
  points: number;
  currentStreak: number;
  longestStreak: number;
  challengeDayLabel: string;
  challengeValue: string;
};

function ProgressStat({
  icon,
  label,
  value,
  meta,
}: {
  icon: 'flame' | 'trophy' | 'zap';
  label: string;
  value: string;
  meta: string;
}) {
  const { theme } = useAppTheme();
  const Icon = icon === 'flame' ? Flame : icon === 'trophy' ? Trophy : Zap;

  const styles = StyleSheet.create({
    card: {
      flex: 1,
      borderRadius: theme.radii.sm,
      paddingHorizontal: 10,
      paddingVertical: 11,
      backgroundColor: theme.colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      gap: 7,
    },
    iconBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 0,
      textTransform: 'uppercase',
      minHeight: 24,
    },
    value: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 17,
      fontWeight: theme.typography.weights.semibold,
    },
    meta: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
    },
  });

  return (
    <View style={styles.card}>
      <View style={styles.iconBadge}>
        <Icon color={theme.colors.textSecondary} size={14} strokeWidth={2} />
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.meta}>{meta}</Text>
    </View>
  );
}

export function AtheletePointsCard({
  points,
  currentStreak,
  longestStreak,
  challengeDayLabel,
  challengeValue,
}: AtheletePointsCardProps) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      borderRadius: theme.radii.md,
      padding: 16,
      gap: 12,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    headingGroup: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      flex: 1,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.accent,
    },
    eyebrow: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 0,
      textTransform: 'uppercase',
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 17,
      fontWeight: theme.typography.weights.bold,
      marginTop: 2,
    },
    summaryPill: {
      borderRadius: theme.radii.pill,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
    },
    summaryLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 0,
      textTransform: 'uppercase',
    },
    pointsRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
    },
    points: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 36,
      fontWeight: theme.typography.weights.bold,
    },
    pointsSuffix: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      fontWeight: theme.typography.weights.medium,
      letterSpacing: 0,
      marginBottom: 8,
      textTransform: 'uppercase',
    },
    description: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      lineHeight: 20,
      maxWidth: 280,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 8,
    },
  });

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headingGroup}>
          <View style={styles.iconWrap}>
            <Zap
              color={theme.colors.accentContrast}
              size={18}
              strokeWidth={2.2}
            />
          </View>
          <View>
            <Text style={styles.eyebrow}>Identidad de progreso</Text>
            <Text style={styles.title}>Puntos Athelete</Text>
          </View>
        </View>

        <View style={styles.summaryPill}>
          <Text style={styles.summaryLabel}>Resumen</Text>
        </View>
      </View>

      <View>
        <View style={styles.pointsRow}>
          <Text style={styles.points}>{points.toLocaleString('es-CL')}</Text>
          <Text style={styles.pointsSuffix}>pts</Text>
        </View>
        <Text style={styles.description}>
          Gana puntos entrenando, completando retos y sosteniendo tu ritmo
          dentro del plan.
        </Text>
      </View>

      <View style={styles.statsRow}>
        <ProgressStat
          icon="flame"
          label="Racha actual"
          value={String(currentStreak)}
          meta="días"
        />
        <ProgressStat
          icon="trophy"
          label="Mejor racha"
          value={String(longestStreak)}
          meta="días"
        />
        <ProgressStat
          icon="zap"
          label="Core 33"
          value={challengeValue}
          meta={challengeDayLabel}
        />
      </View>
    </Card>
  );
}
