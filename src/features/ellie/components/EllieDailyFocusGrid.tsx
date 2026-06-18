import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@app/hooks/useAppTheme';

export type EllieDailyFocus = {
  id: string;
  label: string;
  status: string;
  action: string;
  icon: ReactNode;
  attention: 'high' | 'medium' | 'low';
  onPress: () => void;
};

type EllieDailyFocusGridProps = {
  items: EllieDailyFocus[];
};

export function EllieDailyFocusGrid({ items }: EllieDailyFocusGridProps) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    card: {
      width: '48.5%',
      minHeight: 116,
      borderRadius: theme.radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      padding: 12,
      justifyContent: 'space-between',
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    icon: {
      width: 32,
      height: 32,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
    },
    attention: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    high: {
      backgroundColor: theme.colors.textPrimary,
    },
    medium: {
      backgroundColor: theme.colors.textSecondary,
    },
    low: {
      backgroundColor: theme.colors.border,
    },
    label: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 0.9,
      textTransform: 'uppercase',
      marginTop: 9,
    },
    status: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      lineHeight: 18,
      fontWeight: theme.typography.weights.semibold,
      marginTop: 2,
    },
    action: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      marginTop: 7,
    },
  });

  return (
    <View style={styles.grid}>
      {items.map(item => (
        <Pressable
          key={item.id}
          onPress={item.onPress}
          style={({ pressed }) => [
            styles.card,
            pressed ? { opacity: 0.86 } : null,
          ]}
        >
          <View>
            <View style={styles.topRow}>
              <View style={styles.icon}>{item.icon}</View>
              <View style={[styles.attention, styles[item.attention]]} />
            </View>
            <Text style={styles.label}>{item.label}</Text>
            <Text numberOfLines={2} style={styles.status}>
              {item.status}
            </Text>
          </View>
          <Text style={styles.action}>{item.action}</Text>
        </Pressable>
      ))}
    </View>
  );
}
