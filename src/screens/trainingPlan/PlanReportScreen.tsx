import { useMemo, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, Medal, Share2, Trophy } from 'lucide-react-native';
import {
  AuraMark,
  BackButton,
  GlassHeader,
  GlassSurface,
  PressableScale,
  StatusBarV2,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { APP_ROUTES, ROOT_ROUTES } from '@app/constants/routes';
import {
  anchorLine,
  goalVerdict,
  localDayOf,
  nextPlan,
  recordsBetween,
  reportRange,
  signedKg,
} from '@app/features/trainingPlan/planReviewModel';
import {
  goalLabelKey,
  shortDate,
  useTrainingPlanText,
} from '@app/features/trainingPlan/trainingPlanCopy';
import { formatTarget } from '@app/features/trainingPlan/trainingPlanModel';
import { usePlanDetailOf, usePlanReport } from '@app/features/trainingPlan/usePlanReview';
import { useTrainingPlanState } from '@app/features/trainingPlan/useTrainingPlanState';
import { AntonText, PlanEyebrow } from '@app/features/trainingPlan/v2/PlanParts';
import { PlanError, PlanLoading } from '@app/features/trainingPlan/v2/PlanStates';
import { CATEGORY_COVERS } from '@app/features/workouts/workoutAssets';
import { useExerciseNames } from '@app/hooks/useCatalog';
import { usePersonalRecords } from '@app/hooks/usePersonalRecords';
import { getLocalDateKey } from '@app/lib/date';
import { safeGoBack } from '@app/navigation/safeGoBack';
import { formatPRValue } from '@app/shared';
import type { TrainingGoal } from '@app/services/supabase/trainingPlan';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'PlanReport'>;

const BACK_FALLBACKS = [ROOT_ROUTES.MainTabs];
const COVER_BY_GOAL: Record<TrainingGoal, string> = {
  gain_muscle: 'hipertrofia',
  gain_strength: 'fuerza',
  lose_weight: 'cardio',
  performance: 'fullbody',
};

// Reporte final (handoff v2.21 §31.10): the colour cover with "PLAN
// COMPLETADO · {n} SEMANAS", the three figures (adherence, sessions, records),
// the goal (only if there was one), Antes y después by anchor, the records of
// the plan, ELLIE's card with the next plan and "Compartir en Historias".
// The report comes from get_training_plan_report, or already in the cache
// when the plan was ended from "Terminar antes".
export function PlanReportScreen({ navigation, route }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const { t, language } = useTrainingPlanText();
  const planState = useTrainingPlanState();
  const planId = route.params?.planId ?? planState.data?.planId ?? null;
  const report = usePlanReport(planId);
  const detail = usePlanDetailOf(planId);
  const records = usePersonalRecords();
  const today = getLocalDateKey();
  const range = reportRange(detail.data, today);
  const planRecords = useMemo(
    () => (range ? recordsBetween(records.data ?? [], range.from, range.to) : []),
    [range, records.data],
  );
  const { names } = useExerciseNames(planRecords.map(record => record.exerciseId));

  const back = () => safeGoBack(navigation, BACK_FALLBACKS);
  const retry = () => {
    report.refetch().catch(() => undefined);
    detail.refetch().catch(() => undefined);
  };

  const data = report.data;
  const ready = Boolean(data) && !detail.isLoading;
  let body: ReactNode;
  if (report.isError || detail.isError || (!planId && !planState.isLoading)) {
    body = (
      <View style={{ paddingHorizontal: layout.gutter }}>
        <PlanError onRetry={retry} />
      </View>
    );
  } else if (!data || !ready) {
    body = (
      <View style={{ paddingHorizontal: layout.gutter }}>
        <PlanLoading />
      </View>
    );
  } else {
    const weeks = detail.data?.weeks ?? 0;
    const cover = CATEGORY_COVERS[data.goal ? COVER_BY_GOAL[data.goal] : 'fuerza'] ?? CATEGORY_COVERS.fuerza;
    const goalName = data.goal ? t(goalLabelKey(data.goal)) : null;
    const period =
      detail.data?.startDate && range
        ? `${shortDate(language, detail.data.startDate)} – ${shortDate(language, range.to)}`
        : null;
    const verdict = goalVerdict(data);
    const next = nextPlan(data);
    const nextGoal = next.goal ? t(goalLabelKey(next.goal)) : null;
    const adherence = data.adherencePct !== null ? `${Math.round(data.adherencePct)} %` : '—';

    body = (
      <>
        <View style={styles.cover}>
          <Image
            source={cover.image}
            contentFit="cover"
            contentPosition={cover.focus}
            accessibilityIgnoresInvertColors
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['rgba(20,19,18,0)', 'rgba(20,19,18,.88)']}
            locations={[0.3, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.coverTexts, { left: layout.gutter, right: layout.gutter }]}>
            <PlanEyebrow color="#FF8A5C" leading={<View style={styles.dot} />}>
              {t('report.eyebrow')}
            </PlanEyebrow>
            {weeks > 0 ? (
              <AntonText size={56} color="#FFFFFF">
                {t('report.big', { n: weeks })}
              </AntonText>
            ) : null}
            <TextV2 variant="label" color="#D8D6D1" style={styles.regular}>
              {[goalName, period].filter(Boolean).join(' · ')}
            </TextV2>
          </View>
        </View>

        <View style={[styles.sections, { paddingHorizontal: layout.gutter }]}>
          <View style={styles.tiles}>
            <Tile value={adherence} label={t('report.adherence')} />
            <Tile value={String(data.sessionsDone)} label={t('report.sessions', { n: data.sessionsTotal })} />
            <Tile
              value={String(planRecords.length)}
              label={t(planRecords.length === 1 ? 'report.recordOne' : 'report.records')}
            />
          </View>

          {verdict ? (
            <View style={[styles.goal, { backgroundColor: colors.plan.emS }]}>
              <View style={styles.goalIcon}>
                <Trophy size={20} color="#FFFFFF" strokeWidth={2} />
              </View>
              <View style={styles.goalTexts}>
                <TextV2 variant="bodyL" style={styles.semibold}>
                  {t(
                    verdict.achieved === true
                      ? 'report.goal.reached'
                      : verdict.achieved === false
                        ? 'report.goal.missed'
                        : 'report.goal.target',
                  )}
                </TextV2>
                <TextV2 variant="label" color={colors.text.secondary} style={styles.regular}>
                  {verdict.kind === 'reps'
                    ? t('report.goal.reps', { name: verdict.name, n: formatTarget(language, verdict.target) })
                    : verdict.achieved === false && verdict.reached !== null
                      ? t('report.goal.missedLine', {
                          name: verdict.name,
                          n: formatTarget(language, verdict.target),
                          m: formatTarget(language, verdict.reached),
                        })
                      : verdict.reached === null
                        ? `${t('report.goal.kg', { name: verdict.name, n: formatTarget(language, verdict.target) })} · ${t('report.goal.noData')}`
                        : t('report.goal.kg', { name: verdict.name, n: formatTarget(language, verdict.target) })}
                </TextV2>
              </View>
            </View>
          ) : null}

          {data.anchors.length > 0 ? (
            <View style={styles.gap4}>
              <View style={styles.sectionHead}>
                <TextV2 variant="section">{t('report.before')}</TextV2>
                <TextV2 variant="label" color={colors.text.secondary} style={styles.regular}>
                  {t('anchors.sub')}
                </TextV2>
              </View>
              {data.anchors.map(anchor => {
                const line = anchorLine(anchor);
                return (
                  <View key={anchor.exerciseId} style={[styles.anchorRow, { borderBottomColor: colors.divider }]}>
                    <TextV2 variant="bodyStrong" style={styles.anchorName} numberOfLines={2}>
                      {line.name}
                    </TextV2>
                    {line.kind === 'insufficient' ? (
                      <TextV2 variant="label" color={colors.text.secondary} style={styles.regular}>
                        {t('report.insufficient')}
                      </TextV2>
                    ) : (
                      <>
                        <TextV2 variant="label" color={colors.text.secondary} style={styles.regular}>
                          {formatTarget(language, line.before)}
                        </TextV2>
                        <ArrowRight size={13} color={colors.text.secondary} strokeWidth={2} />
                        <AntonText size={24} style={styles.anchorAfter}>
                          {`${formatTarget(language, line.after)} kg`}
                        </AntonText>
                        <View style={styles.chip}>
                          <TextV2 variant="captionStrong" color="#121212">
                            {`${signedKg(line.delta, language)} kg`}
                          </TextV2>
                        </View>
                      </>
                    )}
                  </View>
                );
              })}
            </View>
          ) : null}

          {planRecords.length > 0 ? (
            <View style={styles.gap4}>
              <TextV2 variant="section" style={styles.sectionHead}>
                {t('report.prs')}
              </TextV2>
              {planRecords.map(record => (
                <View key={record.id} style={[styles.recordRow, { borderBottomColor: colors.divider }]}>
                  <Medal size={18} color={colors.text.primary} strokeWidth={1.8} />
                  <TextV2 variant="bodyStrong" style={styles.anchorName} numberOfLines={2}>
                    {names[record.exerciseId] ?? ''}
                  </TextV2>
                  <TextV2 variant="bodyStrong">{formatPRValue(record)}</TextV2>
                  <TextV2 variant="caption" color={colors.text.secondary}>
                    {shortDate(language, localDayOf(record.recordedAt) ?? '')}
                  </TextV2>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.ellie}>
            <View style={styles.ellieHead}>
              <AuraMark size={26} tone="dark" state="rest" />
              <TextV2 color="#A8A6A1" style={styles.ellieEyebrow}>
                {t('report.next.eyebrow')}
              </TextV2>
            </View>
            {nextGoal ? (
              <AntonText size={30} color="#FFFFFF">
                {t('report.next.title', { goal: nextGoal, weeks: next.weeks })}
              </AntonText>
            ) : null}
            <TextV2 variant="body" color="#D8D6D1">
              {nextGoal
                ? t('report.next.body', { weeks: next.weeks, goal: nextGoal.toLowerCase() })
                : t('report.next.bodyNoGoal', { weeks: next.weeks })}
            </TextV2>
            <View style={styles.ellieActions}>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={t('report.next.view')}
                onPress={() =>
                  navigation.navigate(APP_ROUTES.TrainingPlanCreate, {
                    ...(next.goal ? { goal: next.goal } : null),
                    weeks: next.weeks,
                  })
                }
                style={[styles.ellieButton, styles.ellieWhite]}
              >
                <TextV2 variant="bodyStrong" color="#121212" align="center">
                  {t('report.next.view')}
                </TextV2>
              </PressableScale>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={t('report.next.other')}
                onPress={() => navigation.navigate(APP_ROUTES.TrainingPlanCreate)}
                style={[styles.ellieButton, styles.ellieGhost]}
              >
                <TextV2 variant="bodyStrong" color="#FFFFFF" align="center">
                  {t('report.next.other')}
                </TextV2>
              </PressableScale>
            </View>
          </View>
        </View>
      </>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <GlassHeader title={t('report.title')} left={<BackButton onPress={back} />} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 120 }}
      >
        {body}
      </ScrollView>
      {data && planId ? (
        <GlassSurface
          kind="nav"
          style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 4, paddingHorizontal: 20 }]}
        >
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={t('report.share')}
            onPress={() => navigation.navigate(APP_ROUTES.Share, { kind: 'plan', planId })}
            style={styles.share}
          >
            <Share2 size={18} color="#121212" strokeWidth={2.2} />
            <TextV2 variant="cta" color="#121212">
              {t('report.share')}
            </TextV2>
          </PressableScale>
        </GlassSurface>
      ) : null}
    </View>
  );
}

function Tile({ value, label }: { value: string; label: string }) {
  const { colors, mode } = useThemeV2();
  return (
    <View
      style={[
        styles.tile,
        { backgroundColor: colors.surface.raised },
        mode === 'light' ? styles.tileShadow : [styles.tileRing, { borderColor: colors.border.onDark }],
      ]}
    >
      <AntonText size={34} style={styles.tileValue}>
        {value}
      </AntonText>
      <TextV2 variant="caption" color={colors.text.secondary}>
        {label}
      </TextV2>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  regular: { fontWeight: '400' },
  semibold: { fontWeight: '600' },
  gap4: { gap: 4 },
  cover: { height: 300, backgroundColor: '#141312', overflow: 'hidden' },
  coverTexts: { position: 'absolute', bottom: 22, gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF5B1F' },
  sections: { paddingTop: 22, gap: 24 },
  tiles: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, minWidth: 0, padding: 14, borderRadius: 18, gap: 6 },
  tileShadow: { boxShadow: '0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.05)' },
  tileRing: { borderWidth: 1 },
  tileValue: { lineHeight: 38 },
  goal: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20 },
  goalIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF5B1F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalTexts: { flex: 1, minWidth: 0, gap: 2 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 4 },
  anchorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    columnGap: 12,
    rowGap: 4,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  anchorName: { flex: 1, minWidth: 110 },
  anchorAfter: { lineHeight: 28, textAlign: 'right' },
  chip: { height: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: '#FF5B1F', justifyContent: 'center' },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  ellie: { borderRadius: 24, backgroundColor: '#141312', padding: 18, gap: 12 },
  ellieHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ellieEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  ellieActions: { flexDirection: 'row', gap: 8 },
  ellieButton: { height: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  ellieWhite: { flex: 1, backgroundColor: '#FFFFFF' },
  ellieGhost: { paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,.1)' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 12 },
  share: {
    height: 56,
    borderRadius: 999,
    backgroundColor: '#FF5B1F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    boxShadow: '0 10px 24px rgba(255,91,31,.3)',
  },
});
