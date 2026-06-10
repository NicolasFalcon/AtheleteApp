import type { LucideIcon } from 'lucide-react-native';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@app/hooks/useAppTheme';

type ProfileQuickLinkRowProps = {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  onPress: () => void;
};

export function ProfileQuickLinkRow({
  icon: Icon,
  title,
  subtitle,
  onPress,
}: ProfileQuickLinkRowProps) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      borderRadius: theme.radii.sm,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.surface,
    },
    left: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: theme.radii.sm,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textGroup: {
      flex: 1,
      gap: 2,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      fontWeight: theme.typography.weights.semibold,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
    },
  });

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed ? { opacity: 0.88 } : null]}
    >
      <View style={styles.left}>
        <View style={styles.iconWrap}>
          <Icon color={theme.colors.textSecondary} size={16} strokeWidth={2} />
        </View>
        <View style={styles.textGroup}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>
      <ChevronRight
        color={theme.colors.textSecondary}
        size={18}
        strokeWidth={2}
      />
    </Pressable>
  );
}
