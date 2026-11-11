import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, BookmarkPlus, Info, Play, Snowflake, Target } from 'lucide-react-native';
import {
  AppImage,
  BackButton,
  Button,
  GlassSurface,
  IconButton,
  SessionTypeChip,
  Skeleton,
  SkeletonGroup,
  StatusBarV2,
  TextV2,
  WorkoutHero,
  haptics,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { APP_ROUTES, ROOT_ROUTES } from '@app/constants/routes';
import { BlockError } from '@app/features/home/v2/BlockError';
import {
  canStartPlanSession,
  lastTimeLine,
  mainOf,
  schemeLine,
  sessionBanners,
  warmupOf,
  weightLine,
} from '@app/features/trainingPlan/planSessionModel';
import {
  longDate,
  sessionTypeKey,
  useTrainingPlanText,
} from '@app/features/trainingPlan/trainingPlanCopy';
import {
  usePlanSession,
  useSavePlanSession,
  useStartPlanSession,
} from '@app/features/trainingPlan/usePlanSession';
import { sessionTypePhoto } from '@app/features/trainingPlan/v2/planCovers';
import { MEDIA_PLACEHOLDER_THUMB } from '@app/features/workouts/workoutAssets';
import { safeGoBack } from '@app/navigation/safeGoBack';
import type { PlanSessionExercise } from '@app/services/supabase/trainingPlanSession';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'PlanSession'>;

const HERO_HEIGHT = 400;

const capitalize = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

// Sesión del plan con peso recomendado (31.7): the standard routine detail
// with a colour cover by type, "Semana 7 · Lunes 9 nov" and the type chip,
// each exercise with its scheme, last time and recommended weight, the
// calibration and deload banners and the RIR note. "Empezar" starts it
// (start_plan_session) and opens the session runner.
export function PlanSessionScreen({ navigation, route }: Props) {
  const { planSessionId } = route.params;
  const { colors, layout, radius } = useThemeV2();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { t, language } = useTrainingPlanText();
  const toast = useToast();
  const query = usePlanSession(planSessionId);
  const starter = useStartPlanSession(planSessionId);
  const saver = useSavePlanSession(planSessionId);
  const session = query.data ?? null;
  const back = () => safeGoBack(navigation, [ROOT_ROUTES.MainTabs]);

  const backButton = (
    <IconButton icon={ArrowLeft} variant="glass" accessibilityLabel={t('week.prev')} onPress={back} />
  );

  if (query.isError) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg, paddingTop: insets.top + 8 }]}>
        <StatusBarV2 />
        <View style={{ paddingHorizontal: layout.gutter }}>
          <BackButton onPress={back} />
          <BlockError
            message={t('session.error.load')}
            onRetry={() => {
              query.refetch().catch(() => undefined);
            }}
          />
        </View>
      </View>
    );
  }

  if (query.isLoading || !session) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg }]}>
        <StatusBarV2 style="light" />
        <SkeletonGroup>
          <Skeleton height={HERO_HEIGHT} radius={0} />
          <View style={[styles.sheet, { paddingHorizontal: layout.gutter, backgroundColor: colors.bg }]}>
            {[0, 1, 2, 3].map(index => (
              <View key={index} style={styles.skeletonRow}>
                <Skeleton width={56} height={56} radius={14} />
                <View style={styles.flex}>
                  <Skeleton width="70%" height={14} />
                  <Skeleton width="40%" height={12} />
                </View>
              </View>
            ))}
          </View>
        </SkeletonGroup>
        {query.isLoading ? null : (
          <View style={[styles.floatBack, { top: insets.top + 4 }]}>{backButton}</View>
        )}
      </View>
    );
  }

  const warmup = warmupOf(session);
  const main = mainOf(session);
  const banners = sessionBanners(session);
  const startable = canStartPlanSession(session);
  const date = session.date ? capitalize(longDate(language, session.date)) : '';
  const eyebrow =
    session.weekIndex !== null
      ? t('session.eyebrow', { n: session.weekIndex, date })
      : t('session.eyebrowNoWeek', { date });
  const meta = session.minutes
    ? t(main.length === 1 ? 'session.metaOne' : 'session.meta', { min: session.minutes, n: main.length })
    : '';

  const start = async () => {
    const started = await starter.start();
    if (started?.workoutId) {
      haptics.light();
      navigation.navigate(APP_ROUTES.WorkoutSession, {
        workoutId: started.workoutId,
        sessionId: started.sessionId ?? undefined,
        planSessionId,
      });
      return;
    }
    toast.show(t('session.error.start'), { tone: 'error' });
  };

  // "Guardar en Mis rutinas": a copy of the session as a routine. The toast
  // sits above the fixed footer and "Ver" opens Mis rutinas.
  const saveToRoutines = async () => {
    if (saver.saved) {
      return;
    }
    const result = await saver.save();
    if (!result) {
      toast.show(t('session.saveError'), { tone: 'error', bottomOffset: insets.bottom + 112 });
      return;
    }
    haptics.success();
    toast.show(t('session.saved'), {
      bottomOffset: insets.bottom + 112,
      action: {
        label: t('session.saved.view'),
        onPress: () => navigation.navigate(APP_ROUTES.RoutineList, { collection: 'mine' }),
      },
    });
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 112 }}>
        <WorkoutHero
          variant="detail"
          height={Math.min(HERO_HEIGHT + 40, Math.round((width * 4) / 3))}
          image={sessionTypePhoto(session.type)}
          dim={false}
          eyebrow={eyebrow}
          eyebrowLeading={
            session.type ? <SessionTypeChip type={session.type} label={t(sessionTypeKey(session.type))} /> : undefined
          }
          title={session.title}
          meta={meta}
          bottomInset={52}
          topOffset={insets.top + 4}
          top={backButton}
        />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.bg,
              borderTopLeftRadius: radius.sheet,
              borderTopRightRadius: radius.sheet,
              paddingHorizontal: layout.gutter,
            },
          ]}
        >
          {banners.calibration ? (
            <View style={[styles.banner, { backgroundColor: colors.plan.emS }]}>
              <Target size={20} color={colors.plan.emT} strokeWidth={2} />
              <View style={styles.flex}>
                <TextV2 variant="bodyStrong" color={colors.plan.emT}>
                  {t('session.banner.calibration.title')}
                </TextV2>
                <TextV2 variant="label" color={colors.plan.emT} style={styles.regular}>
                  {t('session.banner.calibration.body')}
                </TextV2>
              </View>
            </View>
          ) : null}
          {banners.deload ? (
            <View style={[styles.banner, { backgroundColor: colors.plan.rbS }]}>
              <Snowflake size={20} color={colors.plan.rbT} strokeWidth={2} />
              <View style={styles.flex}>
                <TextV2 variant="bodyStrong" color={colors.plan.rbT}>
                  {t('session.banner.deload.title')}
                </TextV2>
                <TextV2 variant="label" color={colors.plan.rbT} style={styles.regular}>
                  {t('session.banner.deload.body')}
                </TextV2>
              </View>
            </View>
          ) : null}

          {warmup.length > 0 ? (
            <View style={styles.block}>
              <TextV2 variant="eyebrow" color={colors.text.secondary}>
                {t('session.warmup').toUpperCase()}
              </TextV2>
              {warmup.map(exercise => (
                <WarmupRow key={`${exercise.position}-${exercise.exerciseId}`} exercise={exercise} />
              ))}
            </View>
          ) : null}

          <View style={styles.block}>
            <TextV2 variant="eyebrow" color={colors.text.secondary}>
              {t('session.exercises').toUpperCase()}
            </TextV2>
            {main.map(exercise => (
              <ExerciseRow key={`${exercise.position}-${exercise.exerciseId}`} exercise={exercise} />
            ))}
          </View>

          <Button
            label={t('session.save')}
            successLabel={t('session.saved')}
            success={saver.saved !== null}
            variant="secondary"
            icon={BookmarkPlus}
            iconPosition="start"
            loading={saver.saving}
            loadingLabel={t('session.saving')}
            onPress={() => {
              saveToRoutines().catch(() => undefined);
            }}
          />

          <View style={styles.rirNote}>
            <Info size={14} color={colors.text.secondary} strokeWidth={2} style={styles.rirIcon} />
            <TextV2 variant="meta" color={colors.text.secondary} style={styles.flex}>
              {t('session.rirNote')}
            </TextV2>
          </View>
        </View>
      </ScrollView>

      <GlassSurface
        kind="nav"
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 4, borderTopColor: colors.divider }]}
      >
        {starter.failed ? (
          <TextV2 variant="meta" color={colors.plan.emT} align="center" style={styles.footerError}>
            {t('session.error.start')}
          </TextV2>
        ) : null}
        <Button
          label={startable ? t('session.start') : t('session.done')}
          icon={Play}
          iconPosition="end"
          loading={starter.starting}
          loadingLabel={t('session.starting')}
          disabled={!startable}
          onPress={() => {
            start().catch(() => undefined);
          }}
        />
      </GlassSurface>
    </View>
  );
}

// A warm-up exercise: its thumbnail and name, no weight.
function WarmupRow({ exercise }: { exercise: PlanSessionExercise }) {
  const { colors } = useThemeV2();
  return (
    <View style={[styles.row, { borderBottomColor: colors.divider }]}>
      <AppImage source={{ mediaKey: exercise.image, fallback: MEDIA_PLACEHOLDER_THUMB }} style={styles.thumb} />
      <View style={styles.flex}>
        <TextV2 variant="label" numberOfLines={2}>
          {exercise.name}
        </TextV2>
        {exercise.sets > 0 && exercise.repMin !== null ? (
          <TextV2 variant="caption" color={colors.text.secondary}>
            {`${exercise.sets} × ${exercise.repMin}`}
          </TextV2>
        ) : null}
      </View>
    </View>
  );
}

// A main exercise: thumbnail, name, "3 × 6–9 · RIR 2", "Última vez" and the
// recommended weight in big figures on the right.
function ExerciseRow({ exercise }: { exercise: PlanSessionExercise }) {
  const { colors } = useThemeV2();
  const { t } = useTrainingPlanText();
  const weight = weightLine(exercise, t);
  return (
    <View style={[styles.row, { borderBottomColor: colors.divider }]}>
      <AppImage source={{ mediaKey: exercise.image, fallback: MEDIA_PLACEHOLDER_THUMB }} style={styles.thumb} />
      <View style={styles.flex}>
        <TextV2 variant="label" numberOfLines={2}>
          {exercise.name}
        </TextV2>
        <TextV2 variant="caption" color={colors.text.secondary}>
          {schemeLine(exercise, t)}
        </TextV2>
        <TextV2 variant="caption" color={colors.text.secondary}>
          {lastTimeLine(exercise, t)}
        </TextV2>
      </View>
      <View style={styles.weight}>
        {weight.kind === 'kg' ? (
          <>
            <TextV2 variant="displayS" style={styles.weightValue}>
              {weight.value}
            </TextV2>
            <TextV2 variant="caption" color={colors.text.secondary}>
              {weight.unit}
            </TextV2>
          </>
        ) : (
          <TextV2
            variant="captionStrong"
            color={weight.kind === 'calibrate' ? colors.plan.emT : colors.text.secondary}
            align="right"
          >
            {weight.text}
          </TextV2>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  regular: { fontWeight: '400' },
  floatBack: { position: 'absolute', left: 16 },
  sheet: { marginTop: -28, paddingTop: 22, gap: 20 },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 },
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 16 },
  block: { gap: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumb: { width: 56, height: 56, borderRadius: 14, overflow: 'hidden' },
  weight: { minWidth: 76, maxWidth: 120, alignItems: 'flex-end', justifyContent: 'center' },
  weightValue: { fontSize: 28, lineHeight: 30 },
  rirNote: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  rirIcon: { marginTop: 2 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, gap: 8, borderTopWidth: StyleSheet.hairlineWidth },
  footerError: { marginBottom: 2 },
});
