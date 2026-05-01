import {useMemo} from 'react';
import type {LucideIcon} from 'lucide-react-native';
import {
  Brain,
  Calendar,
  Droplets,
  Dumbbell,
  FilePenLine,
  Flame,
  Medal,
  Sparkles,
  Trophy,
  Waves,
  Wrench,
} from 'lucide-react-native';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Card} from '@app/components/ui';
import {useAppTheme} from '@app/hooks/useAppTheme';
import {ALL_BADGES, type BadgeDefinition} from '@app/shared';

type BadgeGridCardProps = {
  badges: Array<{id: string; earnedAt?: string}>;
  previewCount?: number;
  onOpenAll?: () => void;
  embedded?: boolean;
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

function BadgeTile({
  badge,
  earned,
  earnedAt,
}: {
  badge: BadgeDefinition;
  earned: boolean;
  earnedAt?: string;
}) {
  const {theme} = useAppTheme();
  const Icon = getBadgeIcon(badge.icon);

  const styles = StyleSheet.create({
    tile: {
      width: '48%',
      borderRadius: 22,
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: earned ? theme.colors.background : theme.colors.surfaceMuted,
      gap: 10,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
    },
    iconWrap: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: earned ? theme.colors.accent : theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pill: {
      borderRadius: theme.radii.pill,
      paddingHorizontal: 9,
      paddingVertical: 5,
      backgroundColor: earned ? theme.colors.surfaceMuted : theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    pillLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 1.1,
      textTransform: 'uppercase',
    },
    title: {
      color: earned ? theme.colors.textPrimary : theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 15,
      fontWeight: theme.typography.weights.semibold,
      lineHeight: 20,
    },
    helper: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 18,
    },
  });

  const helperLabel = earnedAt
    ? `Desbloqueado ${new Intl.DateTimeFormat('es-CL', {
        day: 'numeric',
        month: 'short',
      }).format(new Date(earnedAt))}`
    : 'Sigue avanzando';

  return (
    <View style={styles.tile}>
      <View style={styles.topRow}>
        <View style={styles.iconWrap}>
          <Icon
            color={earned ? theme.colors.accentContrast : theme.colors.textSecondary}
            size={16}
            strokeWidth={2}
          />
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillLabel}>{earned ? 'Listo' : 'Bloqueado'}</Text>
        </View>
      </View>
      <View>
        <Text style={styles.title}>{badge.title}</Text>
        <Text style={styles.helper}>{helperLabel}</Text>
      </View>
    </View>
  );
}

export function BadgeGridCard({
  badges,
  previewCount = 4,
  onOpenAll,
  embedded = false,
}: BadgeGridCardProps) {
  const {theme} = useAppTheme();

  const {visibleBadges, earnedMap, earnedCount} = useMemo(() => {
    const map = new Map(badges.map(badge => [badge.id, badge]));
    const sorted = [...ALL_BADGES].sort((left, right) => {
      const earnedLeft = map.get(left.id);
      const earnedRight = map.get(right.id);

      if (Boolean(earnedLeft) !== Boolean(earnedRight)) {
        return earnedLeft ? -1 : 1;
      }

      if (earnedLeft?.earnedAt && earnedRight?.earnedAt) {
        return earnedRight.earnedAt.localeCompare(earnedLeft.earnedAt);
      }

      return left.title.localeCompare(right.title);
    });

    return {
      visibleBadges: embedded ? sorted.slice(0, previewCount) : sorted,
      earnedMap: map,
      earnedCount: badges.length,
    };
  }, [badges, embedded, previewCount]);

  const lockedCount = ALL_BADGES.length - earnedCount;

  const styles = StyleSheet.create({
    card: {
      padding: embedded ? 0 : 18,
      borderRadius: 28,
      gap: 16,
      backgroundColor: embedded ? 'transparent' : theme.colors.surface,
      borderWidth: embedded ? 0 : StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      shadowColor: embedded ? 'transparent' : '#000000',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    headerCopy: {
      flex: 1,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: embedded ? 18 : 17,
      fontWeight: theme.typography.weights.bold,
    },
    ghostButton: {
      minHeight: 30,
      paddingHorizontal: 4,
      justifyContent: 'center',
    },
    ghostLabel: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      fontWeight: theme.typography.weights.medium,
    },
    inner: {
      borderRadius: 24,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      padding: 14,
      gap: 14,
    },
    eyebrowRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    eyebrow: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 1.8,
      textTransform: 'uppercase',
    },
    innerTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 16,
      fontWeight: theme.typography.weights.bold,
      marginTop: 3,
    },
    innerCopy: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      lineHeight: 20,
      marginTop: 4,
    },
    countPill: {
      borderRadius: theme.radii.pill,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },
    countLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      fontWeight: theme.typography.weights.medium,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 12,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      borderRadius: 20,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.background,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    footerTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      fontWeight: theme.typography.weights.medium,
      lineHeight: 20,
    },
    footerCopy: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 18,
    },
    footerCta: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      fontWeight: theme.typography.weights.semibold,
    },
  });

  return (
    <Card style={styles.card}>
      {embedded && onOpenAll ? (
        <View style={styles.headerRow}>
          <Text style={styles.sectionTitle}>Logros</Text>
          <Pressable
            onPress={onOpenAll}
            style={({pressed}) => [styles.ghostButton, pressed ? {opacity: 0.8} : null]}>
            <Text style={styles.ghostLabel}>Ver todos</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.inner}>
        <View style={styles.eyebrowRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Logros y badges</Text>
            <Text style={styles.innerTitle}>Hitos desbloqueados</Text>
            <Text style={styles.innerCopy}>
              {earnedCount > 0
                ? 'Mostrando tus logros más recientes primero.'
                : 'Tus próximos hitos aparecerán aquí a medida que avances.'}
            </Text>
          </View>
          <View style={styles.countPill}>
            <Text style={styles.countLabel}>
              {earnedCount}/{ALL_BADGES.length}
            </Text>
          </View>
        </View>

        <View style={styles.grid}>
          {visibleBadges.map(badge => (
            <BadgeTile
              key={badge.id}
              badge={badge}
              earned={Boolean(earnedMap.get(badge.id))}
              earnedAt={earnedMap.get(badge.id)?.earnedAt}
            />
          ))}
        </View>

        {onOpenAll ? (
          <Pressable
            onPress={onOpenAll}
            style={({pressed}) => [styles.footer, pressed ? {opacity: 0.86} : null]}>
            <View>
              <Text style={styles.footerTitle}>{earnedCount} desbloqueados</Text>
              <Text style={styles.footerCopy}>
                {lockedCount} pendientes por conseguir
              </Text>
            </View>
            <Text style={styles.footerCta}>Ver todos los logros</Text>
          </Pressable>
        ) : (
          <View style={styles.footer}>
            <View>
              <Text style={styles.footerTitle}>{earnedCount} desbloqueados</Text>
              <Text style={styles.footerCopy}>
                {lockedCount} pendientes por conseguir
              </Text>
            </View>
          </View>
        )}
      </View>
    </Card>
  );
}
