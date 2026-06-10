import { Bell, LogOut, Monitor, Moon, Sun } from 'lucide-react-native';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Card } from '@app/components/ui';
import { useAppTheme } from '@app/hooks/useAppTheme';

type ThemePreference = 'light' | 'dark' | 'system';
type NotificationsState = {
  workouts: boolean;
  hydration: boolean;
  updates: boolean;
};

type ProfilePreferencesCardProps = {
  preferredMode: ThemePreference;
  onChangeMode: (mode: ThemePreference) => void;
  notifications: NotificationsState;
  onToggleNotifications: (patch: Partial<NotificationsState>) => void;
  onSignOut: () => Promise<void> | void;
};

function NotificationRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    row: {
      minHeight: 56,
      borderRadius: theme.radii.sm,
      backgroundColor: theme.colors.background,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    copy: {
      flex: 1,
      gap: 2,
    },
    label: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      fontWeight: theme.typography.weights.medium,
    },
    description: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
    },
  });

  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{
          false: theme.colors.surfaceMuted,
          true: theme.colors.accent,
        }}
        thumbColor={value ? theme.colors.accentContrast : theme.colors.surface}
      />
    </View>
  );
}

export function ProfilePreferencesCard({
  preferredMode,
  onChangeMode,
  notifications,
  onToggleNotifications,
  onSignOut,
}: ProfilePreferencesCardProps) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      padding: 16,
      borderRadius: theme.radii.md,
      gap: 12,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 17,
      fontWeight: theme.typography.weights.bold,
    },
    section: {
      gap: 10,
    },
    rowTitle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },
    rowLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      fontWeight: theme.typography.weights.medium,
    },
    themeSwitch: {
      flexDirection: 'row',
      gap: 3,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radii.sm,
      padding: 4,
    },
    themeOption: {
      flex: 1,
      minHeight: 36,
      borderRadius: theme.radii.xs,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    themeOptionActive: {
      backgroundColor: theme.colors.accent,
    },
    themeLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      fontWeight: theme.typography.weights.medium,
    },
    themeLabelActive: {
      color: theme.colors.accentContrast,
      fontWeight: theme.typography.weights.semibold,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
    },
    notificationsList: {
      gap: 8,
    },
    signOutRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      minHeight: 44,
    },
    signOutLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      fontWeight: theme.typography.weights.medium,
    },
    signOutButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: '#F0CFCF',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
    },
  });

  const options = [
    { key: 'light' as const, label: 'Claro', icon: Sun },
    { key: 'dark' as const, label: 'Oscuro', icon: Moon },
    { key: 'system' as const, label: 'Sistema', icon: Monitor },
  ];

  return (
    <Card style={styles.card}>
      <Text style={styles.sectionTitle}>Preferencias</Text>

      <View style={styles.section}>
        <View style={styles.rowTitle}>
          <Sun color={theme.colors.textSecondary} size={16} strokeWidth={2} />
          <Text style={styles.rowLabel}>Apariencia</Text>
        </View>
        <View style={styles.themeSwitch}>
          {options.map(option => {
            const Icon = option.icon;
            const active = preferredMode === option.key;

            return (
              <Pressable
                key={option.key}
                onPress={() => onChangeMode(option.key)}
                style={({ pressed }) => [
                  styles.themeOption,
                  active ? styles.themeOptionActive : null,
                  pressed ? { opacity: 0.9 } : null,
                ]}
              >
                <Icon
                  color={
                    active
                      ? theme.colors.accentContrast
                      : theme.colors.textSecondary
                  }
                  size={14}
                  strokeWidth={2}
                />
                <Text
                  style={[
                    styles.themeLabel,
                    active ? styles.themeLabelActive : null,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <View style={styles.rowTitle}>
          <Bell color={theme.colors.textSecondary} size={16} strokeWidth={2} />
          <Text style={styles.rowLabel}>Notificaciones</Text>
        </View>
        <View style={styles.notificationsList}>
          <NotificationRow
            label="Recordatorios de entreno"
            description="Avisos para sostener tu semana"
            value={notifications.workouts}
            onChange={value => onToggleNotifications({ workouts: value })}
          />
          <NotificationRow
            label="Recordatorios de agua"
            description="Hidratación y hábitos diarios"
            value={notifications.hydration}
            onChange={value => onToggleNotifications({ hydration: value })}
          />
          <NotificationRow
            label="Tips y novedades"
            description="Mejoras y contenido útil"
            value={notifications.updates}
            onChange={value => onToggleNotifications({ updates: value })}
          />
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.signOutRow}>
        <Text style={styles.signOutLabel}>Cerrar sesión</Text>
        <Pressable
          onPress={onSignOut}
          style={({ pressed }) => [
            styles.signOutButton,
            pressed ? { opacity: 0.82 } : null,
          ]}
        >
          <LogOut color="#D55C5C" size={16} strokeWidth={2} />
        </Pressable>
      </View>
    </Card>
  );
}
