import { StyleSheet, View } from 'react-native';
import { Flag, SlidersHorizontal, Target } from 'lucide-react-native';
import { PressableScale, TextV2, useThemeV2 } from '@app/components/v2';
import { formatTarget, TARGETS } from '@app/features/trainingPlan/trainingPlanModel';
import {
  phaseKey,
  useTrainingPlanText,
  type TrainingPlanT,
} from '@app/features/trainingPlan/trainingPlanCopy';
import {
  anchorBars,
  blockBars,
  goalAnchor,
  goalProgress,
  planStats,
  type AnchorBarTone,
  type BarTone,
} from '@app/features/trainingPlan/planViewModel';
import { AntonText } from '@app/features/trainingPlan/v2/PlanParts';
import { weekStartOf } from '@app/features/week/weekModel';
import type { TrainingPlanDetail } from '@app/services/supabase/trainingPlan';

const BAR_BOX = 110;
const ANCHOR_BOX = 72;

// The name of a target: the server's, the anchor's or the four known slugs.
function goalName(detail: TrainingPlanDetail, t: TrainingPlanT): string {
  const goal = detail.goalTarget;
  if (!goal) {
    return '';
  }
  const known = TARGETS.find(option => option.slug !== null && option.slug === goal.exerciseSlug);
  return goal.exerciseName ?? goalAnchor(goal, detail.anchors)?.name ?? (known ? t(known.labelKey) : '');
}

// Tu semana · Plan (handoff v2.21 §31.6): blocks of bars by load (tap one to
// open that week), the dark scene with progress, adherence and sessions, Tu
// meta (only with a goal_target), and an anchor card per exercise with its
// e1RM, its delta and the weekly bars (registered in ink, projection in
// outline). "Gestionar plan" opens the manage sheet (31.11).
export function PlanOverview({
  detail,
  currentWeek,
  onOpenWeek,
  onManage,
}: {
  detail: TrainingPlanDetail;
  // The plan's week now (0: before the start).
  currentWeek: number;
  onOpenWeek: (weekStart: string) => void;
  onManage: () => void;
}) {
  const { colors, mode } = useThemeV2();
  const { t, language } = useTrainingPlanText();
  const { stats, pct } = planStats(detail);
  const goal = detail.goalTarget;
  const progress = goal ? goalProgress(goal, detail.anchors) : null;
  const weeks = detail.blocks.flatMap(block => block.weeks);
  const weekCount = detail.weeks || weeks.length;
  const surface = [styles.card, { backgroundColor: colors.surface.raised }, mode === 'light' ? styles.shadow : [styles.ring, { borderColor: colors.border.onDark }]];

  const barStyle = (tone: BarTone) => {
    switch (tone) {
      case 'done':
        return { backgroundColor: colors.text.primary };
      case 'current':
        return { backgroundColor: colors.ember.base };
      case 'deload-done':
        return { backgroundColor: colors.plan.tyD };
      case 'deload-upcoming':
        return [styles.outlined, { backgroundColor: colors.plan.rbS, borderColor: colors.plan.tyD }];
      default:
        return [styles.outlined, { borderColor: colors.divider }];
    }
  };
  const anchorTone = (tone: AnchorBarTone) => {
    switch (tone) {
      case 'done':
        return { backgroundColor: colors.text.primary };
      case 'current':
        return { backgroundColor: colors.ember.base };
      case 'deload':
        return { backgroundColor: colors.plan.tyD };
      default:
        return [styles.outlined, { borderColor: colors.divider }];
    }
  };

  return (
    <>
      <View style={styles.blocksRow}>
        {detail.blocks.map(block => (
          <View key={block.blockIndex} style={styles.blockCol}>
            <View>
              <TextV2 variant="metaStrong" style={styles.bold}>
                {t('proposal.block', { n: block.blockIndex })}
              </TextV2>
              <TextV2 variant="caption" color={colors.text.secondary}>
                {t(phaseKey(block.phase))}
              </TextV2>
            </View>
            <View style={styles.bars}>
              {blockBars(block, detail.blocks, currentWeek).map(bar => {
                const week = block.weeks.find(item => item.weekIndex === bar.weekIndex);
                const filled = bar.tone === 'done' || bar.tone === 'deload-done' || bar.tone === 'current';
                const onInk = bar.tone === 'done';
                return (
                  <PressableScale
                    key={bar.weekIndex}
                    accessibilityRole="button"
                    accessibilityLabel={t('plan.weekA11y', { n: bar.weekIndex })}
                    disabled={!week?.startDate}
                    onPress={() => week?.startDate && onOpenWeek(weekStartOf(week.startDate))}
                    style={[styles.bar, { height: Math.round(BAR_BOX * bar.height) }, barStyle(bar.tone)]}
                  >
                    {bar.flag ? (
                      <Flag
                        size={11}
                        color={onInk ? colors.cta.primaryText : filled ? '#121212' : colors.text.primary}
                        strokeWidth={2.2}
                      />
                    ) : null}
                  </PressableScale>
                );
              })}
            </View>
            <View style={styles.barLabels}>
              {block.weeks.map(week => (
                <TextV2
                  key={week.weekIndex}
                  color={week.weekIndex === currentWeek ? colors.plan.emT : colors.text.secondary}
                  style={styles.barLabel}
                >
                  {t('plan.week', { n: week.weekIndex })}
                </TextV2>
              ))}
            </View>
          </View>
        ))}
        {Array.from({ length: Math.max(0, 3 - detail.blocks.length) }, (_, index) => (
          <View key={`spacer-${index}`} style={styles.blockCol} />
        ))}
      </View>
      <View style={styles.legend}>
        {(
          [
            ['plan.legend.done', colors.text.primary],
            ['plan.legend.current', colors.ember.base],
            ['plan.legend.deload', colors.plan.tyD],
          ] as const
        ).map(([key, color]) => (
          <View key={key} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: color }]} />
            <TextV2 variant="caption" color={colors.text.secondary}>
              {t(key)}
            </TextV2>
          </View>
        ))}
        <View style={styles.legendItem}>
          <View style={[styles.swatch, styles.outlined, { borderColor: colors.divider }]} />
          <TextV2 variant="caption" color={colors.text.secondary}>
            {t('plan.legend.upcoming')}
          </TextV2>
        </View>
        <View style={styles.legendItem}>
          <Flag size={11} color={colors.text.primary} strokeWidth={2.2} />
          <TextV2 variant="caption" color={colors.text.secondary}>
            {t('plan.legend.test')}
          </TextV2>
        </View>
      </View>

      <View style={styles.scene}>
        {stats.map(stat => (
          <View key={stat.key} style={styles.stat}>
            <View style={styles.statFigure}>
              <AntonText size={40} color="#FFFFFF" style={styles.statValue}>
                {stat.value}
              </AntonText>
              {stat.unit ? (
                <AntonText size={18} color="#8C8A85">
                  {stat.unit}
                </AntonText>
              ) : null}
            </View>
            <TextV2 variant="caption" color="#A8A6A1">
              {t(`plan.${stat.key}` as 'plan.progress')}
            </TextV2>
          </View>
        ))}
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%` }]} />
        </View>
      </View>

      {goal && progress ? (
        <View style={[surface, styles.gap12]}>
          <View style={styles.goalHead}>
            <Target size={18} color={colors.text.primary} strokeWidth={1.8} />
            <TextV2 color={colors.text.secondary} style={styles.eyebrow}>
              {t('goal.eyebrow')}
            </TextV2>
          </View>
          <TextV2 variant="sub">
            {t(goal.kind === 'kg' ? 'goal.titleKg' : 'goal.titleReps', {
              name: goalName(detail, t),
              n: formatTarget(language, goal.target),
            })}
          </TextV2>
          <View style={styles.goalNow}>
            <AntonText size={40}>{progress.current === null ? '—' : formatTarget(language, progress.current)}</AntonText>
            <TextV2 variant="label" color={colors.text.secondary} style={styles.regular}>
              {t(goal.kind === 'kg' ? 'goal.ofKg' : 'goal.ofReps', { n: formatTarget(language, goal.target) })}
            </TextV2>
          </View>
          <View style={[styles.goalTrack, { backgroundColor: colors.surface.muted }]}>
            <View style={[styles.goalFill, { width: `${Math.round(progress.pct * 100)}%`, backgroundColor: colors.ember.base }]} />
          </View>
          <TextV2 variant="meta" color={colors.text.secondary} style={styles.line}>
            {progress.current === null
              ? t('goal.noData')
              : progress.remaining === 0
                ? t('goal.reached')
                : t(goal.kind === 'kg' ? 'goal.remainingKg' : 'goal.remainingReps', {
                    n: formatTarget(language, progress.remaining ?? 0),
                  }) +
                  (progress.reachWeek !== null
                    ? t(progress.reachWeek < weekCount ? 'goal.reach' : 'goal.reachLast', { w: progress.reachWeek })
                    : '')}
          </TextV2>
        </View>
      ) : null}

      {detail.anchors.length > 0 ? (
        <View style={styles.gap12}>
          <View style={styles.anchorsHead}>
            <TextV2 variant="section">{t('anchors.title')}</TextV2>
            <TextV2 variant="meta" color={colors.text.secondary}>
              {t('anchors.sub')}
            </TextV2>
          </View>
          {detail.anchors.map(anchor => {
            const chart = anchorBars(
              anchor,
              weeks.length > 0 ? weeks : Array.from({ length: weekCount }, (_, index) => ({ weekIndex: index + 1, kind: 'carga' as const })),
              currentWeek,
            );
            const registered = anchor.e1rmByWeek.filter(row => row.e1rm !== null).sort((a, b) => a.weekIndex - b.weekIndex);
            const latest = registered.length > 0 ? (registered[registered.length - 1].e1rm as number) : null;
            const delta = anchor.deltaKg;
            return (
              <View key={anchor.exerciseId} style={[surface, styles.gap12, styles.anchorCard]}>
                <View style={styles.anchorTop}>
                  <View style={styles.anchorTexts}>
                    <TextV2 variant="bodyStrong">{anchor.name}</TextV2>
                    <TextV2
                      variant="captionStrong"
                      color={chart.hasRecords && delta !== null ? colors.plan.emT : colors.text.secondary}
                    >
                      {!chart.hasRecords
                        ? t('anchor.empty')
                        : delta === null
                          ? ''
                          : t(delta >= 0 ? 'anchor.delta' : 'anchor.deltaDown', { n: formatTarget(language, Math.abs(delta)) })}
                    </TextV2>
                  </View>
                  <AntonText size={30} style={styles.anchorValue}>
                    {latest === null ? '—' : `${formatTarget(language, Math.round(latest * 2) / 2)} kg`}
                  </AntonText>
                </View>
                <View style={styles.anchorBars}>
                  {chart.bars.map(bar => (
                    <View
                      key={bar.weekIndex}
                      style={[styles.anchorBar, { height: Math.round(ANCHOR_BOX * bar.height) }, anchorTone(bar.tone)]}
                    />
                  ))}
                </View>
                <View style={styles.anchorCaption}>
                  <TextV2 variant="micro" color={colors.text.secondary} style={styles.captionText}>
                    {t('anchor.weekFirst')}
                  </TextV2>
                  <TextV2 variant="micro" color={colors.text.secondary} style={styles.captionText}>
                    {chart.projectionEnd !== null ? t('anchor.projection', { n: formatTarget(language, chart.projectionEnd) }) : ''}
                  </TextV2>
                  <TextV2 variant="micro" color={colors.text.secondary} style={styles.captionText}>
                    {t('anchor.weekLast', { n: weekCount })}
                  </TextV2>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      <PressableScale
        accessibilityRole="button"
        onPress={onManage}
        style={[styles.manage, { backgroundColor: colors.surface.muted }]}
      >
        <SlidersHorizontal size={16} color={colors.text.primary} strokeWidth={2} />
        <TextV2 variant="bodyStrong">{t('plan.manage')}</TextV2>
      </PressableScale>
    </>
  );
}

const styles = StyleSheet.create({
  regular: { fontWeight: '400' },
  bold: { fontWeight: '700' },
  gap12: { gap: 12 },
  blocksRow: { flexDirection: 'row', gap: 10 },
  blockCol: { flex: 1, gap: 8 },
  bars: { height: BAR_BOX, flexDirection: 'row', gap: 4, alignItems: 'flex-end' },
  bar: { flex: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 5 },
  outlined: { borderWidth: 1.5 },
  barLabels: { flexDirection: 'row', gap: 4 },
  barLabel: { flex: 1, textAlign: 'center', fontSize: 10.5, fontWeight: '600' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6, marginTop: -8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  scene: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 14,
    columnGap: 8,
    padding: 18,
    borderRadius: 22,
    backgroundColor: '#141312',
  },
  stat: { width: '31%', gap: 6, minWidth: 0 },
  statFigure: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  statValue: { lineHeight: 44 },
  track: { width: '100%', height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,.12)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2, backgroundColor: '#FF5B1F' },
  card: { padding: 18, borderRadius: 22 },
  shadow: { boxShadow: '0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.05)' },
  ring: { borderWidth: 1 },
  goalHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  goalNow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 6 },
  goalTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  goalFill: { height: '100%', borderRadius: 4 },
  line: { lineHeight: 19 },
  anchorsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  anchorCard: { padding: 16, borderRadius: 20 },
  anchorTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  anchorTexts: { flex: 1, minWidth: 0, gap: 2 },
  anchorValue: { flexShrink: 0 },
  anchorBars: { height: ANCHOR_BOX, flexDirection: 'row', gap: 4, alignItems: 'flex-end' },
  anchorBar: { flex: 1, borderRadius: 4 },
  anchorCaption: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  captionText: { fontSize: 11 },
  manage: {
    minHeight: 50,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
