import { StyleSheet, Text, View } from 'react-native';
import { ProfileAvatar } from '@app/components/profile/ProfileAvatar';
import { NotificationBadgeButton } from '@app/features/notifications/components/NotificationBadgeButton';
import { useAuth } from '@app/hooks/useAuth';
import { useAppTheme } from '@app/hooks/useAppTheme';
import { getGreeting } from '@app/lib/date';

type HomeHeaderProps = {
  onOpenNotifications?: () => void;
  notificationsCount?: number;
};

export function HomeHeader({
  onOpenNotifications,
  notificationsCount = 0,
}: HomeHeaderProps) {
  const { profile } = useAuth();
  const { theme } = useAppTheme();
  const displayName = profile?.name?.trim() || 'Athelete';

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
      minHeight: 44,
    },
    userRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    copy: {
      flex: 1,
      gap: 1,
    },
    eyebrow: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      fontWeight: theme.typography.weights.semibold,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.userRow}>
        <ProfileAvatar
          avatarKey={profile?.avatarKey}
          profilePhotoUrl={profile?.profilePhotoUrl}
          size={40}
        />
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>{getGreeting()},</Text>
          <Text numberOfLines={1} style={styles.title}>
            {displayName}
          </Text>
        </View>
      </View>
      <NotificationBadgeButton
        count={notificationsCount}
        onPress={onOpenNotifications}
      />
    </View>
  );
}
