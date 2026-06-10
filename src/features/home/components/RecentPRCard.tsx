import { ChevronRight, Plus, Trophy } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@app/hooks/useAppTheme';
import { formatPRValue, type PersonalRecord } from '@app/shared';

type RecentPRCardProps = {
  record: PersonalRecord | null;
  exerciseName: string | null;
  onOpen: () => void;
  onRegister: () => void;
};

function formatRelativeTime(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime();
  const days = Math.floor(diff / 86400000);

  if (days <= 0) {
    return 'Hoy';
  }

  if (days === 1) {
    return 'Ayer';
  }

  if (days < 7) {
    return `Hace ${days} días`;
  }

  if (days < 30) {
    return `Hace ${Math.floor(days / 7)} sem`;
  }

  const months = Math.floor(days / 30);
  return `Hace ${months} mes${months > 1 ? 'es' : ''}`;
}

export function RecentPRCard({
  record,
  exerciseName,
  onOpen,
  onRegister,
}: RecentPRCardProps) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    shell: {
      borderRadius: theme.radii.md,
      overflow: 'hidden',
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      shadowColor: '#000000',
      ...theme.elevations.card,
    },
    topRow: {
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    iconBox: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      flex: 1,
      gap: 2,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 16,
      fontWeight: theme.typography.weights.semibold,
      flexShrink: 1,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 16,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
    },
    footerButton: {
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    footerLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      fontWeight: theme.typography.weights.semibold,
    },
    timeLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
    },
  });

  return (
    <View style={styles.shell}>
      <Pressable
        onPress={onOpen}
        style={({ pressed }) => [
          styles.topRow,
          pressed ? { opacity: 0.94 } : null,
        ]}
      >
        <View style={styles.iconBox}>
          <Trophy
            color={theme.colors.textPrimary}
            size={22}
            strokeWidth={2.1}
          />
        </View>
        <View style={styles.content}>
          {record ? (
            <>
              <View style={styles.titleRow}>
                <Text numberOfLines={1} style={styles.title}>
                  🏆 {exerciseName || 'Récord personal'}
                </Text>
                <Text style={styles.timeLabel}>
                  {formatRelativeTime(record.recordedAt)}
                </Text>
              </View>
              <Text numberOfLines={1} style={styles.subtitle}>
                {formatPRValue(record)}
                {record.notes ? ` · ${record.notes}` : ''}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.title}>Récords personales</Text>
              <Text numberOfLines={2} style={styles.subtitle}>
                Registra tu primer PR y empieza a trackear tu progreso.
              </Text>
            </>
          )}
        </View>
        <ChevronRight color={theme.colors.textSecondary} size={18} />
      </Pressable>
      <View style={styles.divider} />
      <Pressable
        onPress={onRegister}
        style={({ pressed }) => [
          styles.footerButton,
          pressed ? { opacity: 0.88 } : null,
        ]}
      >
        <Plus color={theme.colors.textPrimary} size={20} strokeWidth={2.2} />
        <Text style={styles.footerLabel}>Registrar nuevo PR</Text>
      </Pressable>
    </View>
  );
}
