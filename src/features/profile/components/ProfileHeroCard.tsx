import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Chip } from '@app/components/ui';
import { ProfileAvatar } from '@app/components/profile/ProfileAvatar';
import { useAppTheme } from '@app/hooks/useAppTheme';
import type { AvatarKey } from '@app/types/profileIdentity';

type ProfileHeroCardProps = {
  avatarKey?: AvatarKey | null;
  profilePhotoUrl?: string | null;
  name: string;
  email: string;
  goalLabel: string;
  trainingLabel: string;
  points: number;
  currentStreak: number;
  badgeCount: number;
  onEdit: () => void;
};

function QuickMetric({ label, value }: { label: string; value: string }) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    metric: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    },
    label: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      lineHeight: 15,
      textAlign: 'center',
    },
    value: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 17,
      fontWeight: theme.typography.weights.semibold,
      lineHeight: 22,
    },
  });

  return (
    <View style={styles.metric}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

export function ProfileHeroCard({
  avatarKey,
  profilePhotoUrl,
  name,
  email,
  goalLabel,
  trainingLabel,
  points,
  currentStreak,
  badgeCount,
  onEdit,
}: ProfileHeroCardProps) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    container: {
      gap: 12,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 20,
      fontWeight: theme.typography.weights.bold,
    },
    editButton: {
      minHeight: 32,
      borderRadius: theme.radii.pill,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    editLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      fontWeight: theme.typography.weights.medium,
    },
    summaryCard: {
      borderRadius: theme.radii.md,
      padding: 16,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      shadowColor: '#000000',
      ...theme.elevations.card,
      gap: 12,
    },
    identityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    textBlock: {
      flex: 1,
      minWidth: 0,
      gap: 3,
    },
    name: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 20,
      fontWeight: theme.typography.weights.bold,
    },
    email: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
    },
    chips: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    chipBase: {
      paddingHorizontal: 12,
      minHeight: 30,
    },
    chipMutedSurface: {
      paddingHorizontal: 12,
      minHeight: 30,
      backgroundColor: theme.colors.surfaceMuted,
    },
    chipText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      fontWeight: theme.typography.weights.medium,
    },
    chipMuted: {
      color: theme.colors.textSecondary,
    },
    stats: {
      flexDirection: 'row',
      paddingTop: 13,
      marginTop: 1,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    metricDivider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Perfil</Text>
        <Pressable
          onPress={onEdit}
          style={({ pressed }) => [
            styles.editButton,
            pressed ? { opacity: 0.82 } : null,
          ]}
        >
          <Text style={styles.editLabel}>Editar</Text>
        </Pressable>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.identityRow}>
          <ProfileAvatar
            avatarKey={avatarKey}
            profilePhotoUrl={profilePhotoUrl}
            borderRadius={18}
            size={58}
          />

          <View style={styles.textBlock}>
            <Text numberOfLines={1} style={styles.name}>
              {name || 'Usuario'}
            </Text>
            <Text numberOfLines={1} style={styles.email}>
              {email}
            </Text>
          </View>
        </View>

        <View style={styles.chips}>
          <Chip style={styles.chipBase}>
            <Text numberOfLines={1} style={styles.chipText}>
              {goalLabel}
            </Text>
          </Chip>
          <Chip style={styles.chipMutedSurface}>
            <Text numberOfLines={1} style={[styles.chipText, styles.chipMuted]}>
              {trainingLabel}
            </Text>
          </Chip>
        </View>

        <View style={styles.stats}>
          <QuickMetric
            label="Puntos"
            value={points.toLocaleString('es-CL')}
          />
          <View style={styles.metricDivider} />
          <QuickMetric label="Racha actual" value={`${currentStreak} días`} />
          <View style={styles.metricDivider} />
          <QuickMetric label="Badges" value={String(badgeCount)} />
        </View>
      </View>
    </View>
  );
}
