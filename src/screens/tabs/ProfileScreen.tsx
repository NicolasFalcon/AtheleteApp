import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SlidersHorizontal } from 'lucide-react-native';
import {
  BackButton,
  IconButton,
  PressableScale,
  Skeleton,
  SkeletonGroup,
  StatusBarV2,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { APP_ROUTES, ROOT_ROUTES, TAB_ROUTES } from '@app/constants/routes';
import { useOpenCore33 } from '@app/features/core33/useOpenCore33';
import { ELLIE_ASKS } from '@app/features/ellie/chatModel';
import { useOpenEllieChat } from '@app/features/ellie/useOpenEllieChat';
import { BlockError } from '@app/features/home/v2/BlockError';
import {
  buildShelves,
  type ShelfItem,
} from '@app/features/progress/badgesModel';
import { BadgeSheet } from '@app/features/progress/v2/AchievementViews';
import { formatRecord } from '@app/features/progress/recordsModel';
import {
  buildTimeline,
  formatThousands,
  goalLabel,
  hasOnboardingData,
  heroLine,
  memberSince,
  trainingLine,
} from '@app/features/profile/profileModel';
import {
  PlanGrid,
  Portrait,
  Showcase,
  StatsTrio,
  Timeline,
} from '@app/features/profile/v2/ProfileViews';
import { useAuth } from '@app/hooks/useAuth';
import { useBadgeShelves } from '@app/hooks/useBadgeShelves';
import { useExerciseLibrary } from '@app/hooks/useExerciseLibrary';
import { usePersonalRecords } from '@app/hooks/usePersonalRecords';
import { useProfilePhotoUri } from '@app/hooks/useProfilePhotoUri';
import { useProfileStats } from '@app/hooks/useProfileStats';
import { safeGoBack } from '@app/navigation/safeGoBack';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'Profile'>;

const BACK_FALLBACKS = [ROOT_ROUTES.MainTabs];
const HERO_HEIGHT = 460;

// Perfil propio (PROFILE_01): the portrait with Editar and Ajustes, the
// figures, the medal showcase (→ Logros), the trajectory and the plan. Opened
// from the avatar; it has a back button and no tab bar.
export function ProfileScreen({ navigation, route }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const { profile: realProfile } = useAuth();
  const openEllieChat = useOpenEllieChat();
  const openCore33 = useOpenCore33();
  const dev = __DEV__ ? route.params?.devState : undefined;
  const now = useMemo(() => new Date(), []);

  const badges = useBadgeShelves();
  const stats = useProfileStats();
  const recordsQuery = usePersonalRecords();
  const library = useExerciseLibrary();
  const [selected, setSelected] = useState<ShelfItem | null>(null);

  const sample = useMemo(() => {
    if (!__DEV__ || (dev !== 'data' && dev !== 'new')) {
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fixtures = require('@app/dev/profileFixtures') as typeof import('@app/dev/profileFixtures');
    return {
      profile: dev === 'new' ? fixtures.FIXTURE_NEW_PROFILE : fixtures.FIXTURE_PROFILE,
      data: dev === 'new' ? null : fixtures.profileDevData(now),
    };
  }, [dev, now]);

  const profile = sample ? sample.profile : realProfile;
  const photo = useProfilePhotoUri(profile?.profilePhotoUrl);

  // Medals: from the real data or the dev sample.
  const shelves = useMemo(() => {
    if (sample) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const fixtures = require('@app/dev/progressFixtures') as typeof import('@app/dev/progressFixtures');
      return buildShelves(sample.data ? fixtures.badgeRowsFixture(now) : []);
    }
    return badges;
  }, [badges, now, sample]);

  const items = shelves.shelves.flatMap(shelf => shelf.items);
  const earned = items
    .filter(item => item.earned)
    .sort((a, b) => (b.earnedAt ?? '').localeCompare(a.earnedAt ?? ''));
  const next =
    items
      .filter(item => !item.earned && item.progress)
      .sort((a, b) => (b.progress?.ratio ?? 0) - (a.progress?.ratio ?? 0))[0] ?? null;

  const names = useMemo(() => {
    const byId: Record<string, string> = sample?.data?.exerciseNames ?? {};
    (library.data ?? []).forEach(exercise => {
      byId[exercise.id] = exercise.name;
    });
    return byId;
  }, [library.data, sample]);
  const records = sample ? sample.data?.records ?? [] : recordsQuery.data ?? [];
  const firstSession = sample ? sample.data?.firstSession ?? null : stats.data?.firstSession ?? null;

  const timeline = buildTimeline({
    badges: earned.map(item => ({
      id: item.badge.id,
      title: item.badge.title,
      subtitle: item.badge.description,
      earnedAt: item.earnedAt,
    })),
    records: records.slice(0, 6).map(record => {
      const value = formatRecord(record);
      return {
        id: record.id,
        at: record.recordedAt,
        title: `${names[record.exerciseId] ?? 'Récord'} · ${value.value} ${value.unit}`,
        subtitle: 'Récord personal',
      };
    }),
    firstSession,
    now,
  });

  const loading =
    dev === 'loading' ||
    (!dev && (!realProfile || badges.isLoading || stats.isLoading));
  const failed =
    dev === 'error' ||
    (!dev && Boolean(badges.error || stats.error));
  const retry = () => {
    badges.refetchAll().catch(() => {});
    stats.refetch().catch(() => {});
  };

  const sessions = sample ? sample.data?.sessionsCount ?? 0 : stats.data?.sessions ?? 0;
  const points = sample ? sample.data?.points ?? 0 : badges.overview?.points ?? 0;
  const streak = sample ? sample.data?.streak ?? 0 : badges.overview?.currentStreak ?? 0;
  const complete = profile ? hasOnboardingData(profile) : false;

  const planItems = profile
    ? [
        {
          title: 'Objetivo',
          value: profile.goal ? goalLabel(profile.goal) : 'Sin objetivo',
          onPress: () => navigation.navigate(APP_ROUTES.EditProfile),
        },
        {
          title: 'Semana',
          value: trainingLine(profile.trainingDaysPerWeek, profile.preferredSessionMinutes),
          onPress: () =>
            navigation.navigate(ROOT_ROUTES.MainTabs, { screen: TAB_ROUTES.Workouts }),
        },
        {
          title: 'Nutrición',
          value: badges.overview?.nutritionPlan
            ? `${badges.overview.nutritionPlan.targetCalories.toLocaleString('es-ES')} kcal/día`
            : 'Crear con ELLIE',
          onPress: () =>
            badges.overview?.nutritionPlan
              ? navigation.navigate(APP_ROUTES.NutritionPlan)
              : openEllieChat(ELLIE_ASKS.nutritionPlan),
        },
        {
          title: 'Core 33',
          value: badges.overview?.challenge
            ? badges.overview.challenge.status === 'completed'
              ? 'Completado'
              : `Día ${badges.overview.challenge.challengeDay} de 33`
            : 'Descubrir',
          onPress: openCore33,
        },
      ]
    : [];

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <View style={[styles.hero, { backgroundColor: '#141312' }]}>
          <Portrait uri={photo} />
          <LinearGradient
            colors={['rgba(20,19,18,.45)', 'rgba(20,19,18,0)', 'rgba(20,19,18,.25)', '#141312']}
            locations={[0, 0.3, 0.55, 0.94]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={[styles.topBar, { top: insets.top + 8 }]}>
            <BackButton variant="glass" onPress={() => safeGoBack(navigation, BACK_FALLBACKS)} />
            <View style={styles.topRight}>
              <PressableScale
                accessibilityRole="button"
                onPress={() => navigation.navigate(APP_ROUTES.EditProfile)}
                style={styles.editPill}
              >
                <TextV2 variant="bodyStrong" color="#FFFFFF">
                  Editar
                </TextV2>
              </PressableScale>
              <IconButton
                icon={SlidersHorizontal}
                variant="glass"
                accessibilityLabel="Ajustes"
                onPress={() => navigation.navigate(APP_ROUTES.Settings)}
              />
            </View>
          </View>
          <View style={styles.heroText}>
            {profile && memberSince(profile.createdAt) ? (
              <TextV2 variant="eyebrow" color="#A8A6A1">
                {memberSince(profile.createdAt)}
              </TextV2>
            ) : null}
            <TextV2 variant="title28" color="#FFFFFF" numberOfLines={1} accessibilityRole="header">
              {profile?.name || ' '}
            </TextV2>
            {profile && complete ? (
              <TextV2 variant="body" color="#D8D6D1">
                {heroLine(profile.goal, profile.trainingDaysPerWeek)}
              </TextV2>
            ) : null}
          </View>
        </View>

        <View style={[styles.sheet, { backgroundColor: colors.bg, paddingHorizontal: layout.gutter }]}>
          {failed ? (
            <BlockError message="No pudimos cargar tu perfil." onRetry={retry} />
          ) : loading ? (
            <SkeletonGroup>
              <View style={styles.skeleton}>
                <Skeleton height={44} radius={10} />
                <Skeleton width={120} height={22} radius={11} />
                <Skeleton height={130} radius={20} />
                <Skeleton width={160} height={22} radius={11} />
                <Skeleton height={180} radius={16} />
              </View>
            </SkeletonGroup>
          ) : !complete ? (
            <View style={styles.incomplete}>
              <TextV2 variant="title22">Completa tu perfil</TextV2>
              <TextV2 variant="body" tone="secondary">
                Aún faltan tus datos del onboarding: objetivo, fecha de nacimiento, peso y altura.
                Con ellos ELLIE y tus rutinas se ajustan a ti.
              </TextV2>
              <PressableScale
                accessibilityRole="button"
                onPress={() => navigation.navigate(APP_ROUTES.EditProfile)}
                style={[styles.complete, { backgroundColor: colors.cta.primary }]}
              >
                <TextV2 variant="cta" color={colors.cta.primaryText}>
                  Completar datos
                </TextV2>
              </PressableScale>
            </View>
          ) : (
            <>
              <StatsTrio
                sessions={String(sessions)}
                streak={String(streak)}
                points={formatThousands(points)}
              />
              <Showcase
                earned={earned.slice(0, 3)}
                next={next}
                total={shelves.total}
                earnedCount={shelves.earnedCount}
                onOpenAll={() => navigation.navigate(APP_ROUTES.Achievements)}
                onOpen={setSelected}
              />
              <View style={styles.trajectory}>
                <TextV2 variant="section">Tu trayectoria</TextV2>
                <Timeline entries={timeline} now={now} />
              </View>
              <PlanGrid items={planItems} />
              <PressableScale
                accessibilityRole="button"
                onPress={() => navigation.navigate(APP_ROUTES.Settings)}
                style={styles.settingsLink}
              >
                <TextV2 variant="bodyStrong">Ajustes y cuenta ›</TextV2>
              </PressableScale>
            </>
          )}
        </View>
      </ScrollView>
      <BadgeSheet item={selected} onClose={() => setSelected(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  hero: { height: HERO_HEIGHT, overflow: 'hidden' },
  topBar: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  editPill: { height: 40, paddingHorizontal: 16, borderRadius: 20, backgroundColor: 'rgba(255,255,255,.14)', alignItems: 'center', justifyContent: 'center' },
  heroText: { position: 'absolute', left: 20, right: 20, bottom: 56, gap: 6 },
  sheet: { marginTop: -28, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 26, gap: 32 },
  skeleton: { gap: 22 },
  incomplete: { gap: 14, paddingBottom: 24 },
  complete: { height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  trajectory: { gap: 14 },
  settingsLink: { paddingVertical: 4 },
});
