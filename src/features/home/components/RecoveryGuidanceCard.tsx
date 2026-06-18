import { ArrowRight, Heart } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@app/hooks/useAppTheme';

type RecoveryGuidanceCardProps = {
  onPress: () => void;
};

export function RecoveryGuidanceCard({ onPress }: RecoveryGuidanceCardProps) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      flex: 1,
      minHeight: 164,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      padding: theme.spacing.sm,
      gap: theme.spacing.xs,
      shadowColor: '#000000',
      ...theme.elevations.card,
    },
    iconBox: {
      width: 38,
      height: 38,
      borderRadius: 11,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      flex: 1,
      gap: 4,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      fontWeight: theme.typography.weights.bold,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 17,
    },
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    ctaLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.medium,
    },
  });

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed ? { transform: [{ scale: 0.99 }] } : null,
      ]}
    >
      <View style={styles.iconBox}>
        <Heart color={theme.colors.textPrimary} size={18} strokeWidth={2.1} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>Guía de recuperación</Text>
        <Text numberOfLines={2} style={styles.subtitle}>
          Ajusta descanso, movilidad y recuperación con ELLIE.
        </Text>
      </View>
      <View style={styles.cta}>
        <Text style={styles.ctaLabel}>Consultar guía</Text>
        <ArrowRight color={theme.colors.textSecondary} size={12} />
      </View>
    </Pressable>
  );
}
