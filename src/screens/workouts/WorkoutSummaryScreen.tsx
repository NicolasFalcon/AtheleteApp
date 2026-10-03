import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { Check, Trophy } from 'lucide-react-native';
import {
  Button,
  EllieSurface,
  Eyebrow,
  GlassSurface,
  HexMedal,
  PressableScale,
  Sheet,
  Skeleton,
  SkeletonGroup,
  StatusBarV2,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { ROOT_ROUTES, TAB_ROUTES, APP_ROUTES } from '@app/constants/routes';
import { badgeIcon } from '@app/features/gamification/badgeIcons';
import { BlockError } from '@app/features/home/v2/BlockError';
import { HOME_PHOTOS } from '@app/features/home/v2/homePhotos';
import { formatDuration, formatKg } from '@app/features/session/sessionModel';
import { useAuth } from '@app/hooks/useAuth';
import { useEllieData } from '@app/hooks/useEllieData';
import { useExerciseLibrary } from '@app/hooks/useExerciseLibrary';
import { invalidatePersonalRecordQueries } from '@app/lib/queryInvalidation';
import {
  detectSessionPRs,
  fetchSessionDetail,
  registerSessionPRs,
  type DetectedPR,
  type SessionDetail,
} from '@app/services/supabase/session';
import { ALL_BADGES } from '@app/shared';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'WorkoutSummary'>;

// __DEV__ preview (athelete://dev/session?screen=summary without a completed
// session): the prototype's figures, no reads or writes.
function devPreviewDetail(): SessionDetail {
  const endedAt = Date.now();
  const startedAt = endedAt - 42 * 60 * 1000;
  return {
    session: {
      id: 'dev',
      workoutId: '',
      workoutTitle: 'Total Body Dumbbell',
      userId: 'dev',
      date: '',
      completed: true,
      duration: 42,
      caloriesBurned: 280,
      status: 'completed',
      startedAt: new Date(startedAt).toISOString(),
      endedAt: new Date(endedAt).toISOString(),
      completedExercises: ['1', '2', '3', '4', '5', '6'],
      totalExercises: 6,
    },
    clock: { startedAt, pausedTotalSec: 0, pausedAt: null },
    volumeKg: 6240,
    sets: Array.from({ length: 18 }, (_, index) => ({
      position: Math.floor(index / 3),
      setIndex: index % 3,
      reps: 10,
      weightKg: 16,
      durationSec: null,
    })),
  };
}

const DEV_PRS: DetectedPR[] = [
  {
    sessionSetId: 'dev',
    exerciseId: 'dev',
    prType: 'max_weight',
    valueWeight: 32,
    valueReps: 8,
    previousWeight: 28,
    previousReps: 8,
  },
];

const HERO_HEIGHT = 400;

// Real session time: wall time minus pauses (falls back to the stored
// minutes for legacy rows).
function realSeconds(params: {
  startedAt: number;
  endedAt: string | null;
  pausedTotalSec: number;
  durationMin: number;
}): number {
  if (!params.endedAt) {
    return params.durationMin * 60;
  }
  const wall = (new Date(params.endedAt).getTime() - params.startedAt) / 1000;
  const real = wall - params.pausedTotalSec;
  return real > 0 ? real : params.durationMin * 60;
}

function prValue(record: DetectedPR): string {
  if (record.prType === 'max_reps') {
    return `${record.valueReps ?? 0} reps`;
  }
  const kg = formatKg(record.valueWeight) ?? '—';
  return record.prType === 'weight_reps' && record.valueReps
    ? `${kg} × ${record.valueReps}`
    : kg;
}

// Resumen de cierre v2 (SESSION_07): photo hero with the Ember check, real
// figures (duration without pauses, volume from the server, sets), the badge
// unlocked by workout_completed, ELLIE and "Registrar récord" when
// detect_session_prs finds new marks. Without Apple Health (SESSION_08) and
// without "Compartir" (Comunidad pending).
export function WorkoutSummaryScreen({ navigation, route }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const userId = profile?.id;
  const { sessionId, newBadges: badgeIds = [] } = route.params;
  const devPreview = __DEV__ && Boolean(route.params.devPreview);
  const newBadges = devPreview ? ['week_consistency'] : badgeIds;
  const ellie = useEllieData();
  // ELLIE's line must already count this session.
  useEffect(() => {
    ellie.overviewQuery.refetch().catch(() => {});
    // Once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const exercisesQuery = useExerciseLibrary();
  const [prSheetOpen, setPrSheetOpen] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registeredCount, setRegisteredCount] = useState<number | null>(null);
  const [registerError, setRegisterError] = useState(false);

  const detailQuery = useQuery({
    queryKey: ['session-summary', sessionId, devPreview],
    queryFn: () =>
      devPreview ? Promise.resolve(devPreviewDetail()) : fetchSessionDetail(sessionId),
  });
  const prsQuery = useQuery({
    queryKey: ['session-prs', sessionId, devPreview],
    queryFn: () =>
      devPreview ? Promise.resolve(DEV_PRS) : detectSessionPRs(sessionId),
  });

  const done = () =>
    navigation.navigate(ROOT_ROUTES.MainTabs, { screen: TAB_ROUTES.Home });

  const exerciseName = useCallback(
    (exerciseId: string) =>
      exercisesQuery.data?.find(item => item.id === exerciseId)?.name ??
      (devPreview ? 'Press de banca con mancuernas' : 'Ejercicio'),
    [devPreview, exercisesQuery.data],
  );

  const records = useMemo(() => prsQuery.data ?? [], [prsQuery.data]);
  const badge = useMemo(
    () => ALL_BADGES.find(item => item.id === newBadges[0]) ?? null,
    // newBadges comes from the params (stable per screen).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [newBadges[0]],
  );

  const register = async () => {
    if (devPreview) {
      setRegisteredCount(records.length);
      setPrSheetOpen(false);
      return;
    }
    if (!userId || records.length === 0) {
      return;
    }
    setRegistering(true);
    setRegisterError(false);
    try {
      const count = await registerSessionPRs({ userId, sessionId, records });
      setRegisteredCount(count || records.length);
      setPrSheetOpen(false);
      await invalidatePersonalRecordQueries(queryClient, userId);
      prsQuery.refetch().catch(() => {});
    } catch (error) {
      console.warn('[summary] No se pudieron registrar los récords.', error);
      setRegisterError(true);
    } finally {
      setRegistering(false);
    }
  };

  const detail = detailQuery.data;
  const footerHeight = 56 + 8 + 48 + 12 + Math.max(insets.bottom, 16) + 4;

  let sheet: React.ReactNode;
  if (detailQuery.error) {
    sheet = (
      <BlockError
        message="No pudimos cargar el resumen."
        onRetry={() => {
          detailQuery.refetch().catch(() => {});
        }}
      />
    );
  } else if (!detail) {
    sheet = (
      <SkeletonGroup>
        <View style={styles.trio}>
          {[0, 1, 2].map(index => (
            <View key={index} style={styles.trioItem}>
              <Skeleton width={64} height={28} />
              <Skeleton width={56} height={12} />
            </View>
          ))}
        </View>
      </SkeletonGroup>
    );
  } else {
    const seconds = realSeconds({
      startedAt: detail.clock.startedAt,
      endedAt: detail.session.endedAt,
      pausedTotalSec: detail.clock.pausedTotalSec,
      durationMin: detail.session.duration,
    });
    const volume = detail.volumeKg;
    const setsCount = detail.sets.length;
    sheet = (
      <>
        <View style={styles.trio}>
          <TrioItem value={formatDuration(seconds)} label="Duración" />
          <View style={[styles.trioDivider, { backgroundColor: colors.divider }]} />
          {volume !== null ? (
            <TrioItem
              value={`${Math.round(volume).toLocaleString('es-ES')}`}
              label="kg de volumen"
            />
          ) : (
            <TrioItem
              value={String(detail.session.caloriesBurned)}
              label="kcal estimadas"
            />
          )}
          <View style={[styles.trioDivider, { backgroundColor: colors.divider }]} />
          <TrioItem value={String(setsCount)} label={setsCount === 1 ? 'Serie' : 'Series'} />
        </View>

        {badge ? (
          <View style={[styles.badgeRow, { borderColor: colors.divider }]}>
            <HexMedal icon={badgeIcon(badge.icon)} size={58} />
            <View style={styles.badgeTexts}>
              <Eyebrow>Logro desbloqueado</Eyebrow>
              <TextV2 variant="cta">{badge.title}</TextV2>
              <TextV2 variant="meta" tone="secondary">
                {badge.description}
              </TextV2>
            </View>
          </View>
        ) : null}

        {registeredCount ? (
          <View style={[styles.badgeRow, { borderColor: colors.divider }]}>
            <View style={[styles.prIcon, { backgroundColor: colors.ember.base }]}>
              <Trophy size={22} color="#FFFFFF" strokeWidth={2} />
            </View>
            <View style={styles.badgeTexts}>
              <Eyebrow>Récord registrado</Eyebrow>
              <TextV2 variant="cta">
                {registeredCount === 1
                  ? 'Nueva mejor marca'
                  : `${registeredCount} nuevas mejores marcas`}
              </TextV2>
              <PressableScale
                accessibilityRole="button"
                onPress={() => navigation.navigate(APP_ROUTES.PersonalRecords, {})}
              >
                <TextV2 variant="metaStrong">Ver récords</TextV2>
              </PressableScale>
            </View>
          </View>
        ) : null}

        {ellie.heroInsight?.text ? (
          <EllieSurface
            message={ellie.heroInsight.text}
            eyebrow=""
            orbSize={36}
            style={{ marginHorizontal: -layout.gutter }}
          />
        ) : null}
      </>
    );
  }

  const exercisesLine = detail
    ? `${detail.session.workoutTitle} · ${detail.session.completedExercises.length} de ${detail.session.totalExercises} ejercicios`
    : '';
  const canRegister = records.length > 0 && !registeredCount;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: footerHeight + 24 }}
      >
        <View style={[styles.hero, { height: HERO_HEIGHT }]}>
          <Image source={HOME_PHOTOS.effort} resizeMode="cover" style={styles.fill} />
          <LinearGradient
            colors={['rgba(20,19,18,.5)', 'rgba(20,19,18,.2)', 'rgba(20,19,18,.92)', '#141312']}
            locations={[0, 0.35, 0.88, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroContent}>
            <View style={styles.check}>
              <Check size={34} color="#FFFFFF" strokeWidth={2.4} />
            </View>
            <TextV2 variant="title24" color="#FFFFFF" align="center">
              Entreno completado
            </TextV2>
            <TextV2 variant="label" color="#A8A6A1" align="center" style={styles.heroLine}>
              {exercisesLine}
            </TextV2>
          </View>
        </View>
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.bg, paddingHorizontal: layout.gutter },
          ]}
        >
          {sheet}
        </View>
      </ScrollView>

      <GlassSurface
        kind="nav"
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(insets.bottom, 16) + 4,
            borderTopColor: colors.divider,
          },
        ]}
      >
        <Button label="Listo" onPress={done} />
        {canRegister ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`Registrar récord, ${records.length} detectado${records.length === 1 ? '' : 's'}`}
            onPress={() => setPrSheetOpen(true)}
            style={[styles.prButton, { boxShadow: `inset 0 0 0 1px ${colors.outline.strong}` }]}
          >
            <View style={[styles.emberDot, { backgroundColor: colors.ember.base }]} />
            <TextV2 variant="bodyStrong">Registrar récord</TextV2>
          </PressableScale>
        ) : null}
      </GlassSurface>

      <Sheet
        open={prSheetOpen}
        onClose={() => setPrSheetOpen(false)}
        eyebrow="Detectado en esta sesión"
        title={records.length === 1 ? 'Nuevo récord' : `${records.length} récords nuevos`}
        footer={
          <Button
            label={
              registering
                ? 'Registrando'
                : records.length === 1
                ? 'Registrar récord'
                : 'Registrar récords'
            }
            loading={registering}
            loadingLabel="Registrando"
            onPress={() => {
              register().catch(() => {});
            }}
          />
        }
      >
        <View style={styles.prList}>
          {records.map(record => (
            <View
              key={record.sessionSetId}
              style={[styles.prRow, { borderBottomColor: colors.divider }]}
            >
              <View style={styles.badgeTexts}>
                <TextV2 variant="bodyStrong">{exerciseName(record.exerciseId)}</TextV2>
                <TextV2 variant="meta" tone="secondary">
                  {record.previousWeight !== null || record.previousReps !== null
                    ? `Antes: ${
                        record.prType === 'max_reps'
                          ? `${record.previousReps ?? 0} reps`
                          : formatKg(record.previousWeight) ?? '—'
                      }`
                    : 'Primera marca'}
                </TextV2>
              </View>
              <TextV2 variant="section">{prValue(record)}</TextV2>
            </View>
          ))}
          {registerError ? (
            <TextV2 variant="meta" color={colors.ember.textOnDark}>
              No pudimos registrarlos. Inténtalo otra vez.
            </TextV2>
          ) : null}
        </View>
      </Sheet>
    </View>
  );
}

function TrioItem({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.trioItem}>
      <TextV2 variant="title28" style={styles.trioValue}>
        {value}
      </TextV2>
      <TextV2 variant="caption" tone="secondary">
        {label}
      </TextV2>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  fill: { width: '100%', height: '100%' },
  hero: { backgroundColor: '#141312', overflow: 'hidden' },
  heroContent: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 56,
    alignItems: 'center',
    gap: 12,
  },
  heroLine: { marginTop: -6, fontWeight: '400' },
  check: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FF5B1F',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 0 8px rgba(255,91,31,.18)',
  },
  sheet: {
    marginTop: -28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 26,
    gap: 26,
  },
  trio: { flexDirection: 'row', gap: 14 },
  trioItem: { flex: 1, gap: 2 },
  trioValue: { fontWeight: '600' },
  trioDivider: { width: 1 },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  badgeTexts: { flex: 1, gap: 2 },
  prIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  prButton: {
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emberDot: { width: 6, height: 6, borderRadius: 3 },
  prList: { gap: 4, paddingBottom: 8 },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
