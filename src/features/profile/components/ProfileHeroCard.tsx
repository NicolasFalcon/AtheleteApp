import {StyleSheet, Text, View} from 'react-native';
import {Chip} from '@app/components/ui';
import {useAppTheme} from '@app/hooks/useAppTheme';

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
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      flex: 1,
      borderRadius: 22,
      paddingVertical: 14,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      shadowColor: '#000000',
      ...theme.elevations.card,
    },
    label: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 1.6,
      textTransform: 'uppercase',
    },
    value: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 17,
      fontWeight: theme.typography.weights.bold,
    },
    unit: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
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
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    container: {
      gap: 18,
      alignItems: 'center',
    },
    avatar: {
      width: 74,
      height: 74,
      borderRadius: 26,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000000',
      shadowOpacity: 0.14,
      shadowRadius: 18,
      shadowOffset: {width: 0, height: 10},
      elevation: 5,
    },
    avatarLabel: {
      color: theme.colors.accentContrast,
      fontFamily: theme.typography.fontFamily,
      fontSize: 26,
      fontWeight: theme.typography.weights.semibold,
    },
    textBlock: {
      alignItems: 'center',
      gap: 4,
    },
    name: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 20,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: -0.4,
    },
    email: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
    },
    chips: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    chipBase: {
      paddingHorizontal: 14,
    },
    chipMutedSurface: {
      paddingHorizontal: 14,
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
      gap: 10,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarLabel}>{(name || 'U').charAt(0).toUpperCase()}</Text>
      </View>

      <View style={styles.textBlock}>
        <Text style={styles.name}>{name || 'Usuario'}</Text>
        <Text style={styles.email}>{email}</Text>
      </View>

      <View style={styles.chips}>
        <Chip style={styles.chipBase}>
          <Text style={styles.chipText}>{goalLabel}</Text>
        </Chip>
        <Chip style={styles.chipMutedSurface}>
          <Text style={[styles.chipText, styles.chipMuted]}>{trainingLabel}</Text>
        </Chip>
      </View>

      <View style={styles.stats}>
        <StatCard label="Edad" value={ageLabel} unit="años" />
        <StatCard label="Peso" value={weightLabel} unit="kg" />
        <StatCard label="Altura" value={heightLabel} unit="cm" />
      </View>
    </View>
  );
}
