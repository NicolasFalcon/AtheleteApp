import {ChevronRight} from 'lucide-react-native';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useAppTheme} from '@app/hooks/useAppTheme';
import {NotificationIcon} from '@app/features/notifications/components/NotificationIcon';
import type {ProductNotification} from '@app/features/notifications/types';

type NotificationItemRowProps = {
  notification: ProductNotification;
  onPress: () => void;
};

export function NotificationItemRow({
  notification,
  onPress,
}: NotificationItemRowProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    row: {
      borderRadius: 24,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: notification.unread
        ? theme.colors.textPrimary
        : theme.colors.border,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      shadowColor: '#000000',
      ...theme.elevations.card,
    },
    iconWrap: {
      width: 42,
      height: 42,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        notification.tone === 'positive'
          ? theme.colors.accent
          : theme.colors.surfaceMuted,
    },
    content: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    unreadDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: theme.colors.textPrimary,
    },
    context: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 15,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: -0.2,
    },
    summary: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 17,
    },
    action: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      fontWeight: theme.typography.weights.semibold,
    },
  });

  const iconColor =
    notification.tone === 'positive'
      ? theme.colors.accentContrast
      : theme.colors.textPrimary;

  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [styles.row, pressed ? {opacity: 0.9} : null]}>
      <View style={styles.iconWrap}>
        <NotificationIcon
          name={notification.icon}
          color={iconColor}
          size={18}
        />
      </View>
      <View style={styles.content}>
        <View style={styles.metaRow}>
          {notification.unread ? <View style={styles.unreadDot} /> : null}
          <Text style={styles.context}>{notification.contextLabel}</Text>
        </View>
        <Text numberOfLines={1} style={styles.title}>
          {notification.title}
        </Text>
        <Text numberOfLines={2} style={styles.summary}>
          {notification.summary}
        </Text>
        <Text style={styles.action}>{notification.actionLabel}</Text>
      </View>
      <ChevronRight color={theme.colors.textSecondary} size={18} strokeWidth={2} />
    </Pressable>
  );
}
