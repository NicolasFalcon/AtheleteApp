import { ArrowRight, Plus, Trophy } from 'lucide-react-native';
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
      flex: 1,
      minHeight: 164,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      shadowColor: '#000000',
      ...theme.elevations.card,
    },
    topRow: {
      flex: 1,
      padding: theme.spacing.sm,
      gap: theme.spacing.xs,
    },
    iconBox: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      flex: 1,
      gap: 4,
    },
    titleRow: {
      gap: 2,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      fontWeight: theme.typography.weights.semibold,
      flexShrink: 1,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 16,
    },
    footerButton: {
      marginHorizontal: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
      paddingVertical: 7,
      paddingHorizontal: 9,
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.surfaceMuted,
      alignSelf: 'flex-start',
      flexDirection: 'row',
      gap: 6,
    },
    footerLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.semibold,
    },
    timeLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
    },
    openHint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    openHintLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.medium,
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
            size={19}
            strokeWidth={2.1}
          />
        </View>
        <View style={styles.content}>
          {record ? (
            <>
              <View style={styles.titleRow}>
                <Text numberOfLines={1} style={styles.title}>
                  {exerciseName || 'Récord personal'}
                </Text>
                <Text style={styles.timeLabel}>
                  {formatRelativeTime(record.recordedAt)}
                </Text>
              </View>
              <Text numberOfLines={1} style={styles.subtitle}>
                {formatPRValue(record)}
                {record.notes ? ` · ${record.notes}` : ''}
              </Text>
              <View style={styles.openHint}>
                <Text style={styles.openHintLabel}>Ver progreso</Text>
                <ArrowRight color={theme.colors.textSecondary} size={12} />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.title}>Récords personales</Text>
              <Text numberOfLines={2} style={styles.subtitle}>
                Guarda tu mejor marca y úsala como referencia.
              </Text>
              <View style={styles.openHint}>
                <Text style={styles.openHintLabel}>Ver historial</Text>
                <ArrowRight color={theme.colors.textSecondary} size={12} />
              </View>
            </>
          )}
        </View>
      </Pressable>
      <Pressable
        onPress={onRegister}
        style={({ pressed }) => [
          styles.footerButton,
          pressed ? { opacity: 0.88 } : null,
        ]}
      >
        <Plus color={theme.colors.textPrimary} size={16} strokeWidth={2.2} />
        <Text style={styles.footerLabel}>Registrar PR</Text>
      </Pressable>
    </View>
  );
}
