import { useMemo, useState } from 'react';
import { Medal } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader, ScreenContainer } from '@app/components';
import { EmptyState, Loader } from '@app/components/ui';
import {
  AchievementBadgeGrid,
  type AchievementFilter,
} from '@app/features/profile/components/AchievementBadgeGrid';
import { useProfileOverview } from '@app/hooks/useProfileOverview';
import { useAppTheme } from '@app/hooks/useAppTheme';
import { ALL_BADGES } from '@app/shared';
import { APP_ROUTES } from '@app/constants/routes';

const FILTERS: Array<{ id: AchievementFilter; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'earned', label: 'Desbloqueados' },
  { id: 'locked', label: 'Bloqueados' },
];

export function AchievementsScreen() {
  const { theme } = useAppTheme();
  const overviewQuery = useProfileOverview();
  const [filter, setFilter] = useState<AchievementFilter>('all');

  const badges = overviewQuery.data?.badges || [];
  const earnedCount = badges.length;
  const totalBadges = ALL_BADGES.length;
  const progressPct = Math.round((earnedCount / totalBadges) * 100);
  const progressById = useMemo(
    () => ({
      streak_7_days: {
        current: Math.min(7, overviewQuery.data?.currentStreak || 0),
        target: 7,
      },
      core33_finisher: {
        current: Math.min(
          33,
          overviewQuery.data?.challenge?.completedDays || 0,
        ),
        target: 33,
      },
    }),
    [overviewQuery.data?.challenge?.completedDays, overviewQuery.data?.currentStreak],
  );

  const styles = StyleSheet.create({
    content: {
      gap: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
    },
    summary: {
      borderRadius: theme.radii.md,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      shadowColor: '#000000',
      ...theme.elevations.card,
    },
    summaryIcon: {
      width: 58,
      height: 58,
      borderRadius: 29,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 5,
      borderColor: theme.colors.accent,
    },
    summaryCopy: {
      flex: 1,
    },
    summaryTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 16,
      fontWeight: theme.typography.weights.bold,
    },
    summaryDescription: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 3,
    },
    progressTrack: {
      height: 5,
      marginTop: 10,
      borderRadius: 3,
      overflow: 'hidden',
      backgroundColor: theme.colors.surfaceMuted,
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
      backgroundColor: theme.colors.accent,
    },
    filters: {
      flexDirection: 'row',
      padding: 4,
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.surfaceMuted,
      gap: 4,
    },
    filterButton: {
      flex: 1,
      minHeight: 38,
      borderRadius: theme.radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    filterButtonActive: {
      backgroundColor: theme.colors.accent,
    },
    filterLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.medium,
    },
    filterLabelActive: {
      color: theme.colors.accentContrast,
      fontWeight: theme.typography.weights.semibold,
    },
  });

  if (overviewQuery.isLoading) {
    return (
      <ScreenContainer>
        <Loader label="Cargando logros..." />
      </ScreenContainer>
    );
  }

  if (overviewQuery.error) {
    return (
      <ScreenContainer>
        <AppHeader
          showBackButton
          title="Logros"
          backFallbacks={[APP_ROUTES.Profile]}
        />
        <EmptyState
          title="No pudimos cargar tus logros"
          description="Vuelve a intentarlo en un momento."
          actionLabel="Reintentar"
          onAction={() => overviewQuery.refetch()}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable contentContainerStyle={styles.content}>
      <AppHeader
        showBackButton
        title="Logros"
        backFallbacks={[APP_ROUTES.Profile]}
      />

      <View style={styles.summary}>
        <View style={styles.summaryIcon}>
          <Medal
            color={theme.colors.textPrimary}
            size={24}
            strokeWidth={2}
          />
        </View>
        <View style={styles.summaryCopy}>
          <Text style={styles.summaryTitle}>
            {earnedCount}/{totalBadges} badges desbloqueados
          </Text>
          <Text style={styles.summaryDescription}>
            Sigue así, cada paso suma.
          </Text>
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${progressPct}%` }]}
            />
          </View>
        </View>
      </View>

      <View style={styles.filters}>
        {FILTERS.map(option => {
          const active = filter === option.id;

          return (
            <Pressable
              key={option.id}
              onPress={() => setFilter(option.id)}
              style={({ pressed }) => [
                styles.filterButton,
                active ? styles.filterButtonActive : null,
                pressed ? { opacity: 0.82 } : null,
              ]}
            >
              <Text
                style={[
                  styles.filterLabel,
                  active ? styles.filterLabelActive : null,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <AchievementBadgeGrid
        badges={badges}
        filter={filter}
        progressById={progressById}
      />
    </ScreenContainer>
  );
}
