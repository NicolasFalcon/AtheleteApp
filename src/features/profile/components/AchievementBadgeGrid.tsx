import { useMemo } from 'react';
import type { LucideIcon } from 'lucide-react-native';
import {
  Brain,
  Calendar,
  Droplets,
  Dumbbell,
  FilePenLine,
  Flame,
  Lock,
  Medal,
  Sparkles,
  Trophy,
  Waves,
  Wrench,
} from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@app/hooks/useAppTheme';
import { ALL_BADGES, type BadgeDefinition } from '@app/shared';

export type AchievementFilter = 'all' | 'earned' | 'locked';

type AchievementBadgeGridProps = {
  badges: Array<{ id: string; earnedAt?: string }>;
  filter: AchievementFilter;
  progressById?: Record<string, { current: number; target: number }>;
};

function getBadgeIcon(name: string): LucideIcon {
  switch (name) {
    case 'dumbbell':
      return Dumbbell;
    case 'calendar':
      return Calendar;
    case 'trophy':
      return Trophy;
    case 'flame':
      return Flame;
    case 'utensils':
      return Sparkles;
    case 'wrench':
      return Wrench;
    case 'brain':
      return Brain;
    case 'file-pen':
      return FilePenLine;
    case 'droplets':
      return Droplets;
    case 'waves':
      return Waves;
    case 'medal':
      return Medal;
    default:
      return Sparkles;
  }
}

function AchievementTile({
  badge,
  earned,
  earnedAt,
  progress,
}: {
  badge: BadgeDefinition;
  earned: boolean;
  earnedAt?: string;
  progress?: { current: number; target: number };
}) {
  const { theme } = useAppTheme();
  const Icon = getBadgeIcon(badge.icon);
  const progressPct = progress
    ? Math.min(100, Math.round((progress.current / progress.target) * 100))
    : 0;

  const styles = StyleSheet.create({
    tile: {
      width: '48.5%',
      minHeight: 190,
      borderRadius: theme.radii.md,
      paddingHorizontal: 12,
      paddingVertical: 15,
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      shadowColor: '#000000',
      ...theme.elevations.subtle,
    },
    medalOuter: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: earned
        ? theme.colors.surfaceMuted
        : theme.colors.background,
      borderWidth: 5,
      borderColor: earned ? theme.colors.accent : theme.colors.border,
      marginBottom: 13,
    },
    medalInner: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: earned ? theme.colors.accent : theme.colors.surfaceMuted,
    },
    lockMark: {
      position: 'absolute',
      right: -4,
      bottom: -4,
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    title: {
      minHeight: 38,
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      fontWeight: theme.typography.weights.semibold,
      lineHeight: 18,
      textAlign: 'center',
    },
    status: {
      color: earned ? theme.colors.success : theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.medium,
      lineHeight: 16,
      marginTop: 3,
    },
    description: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      lineHeight: 14,
      textAlign: 'center',
      marginTop: 6,
    },
    progressWrap: {
      width: '100%',
      gap: 5,
      marginTop: 10,
    },
    progressLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
    },
    progressTrack: {
      height: 4,
      borderRadius: 2,
      overflow: 'hidden',
      backgroundColor: theme.colors.surfaceMuted,
    },
    progressFill: {
      height: '100%',
      borderRadius: 2,
      backgroundColor: theme.colors.accent,
    },
  });

  const earnedLabel = earnedAt
    ? `Desbloqueado · ${new Intl.DateTimeFormat('es-CL', {
        day: 'numeric',
        month: 'short',
      }).format(new Date(earnedAt))}`
    : 'Desbloqueado';

  return (
    <View style={styles.tile}>
      <View style={styles.medalOuter}>
        <View style={styles.medalInner}>
          {earned ? (
            <Icon
              color={theme.colors.accentContrast}
              size={23}
              strokeWidth={2}
            />
          ) : (
            <>
              <Icon
                color={theme.colors.textSecondary}
                size={23}
                strokeWidth={1.7}
                opacity={0.42}
              />
              <View style={styles.lockMark}>
                <Lock
                  color={theme.colors.textSecondary}
                  size={11}
                  strokeWidth={2}
                />
              </View>
            </>
          )}
        </View>
      </View>

      <Text numberOfLines={2} style={styles.title}>
        {badge.title}
      </Text>
      <Text style={styles.status}>{earned ? earnedLabel : 'Bloqueado'}</Text>

      {!earned && progress ? (
        <View style={styles.progressWrap}>
          <Text style={styles.progressLabel}>
            {progress.current}/{progress.target}
          </Text>
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${progressPct}%` }]}
            />
          </View>
        </View>
      ) : !earned ? (
        <Text numberOfLines={2} style={styles.description}>
          {badge.description}
        </Text>
      ) : null}
    </View>
  );
}

export function AchievementBadgeGrid({
  badges,
  filter,
  progressById = {},
}: AchievementBadgeGridProps) {
  const earnedMap = useMemo(
    () => new Map(badges.map(badge => [badge.id, badge])),
    [badges],
  );
  const visibleBadges = useMemo(
    () =>
      ALL_BADGES.filter(badge => {
        const earned = earnedMap.has(badge.id);

        if (filter === 'earned') {
          return earned;
        }

        if (filter === 'locked') {
          return !earned;
        }

        return true;
      }).sort((left, right) => {
        const leftEarned = earnedMap.has(left.id);
        const rightEarned = earnedMap.has(right.id);

        if (leftEarned !== rightEarned) {
          return leftEarned ? -1 : 1;
        }

        return left.title.localeCompare(right.title);
      }),
    [earnedMap, filter],
  );
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 10,
    },
    empty: {
      minHeight: 140,
      borderRadius: theme.radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    emptyText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      textAlign: 'center',
    },
  });

  if (visibleBadges.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          No hay badges en esta categoría todavía.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {visibleBadges.map(badge => {
        const earnedBadge = earnedMap.get(badge.id);

        return (
          <AchievementTile
            key={badge.id}
            badge={badge}
            earned={Boolean(earnedBadge)}
            earnedAt={earnedBadge?.earnedAt}
            progress={progressById[badge.id]}
          />
        );
      })}
    </View>
  );
}
