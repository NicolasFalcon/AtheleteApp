import { ArrowRight, Brain } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@app/hooks/useAppTheme';

type QuizPromoCardProps = {
  onPress: () => void;
};

export function QuizPromoCard({ onPress }: QuizPromoCardProps) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      minHeight: 104,
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.textPrimary,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.textPrimary,
      padding: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      shadowColor: '#000000',
      ...theme.elevations.card,
    },
    iconBox: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      flex: 1,
      gap: 2,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
    title: {
      color: theme.colors.background,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      fontWeight: theme.typography.weights.semibold,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.background,
    },
    badgeLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      fontWeight: theme.typography.weights.medium,
    },
    subtitle: {
      color: theme.colors.background,
      opacity: 0.7,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 16,
    },
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      marginTop: 4,
    },
    ctaLabel: {
      color: theme.colors.background,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.bold,
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
        <Brain color={theme.colors.background} size={19} strokeWidth={2.1} />
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Aprende y gana puntos</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>Nuevo</Text>
          </View>
        </View>
        <Text numberOfLines={2} style={styles.subtitle}>
          Responde un quiz breve, aprende algo útil y suma puntos.
        </Text>
        <View style={styles.cta}>
          <Text style={styles.ctaLabel}>Jugar ahora</Text>
          <ArrowRight color={theme.colors.background} size={13} />
        </View>
      </View>
    </Pressable>
  );
}
