import { Brain, ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@app/hooks/useAppTheme';

type QuizPromoCardProps = {
  onPress: () => void;
};

export function QuizPromoCard({ onPress }: QuizPromoCardProps) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      shadowColor: '#000000',
      ...theme.elevations.card,
    },
    iconBox: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor: theme.colors.surfaceMuted,
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
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 16,
      fontWeight: theme.typography.weights.semibold,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.surfaceMuted,
    },
    badgeLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      fontWeight: theme.typography.weights.medium,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 16,
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
        <Brain color={theme.colors.textPrimary} size={22} strokeWidth={2.1} />
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Aprende y gana puntos</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>Nuevo</Text>
          </View>
        </View>
        <Text numberOfLines={2} style={styles.subtitle}>
          Pon a prueba tus conocimientos sobre entrenamiento, nutrición y
          fitness.
        </Text>
      </View>
      <ChevronRight color={theme.colors.textSecondary} size={18} />
    </Pressable>
  );
}
