import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@app/components/ui';
import { useAppTheme } from '@app/hooks/useAppTheme';

type EllieActionPromptCardProps = {
  icon: ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
};

export function EllieActionPromptCard({
  icon,
  title,
  subtitle,
  onPress,
}: EllieActionPromptCardProps) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      padding: 12,
      borderRadius: theme.radii.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    iconWrap: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 15,
      fontWeight: theme.typography.weights.bold,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 3,
    },
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: theme.radii.pill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.background,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginLeft: 4,
    },
    ctaLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.medium,
    },
  });

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>{icon}</View>
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.cta,
            pressed ? { opacity: 0.86 } : null,
          ]}
        >
          <Text style={styles.ctaLabel}>Abrir en chat</Text>
          <ChevronRight color={theme.colors.textSecondary} size={15} />
        </Pressable>
      </View>
    </Card>
  );
}
