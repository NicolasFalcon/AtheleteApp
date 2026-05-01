import {Bell} from 'lucide-react-native';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useAuth} from '@app/hooks/useAuth';
import {useAppTheme} from '@app/hooks/useAppTheme';
import {getGreeting} from '@app/lib/date';

function getInitials(name: string) {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

type HomeHeaderProps = {
  onOpenNotifications?: () => void;
};

export function HomeHeader({onOpenNotifications}: HomeHeaderProps) {
  const {profile} = useAuth();
  const {theme} = useAppTheme();
  const displayName = profile?.name?.trim() || 'Athelete';

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    userRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    avatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.accent,
    },
    avatarLabel: {
      color: theme.colors.accentContrast,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      fontWeight: theme.typography.weights.bold,
    },
    eyebrow: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      fontWeight: theme.typography.weights.semibold,
    },
    bellButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.userRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLabel}>{getInitials(displayName)}</Text>
        </View>
        <View>
          <Text style={styles.eyebrow}>{getGreeting()},</Text>
          <Text style={styles.title}>{displayName}</Text>
        </View>
      </View>
      <Pressable onPress={onOpenNotifications} style={styles.bellButton}>
        <Bell color={theme.colors.textPrimary} size={18} strokeWidth={2.1} />
      </Pressable>
    </View>
  );
}
