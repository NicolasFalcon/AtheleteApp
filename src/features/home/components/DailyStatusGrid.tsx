import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@app/hooks/useAppTheme';

export type DailyStatusItem = {
  key: string;
  label: string;
  value: string;
  detail: string;
  progress: number;
  Icon: LucideIcon;
  onPress: () => void;
  disabled?: boolean;
};

type DailyStatusGridProps = {
  items: DailyStatusItem[];
};

export function DailyStatusGrid({ items }: DailyStatusGridProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.grid}>
      {items.map(item => (
        <Pressable
          accessibilityRole="button"
          disabled={item.disabled}
          key={item.key}
          onPress={item.onPress}
          style={({ pressed }) => [
            styles.card,
            pressed ? styles.pressed : null,
            item.disabled ? styles.disabled : null,
          ]}
        >
          <View style={styles.topRow}>
            <View style={styles.iconBox}>
              <item.Icon
                color={theme.colors.textPrimary}
                size={16}
                strokeWidth={2.1}
              />
            </View>
            <Text style={styles.value}>{item.value}</Text>
          </View>
          <View style={styles.copy}>
            <Text style={styles.label}>{item.label}</Text>
            <Text numberOfLines={1} style={styles.detail}>
              {item.detail}
            </Text>
          </View>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                { width: `${Math.min(100, Math.max(0, item.progress))}%` },
              ]}
            />
          </View>
        </Pressable>
      ))}
    </View>
  );
}

type Theme = ReturnType<typeof useAppTheme>['theme'];

function createStyles(theme: Theme) {
  return StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    card: {
      width: '48.2%',
      minHeight: 112,
      borderRadius: theme.radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.sm,
      justifyContent: 'space-between',
      gap: theme.spacing.xs,
      shadowColor: '#000000',
      ...theme.elevations.subtle,
    },
    pressed: {
      opacity: 0.86,
    },
    disabled: {
      opacity: 0.55,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.xs,
    },
    iconBox: {
      width: 30,
      height: 30,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
    },
    value: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      fontWeight: theme.typography.weights.bold,
    },
    copy: {
      gap: 1,
    },
    label: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      fontWeight: theme.typography.weights.semibold,
    },
    detail: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
    },
    track: {
      height: 3,
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.surfaceMuted,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.textPrimary,
    },
  });
}
