import { StyleSheet, Text, View } from 'react-native';
import { Chip } from '@app/components/ui';
import { useAppTheme } from '@app/hooks/useAppTheme';

type ProfileHeroCardProps = {
  name: string;
  email: string;
  goalLabel: string;
  trainingLabel: string;
  ageLabel: string;
  weightLabel: string;
  heightLabel: string;
};

function StatCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      flex: 1,
      borderRadius: theme.radii.sm,
      paddingVertical: 10,
      paddingHorizontal: 10,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
    },
    label: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 0,
      textTransform: 'uppercase',
    },
    value: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 16,
      fontWeight: theme.typography.weights.semibold,
    },
    unit: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
    },
  });

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.unit}>{unit}</Text>
    </View>
  );
}

export function ProfileHeroCard({
  name,
  email,
  goalLabel,
  trainingLabel,
  ageLabel,
  weightLabel,
  heightLabel,
}: ProfileHeroCardProps) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    container: {
      gap: 12,
    },
    identityCard: {
      borderRadius: theme.radii.md,
      padding: 16,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      shadowColor: '#000000',
      ...theme.elevations.card,
      gap: 12,
    },
    identityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    avatar: {
      width: 58,
      height: 58,
      borderRadius: 18,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000000',
      shadowOpacity: 0.1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    avatarLabel: {
      color: theme.colors.accentContrast,
      fontFamily: theme.typography.fontFamily,
      fontSize: 24,
      fontWeight: theme.typography.weights.semibold,
    },
    textBlock: {
      flex: 1,
      minWidth: 0,
      gap: 3,
    },
    name: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 20,
      fontWeight: theme.typography.weights.bold,
    },
    email: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
    },
    chips: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    chipBase: {
      paddingHorizontal: 12,
      minHeight: 30,
    },
    chipMutedSurface: {
      paddingHorizontal: 12,
      minHeight: 30,
      backgroundColor: theme.colors.surfaceMuted,
    },
    chipText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      fontWeight: theme.typography.weights.medium,
    },
    chipMuted: {
      color: theme.colors.textSecondary,
    },
    stats: {
      flexDirection: 'row',
      gap: 8,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.identityCard}>
        <View style={styles.identityRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLabel}>
              {(name || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={styles.textBlock}>
            <Text numberOfLines={1} style={styles.name}>
              {name || 'Usuario'}
            </Text>
            <Text numberOfLines={1} style={styles.email}>
              {email}
            </Text>
          </View>
        </View>

        <View style={styles.chips}>
          <Chip style={styles.chipBase}>
            <Text numberOfLines={1} style={styles.chipText}>
              {goalLabel}
            </Text>
          </Chip>
          <Chip style={styles.chipMutedSurface}>
            <Text numberOfLines={1} style={[styles.chipText, styles.chipMuted]}>
              {trainingLabel}
            </Text>
          </Chip>
        </View>
      </View>

      <View style={styles.stats}>
        <StatCard label="Edad" value={ageLabel} unit="años" />
        <StatCard label="Peso" value={weightLabel} unit="kg" />
        <StatCard label="Altura" value={heightLabel} unit="cm" />
      </View>
    </View>
  );
}
