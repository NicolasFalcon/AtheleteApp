import { ArrowRight, Sparkles } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@app/hooks/useAppTheme';

type EllieBriefingCardProps = {
  heroText: string;
  insights: string[];
  onPrimaryAction: () => void;
};

export function EllieBriefingCard({
  heroText,
  insights,
  onPrimaryAction,
}: EllieBriefingCardProps) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      padding: 17,
      gap: 13,
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.accent,
      overflow: 'hidden',
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderRadius: theme.radii.pill,
      paddingHorizontal: 11,
      paddingVertical: 7,
    },
    badgeLabel: {
      color: theme.colors.accentContrast,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      fontWeight: theme.typography.weights.semibold,
    },
    hero: {
      color: theme.colors.accentContrast,
      fontFamily: theme.typography.fontFamily,
      fontSize: 21,
      fontWeight: theme.typography.weights.bold,
      lineHeight: 27,
      letterSpacing: -0.5,
    },
    insights: {
      gap: 6,
    },
    insightRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    insightDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: 'rgba(255,255,255,0.5)',
      marginTop: 6,
    },
    insightText: {
      flex: 1,
      color: 'rgba(255,255,255,0.72)',
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 17,
    },
    cta: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.accentContrast,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    ctaLabel: {
      color: theme.colors.accent,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      fontWeight: theme.typography.weights.bold,
    },
  });

  return (
    <View style={styles.card}>
      <View style={styles.badge}>
        <Sparkles
          color={theme.colors.accentContrast}
          size={14}
          strokeWidth={2}
        />
        <Text style={styles.badgeLabel}>Lectura de hoy</Text>
      </View>
      <Text style={styles.hero}>{heroText}</Text>
      <View style={styles.insights}>
        {insights.slice(0, 2).map(insight => (
          <View key={insight} style={styles.insightRow}>
            <View style={styles.insightDot} />
            <Text numberOfLines={2} style={styles.insightText}>
              {insight}
            </Text>
          </View>
        ))}
      </View>
      <Pressable onPress={onPrimaryAction} style={styles.cta}>
        <Text style={styles.ctaLabel}>Dime qué hacer ahora</Text>
        <ArrowRight color={theme.colors.accent} size={15} strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}
