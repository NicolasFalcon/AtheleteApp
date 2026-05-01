import type {LucideIcon} from 'lucide-react-native';
import {ChevronRight} from 'lucide-react-native';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useAppTheme} from '@app/hooks/useAppTheme';

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
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 14,
      borderRadius: 24,
      paddingVertical: 16,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      shadowColor: '#000000',
      ...theme.elevations.card,
    },
    left: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    iconWrap: {
      width: 38,
      height: 38,
      borderRadius: 18,
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
      fontSize: 15,
      fontWeight: theme.typography.weights.semibold,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
    },
  });

  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [styles.row, pressed ? {opacity: 0.88} : null]}>
      <View style={styles.left}>
        <View style={styles.iconWrap}>
          <Icon color={theme.colors.textSecondary} size={16} strokeWidth={2} />
        </View>
        <View style={styles.textGroup}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>
      <ChevronRight color={theme.colors.textSecondary} size={18} strokeWidth={2} />
    </Pressable>
  );
}
