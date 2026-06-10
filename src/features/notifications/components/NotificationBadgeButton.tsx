import {Bell} from 'lucide-react-native';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useAppTheme} from '@app/hooks/useAppTheme';

type NotificationBadgeButtonProps = {
  count?: number;
  onPress?: () => void;
};

export function NotificationBadgeButton({
  count = 0,
  onPress,
}: NotificationBadgeButtonProps) {
  const {theme} = useAppTheme();
  const hasPending = count > 0;

  const styles = StyleSheet.create({
    button: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hasPending ? theme.colors.textPrimary : theme.colors.border,
    },
    badge: {
      position: 'absolute',
      top: -3,
      right: -3,
      minWidth: 17,
      height: 17,
      borderRadius: 9,
      paddingHorizontal: 4,
      backgroundColor: theme.colors.accent,
      borderWidth: 1,
      borderColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeLabel: {
      color: theme.colors.accentContrast,
      fontFamily: theme.typography.fontFamily,
      fontSize: 9,
      fontWeight: theme.typography.weights.bold,
    },
  });

  return (
    <Pressable onPress={onPress} style={styles.button}>
      <Bell color={theme.colors.textPrimary} size={18} strokeWidth={2.1} />
      {hasPending ? (
        <View style={styles.badge}>
          <Text style={styles.badgeLabel}>{count > 9 ? '9+' : count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
