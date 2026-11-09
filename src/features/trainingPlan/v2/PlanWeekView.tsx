import { useMemo, useRef } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import LinearGradient from 'react-native-linear-gradient';
import { Bed, ChevronLeft, ChevronRight, Gauge, ListChecks, Pause, Play } from 'lucide-react-native';
import {
  PressableScale,
  SessionTypeChip,
  TextV2,
  haptics,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import {
  dayName,
  longDate,
  phaseKey,
  sessionTypeKey,
  shortDate,
  useTrainingPlanText,
  weekRangeText,
} from '@app/features/trainingPlan/trainingPlanCopy';
import {
  beforeStart,
  nextSession,
  planContext,
  planDayViews,
  segmentBlocks,
  segmentTone,
  sessionsCount,
  weekSessions,
  type PlanDayView,
  type SegmentTone,
} from '@app/features/trainingPlan/planViewModel';
import { isDeloadWeek } from '@app/features/trainingPlan/trainingPlanModel';
import { useResumeTrainingPlan } from '@app/features/trainingPlan/usePlanViews';
import { PlanPills, PlanSessionRow } from '@app/features/trainingPlan/v2/PlanDayParts';
import { PlanAdjustmentsStack } from '@app/features/trainingPlan/v2/PlanAdjustmentCard';
import { PlanError, PlanLoading } from '@app/features/trainingPlan/v2/PlanStates';
import { AntonText, PlanEyebrow } from '@app/features/trainingPlan/v2/PlanParts';
import { sessionTypeCover } from '@app/features/trainingPlan/v2/planCovers';
import { addDays, weekStartOf } from '@app/features/week/weekModel';
import { useWeekPlan } from '@app/hooks/useWeekPlan';
import type { TrainingPlanDetail, TrainingPlanState } from '@app/services/supabase/trainingPlan';

const capitalize = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

// Tu semana · Semana, with a plan (handoff v2.21 §31.4): the phase (plan
// name, "SEMANA 6 de 12", block, dates and the line of weeks), the banners of
// the week (pause, calibration, deload), the seven days with their type and
// state, Próxima sesión, "Sesiones · x de y hechas" and the weekly review.
export function PlanWeekView({
  weekStart,
  range,
  today,
  planState,
  detail,
  onChangeWeek,
  onBackToCurrent,
  onOpenDay,
}: {
  weekStart: string;
  range: { first: string; last: string; current: string };
  today: string;
  planState: TrainingPlanState;
  detail: TrainingPlanDetail;
  onChangeWeek: (weekStart: string) => void;
  onBackToCurrent: () => void;
  onOpenDay: (view: PlanDayView) => void;
}) {
  const { colors } = useThemeV2();
  const { t, language } = useTrainingPlanText();
  const toast = useToast();
  const resume = useResumeTrainingPlan();
  // The calendar's current week reads with no argument (as Tu semana does).
  const query = useWeekPlan(true, weekStart === weekStartOf(today) ? null : weekStart);
  const week = query.data ?? null;
  const header = week?.trainingPlan ?? null;
  const ctx = planContext(today, planState, header);
  const views = useMemo(() => (week ? planDayViews(week, ctx) : []), [week, ctx.today, ctx.paused, ctx.pausedUntil]); // eslint-disable-line react-hooks/exhaustive-deps
  const sessions = weekSessions(views);
  const count = sessionsCount(views);
  const next = nextSession(views);

  const canPrev = weekStart > range.first;
  const canNext = weekStart < range.last;
  const change = (delta: -1 | 1) => {
    if ((delta < 0 && !canPrev) || (delta > 0 && !canNext)) {
      return;
    }
    haptics.light();
    onChangeWeek(addDays(weekStart, delta * 7));
  };
  // Swiping the days changes the week; taps on a day are untouched.
  const changeRef = useRef(change);
  changeRef.current = change;
  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          Math.abs(gesture.dx) > 14 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
        onPanResponderRelease: (_event, gesture) => {
          if (Math.abs(gesture.dx) > 50) {
            changeRef.current(gesture.dx > 0 ? -1 : 1);
          }
        },
      }),
    [],
  );

  if (query.isError) {
    return <PlanError onRetry={() => query.refetch()} />;
  }
  if (!week) {
    return <PlanLoading />;
  }

  const weekIndex = header?.weekIndex ?? (beforeStart(planState) ? 1 : null);
  const weeks = header?.weeks || detail.weeks;
  const kind = header?.weekKind ?? null;
  const isDeload = kind !== null && isDeloadWeek(kind);
  const pausedHere = planState.state === 'paused' && weekStart === range.current;
  const phaseLabel = isDeload ? t('week.descarga') : header?.phase ? t(phaseKey(header.phase)) : '';
  const rangeText = weekRangeText(language, weekStart);
  const sub = beforeStart(planState) && weekIndex === 1 && planState.startDate
    ? t('phase.starts', { date: longDate(language, planState.startDate) })
    : header?.blockIndex
      ? t('phase.sub', {
          b: header.blockIndex,
          phase: phaseLabel,
          range: pausedHere && planState.pausedUntil
            ? t('phase.paused', { date: shortDate(language, planState.pausedUntil) })
            : rangeText,
        })
      : rangeText;
  const segments =
    header && header.segments.length > 0
      ? header.segments
      : detail.blocks.flatMap(block => block.weeks).map(item => ({
          weekIndex: item.weekIndex,
          kind: item.kind,
          state: (item.weekIndex === weekIndex ? 'current' : item.weekIndex < (weekIndex ?? 0) ? 'done' : 'upcoming') as
            | 'done'
            | 'current'
            | 'upcoming',
        }));
  const toneColor = (tone: SegmentTone) =>
    tone === 'current'
      ? colors.ember.base
      : tone === 'ink'
        ? colors.text.primary
        : tone === 'deload'
          ? colors.plan.tyD
          : colors.divider;

  const retake = async () => {
    const ok = await resume.resume();
    if (ok) {
      haptics.success();
      toast.show(t('pause.resumed'));
    } else {
      toast.show(t('pause.error'), { tone: 'error' });
    }
  };

  return (
    <>
      <PlanAdjustmentsStack />
      <View style={styles.phase}>
        <View style={styles.phaseHead}>
          <View style={styles.phaseTexts}>
            <PlanEyebrow
              color={colors.plan.emT}
              leading={<View style={[styles.eyebrowDot, { backgroundColor: colors.ember.base }]} />}
            >
              {header?.name || planState.name || detail.name || ''}
            </PlanEyebrow>
            {weekIndex !== null ? (
              <View style={styles.bigRow}>
                <AntonText size={54} style={styles.bigLine}>
                  {t('phase.big', { n: weekIndex })}
                </AntonText>
                {weeks > 0 ? (
                  <AntonText size={26} color={colors.text.secondary}>
                    {t('phase.of', { n: weeks })}
                  </AntonText>
                ) : null}
              </View>
            ) : null}
          </View>
          <View style={styles.arrows}>
            {([-1, 1] as const).map(delta => {
              const enabled = delta < 0 ? canPrev : canNext;
              const Icon = delta < 0 ? ChevronLeft : ChevronRight;
              return (
                <PressableScale
                  key={delta}
                  accessibilityRole="button"
                  accessibilityLabel={t(delta < 0 ? 'week.prev' : 'week.next')}
                  accessibilityState={{ disabled: !enabled }}
                  disabled={!enabled}
                  onPress={() => change(delta)}
                  style={[styles.arrow, { backgroundColor: colors.surface.muted }, enabled ? null : styles.off]}
                >
                  <Icon size={18} color={colors.text.primary} strokeWidth={2} />
                </PressableScale>
              );
            })}
          </View>
        </View>
        <TextV2 variant="label" color={colors.text.secondary} style={styles.regular}>
          {sub}
        </TextV2>
        {segments.length > 0 ? (
          <View style={styles.blocks}>
            {segmentBlocks(segments).map((block, blockIndex) => (
              <View key={blockIndex} style={styles.block}>
                {block.map(segment => (
                  <View
                    key={segment.weekIndex}
                    style={[
                      styles.segment,
                      { backgroundColor: toneColor(segmentTone(segment)) },
                      segment.state === 'current' ? { boxShadow: `0 0 0 2px ${colors.plan.emS}` } : null,
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>
        ) : null}
        {weekStart !== range.current ? (
          <PressableScale
            accessibilityRole="button"
            onPress={onBackToCurrent}
            style={[styles.backChip, { backgroundColor: colors.surface.muted }]}
          >
            <TextV2 variant="metaStrong">{t('phase.backToCurrent')}</TextV2>
          </PressableScale>
        ) : null}
      </View>

      {planState.state === 'paused' && planState.pausedUntil ? (
        <View style={[styles.banner, { backgroundColor: colors.surface.muted }]}>
          <View style={[styles.bannerIcon, { backgroundColor: colors.surface.raised }]}>
            <Pause size={18} color={colors.text.primary} strokeWidth={2} />
          </View>
          <View style={styles.bannerTexts}>
            <TextV2 variant="bodyStrong" style={styles.fs16}>
              {t('pause.title', { date: shortDate(language, planState.pausedUntil) })}
            </TextV2>
            <TextV2 variant="label" color={colors.text.secondary} style={styles.regular}>
              {t(planState.pauseWeeks === 2 ? 'pause.body.two' : 'pause.body.one', {
                end: planState.endDate ? shortDate(language, planState.endDate) : '',
              })}
            </TextV2>
            <PressableScale
              accessibilityRole="button"
              accessibilityState={{ busy: resume.resuming, disabled: resume.resuming }}
              disabled={resume.resuming}
              onPress={() => {
                retake().catch(() => undefined);
              }}
              style={[styles.resume, { backgroundColor: colors.cta.primary }, resume.resuming ? styles.off : null]}
            >
              <TextV2 variant="label" color={colors.cta.primaryText}>
                {t('pause.resume')}
              </TextV2>
            </PressableScale>
          </View>
        </View>
      ) : null}
      {kind === 'calibracion' ? (
        <View style={[styles.banner, { backgroundColor: colors.plan.emS }]}>
          <View style={[styles.bannerIcon, { backgroundColor: colors.ember.base }]}>
            <Gauge size={18} color="#121212" strokeWidth={2} />
          </View>
          <View style={styles.bannerTexts}>
            <TextV2 variant="bodyStrong" style={styles.fs16}>
              {t('calib.title')}
            </TextV2>
            <TextV2 variant="label" color={colors.text.secondary} style={styles.regular}>
              {t('calib.body')}
            </TextV2>
          </View>
        </View>
      ) : null}
      {isDeload ? (
        <View style={[styles.banner, { backgroundColor: colors.plan.rbS }]}>
          <View style={[styles.bannerIcon, { backgroundColor: colors.plan.tyD }]}>
            <Bed size={18} color="#FFFFFF" strokeWidth={2} />
          </View>
          <View style={styles.bannerTexts}>
            <TextV2 variant="bodyStrong" color={colors.plan.rbT} style={styles.fs16}>
              {t('deload.title')}
            </TextV2>
            <TextV2 variant="label" color={colors.text.secondary} style={styles.regular}>
              {kind === 'descarga_test' ? t('deload.bodyLast') : t('deload.body', { n: (header?.blockIndex ?? 0) + 1 })}
            </TextV2>
          </View>
        </View>
      ) : null}

      <View {...swipe.panHandlers}>
        <PlanPills views={views} today={today} onPressDay={onOpenDay} />
      </View>

      {next ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`${next.title}. ${next.type ? t(sessionTypeKey(next.type)) : ''}`}
          onPress={() => onOpenDay(next)}
          style={styles.hero}
        >
          <Image
            source={sessionTypeCover(next.type).image}
            contentFit="cover"
            contentPosition={sessionTypeCover(next.type).focus}
            accessibilityIgnoresInvertColors
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['rgba(20,19,18,.35)', 'rgba(20,19,18,0)', 'rgba(20,19,18,.92)']}
            locations={[0, 0.3, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroTop}>
            <View style={styles.heroWhen}>
              <TextV2 color="#FFFFFF" style={styles.heroWhenText}>
                {pausedHere || (planState.state === 'paused' && planState.pausedUntil && next.date >= planState.pausedUntil)
                  ? t('hero.afterResume', { day: capitalize(longDate(language, next.date)) })
                  : next.date === today
                    ? t('hero.today', { day: dayName(language, next.date) })
                    : t('hero.next', { day: dayName(language, next.date) })}
              </TextV2>
            </View>
            {next.type ? <SessionTypeChip type={next.type} label={t(sessionTypeKey(next.type))} /> : null}
          </View>
          <View style={styles.heroBottom}>
            <View style={styles.heroTexts}>
              <AntonText size={34} color="#FFFFFF">
                {next.title}
              </AntonText>
              <TextV2 variant="meta" color="#D8D6D1">
                {(next.exerciseCount
                  ? t('hero.meta', { min: next.minutes ?? 0, n: next.exerciseCount })
                  : t('hero.metaMin', { min: next.minutes ?? 0 })) +
                  (kind === 'calibracion' ? t('hero.calibration') : '')}
              </TextV2>
            </View>
            <View style={[styles.play, { backgroundColor: colors.ember.base }]}>
              <Play size={18} color="#121212" fill="#121212" strokeWidth={2} />
            </View>
          </View>
        </PressableScale>
      ) : null}

      <View>
        <View style={styles.listHead}>
          <TextV2 variant="section">{t('list.title')}</TextV2>
          <TextV2 variant="meta" color={colors.text.secondary}>
            {t('list.count', { done: count.done, n: count.total })}
          </TextV2>
        </View>
        {sessions.length === 0 ? (
          <TextV2 variant="meta" color={colors.text.secondary} style={styles.noSessions}>
            {t('list.empty')}
          </TextV2>
        ) : (
          <View style={isDeload ? [styles.deloadList, { backgroundColor: colors.plan.rbS }] : null}>
            {sessions.map((view, index) => (
              <PlanSessionRow
                key={`${view.date}-${index}`}
                view={view}
                last={index === sessions.length - 1}
                onPress={() => onOpenDay(view)}
              />
            ))}
          </View>
        )}
      </View>

      <PressableScale
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
        disabled
        style={[styles.review, { backgroundColor: colors.surface.raised }, styles.reviewShadow]}
      >
        <View style={[styles.reviewIcon, { backgroundColor: colors.surface.muted }]}>
          <ListChecks size={20} color={colors.text.primary} strokeWidth={1.8} />
        </View>
        <View style={styles.bannerTexts}>
          <TextV2 variant="bodyStrong">{t('review.title')}</TextV2>
          <TextV2 variant="meta" color={colors.text.secondary}>
            {t('review.sub')}
          </TextV2>
        </View>
        <ChevronRight size={16} color={colors.text.primary} strokeWidth={2} style={styles.chevron} />
      </PressableScale>
    </>
  );
}

const styles = StyleSheet.create({
  regular: { fontWeight: '400' },
  fs16: { fontSize: 16 },
  off: { opacity: 0.35 },
  phase: { gap: 10 },
  phaseHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  phaseTexts: { flex: 1, minWidth: 0, gap: 10 },
  eyebrowDot: { width: 6, height: 6, borderRadius: 3 },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 10 },
  bigLine: { lineHeight: 62 },
  arrows: { flexDirection: 'row', gap: 6 },
  arrow: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  blocks: { flexDirection: 'row', gap: 8, marginTop: 4 },
  block: { flex: 1, flexDirection: 'row', gap: 3 },
  segment: { flex: 1, height: 6, borderRadius: 3 },
  backChip: { alignSelf: 'flex-start', minHeight: 34, paddingHorizontal: 14, borderRadius: 17, justifyContent: 'center', marginTop: 2 },
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 16, borderRadius: 20 },
  bannerIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  bannerTexts: { flex: 1, minWidth: 0, gap: 4 },
  resume: { alignSelf: 'flex-start', minHeight: 40, paddingHorizontal: 18, borderRadius: 999, justifyContent: 'center', marginTop: 6 },
  hero: { height: 280, borderRadius: 28, overflow: 'hidden', backgroundColor: '#141312' },
  heroTop: { position: 'absolute', left: 18, right: 18, top: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  heroWhen: { minHeight: 26, paddingHorizontal: 11, borderRadius: 13, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.16)', flexShrink: 1 },
  heroWhenText: { fontSize: 12, fontWeight: '600' },
  heroBottom: { position: 'absolute', left: 18, right: 18, bottom: 18, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  heroTexts: { flex: 1, minWidth: 0, gap: 6 },
  play: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  listHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 4 },
  noSessions: { paddingVertical: 14 },
  deloadList: { borderRadius: 18, paddingHorizontal: 14 },
  review: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20 },
  reviewShadow: { boxShadow: '0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.05)' },
  reviewIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  chevron: { opacity: 0.4 },
});
