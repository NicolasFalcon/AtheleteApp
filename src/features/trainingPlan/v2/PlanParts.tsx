import { useState, type ReactNode } from 'react';
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { ArrowRight, CalendarDays, ChevronRight, Flag, Lock } from 'lucide-react-native';
import { PressableScale, TextV2, useThemeV2 } from '@app/components/v2';
import { useTrainingPlanText } from '@app/features/trainingPlan/trainingPlanCopy';
import { isPlanPaywalled } from '@app/features/trainingPlan/managePlanModel';
import { isDeloadWeek } from '@app/features/trainingPlan/trainingPlanModel';
import { PremiumSheet } from '@app/features/trainingPlan/v2/PremiumSheet';
import type { PlanWeekKind, TrainingPlanState } from '@app/services/supabase/trainingPlan';

// Shared pieces of the training plan (handoff v2.21 §31). The entry cards are
// scenes (#141312) in both modes, as in Week / Workouts of the handoff.

const SCENE = '#141312';
const ON_SCENE = '#FFFFFF';
const ON_SCENE_BODY = '#D8D6D1';
const EYEBROW_EMBER = '#FF8A5C';

// Anton for headlines, phases and big figures, always caps (§31.0). A line
// height of 1.12 (as Coach §30) so a long English title can wrap.
export function antonText(fontFamily: string, size: number): TextStyle {
  return {
    fontFamily,
    fontSize: size,
    fontWeight: Platform.OS === 'ios' ? '700' : '400',
    lineHeight: Math.round(size * 1.12),
    letterSpacing: 0,
    textTransform: 'uppercase',
  };
}

export function AntonText({
  size,
  color,
  children,
  style,
  numberOfLines,
}: {
  size: number;
  color?: string;
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const { fonts } = useThemeV2();
  return (
    <TextV2 color={color} numberOfLines={numberOfLines} style={[antonText(fonts.display, size), style]}>
      {children}
    </TextV2>
  );
}

// Eyebrow of the plan: 11 pt, 700, tracking .1em, caps (§31.0).
export function PlanEyebrow({
  children,
  color,
  leading,
}: {
  children: ReactNode;
  color?: string;
  leading?: ReactNode;
}) {
  return (
    <View style={styles.eyebrowRow}>
      {leading}
      <TextV2 color={color} style={styles.eyebrow}>
        {children}
      </TextV2>
    </View>
  );
}

// "Crear plan" (31.4 · Week above "Planificar la semana", Workouts under
// "Tu próxima sesión").
// `locked` (31.12, free version): the arrow becomes a lock.
export function CreatePlanCard({
  onPress,
  locked = false,
  style,
}: {
  onPress: () => void;
  locked?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { mode } = useThemeV2();
  const { t } = useTrainingPlanText();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${t('card.create.title')}. ${t('card.create.body')}${locked ? `. ${t('lock.eyebrow')}` : ''}`}
      onPress={onPress}
      style={[styles.card, styles.createCard, mode === 'dark' ? styles.darkRing : null, style]}
    >
      <View style={styles.createTexts}>
        <PlanEyebrow color={EYEBROW_EMBER} leading={<View style={styles.dot} />}>
          {t('card.create.eyebrow')}
        </PlanEyebrow>
        <AntonText size={26} color={ON_SCENE}>
          {t('card.create.title')}
        </AntonText>
        <TextV2 variant="meta" color={ON_SCENE_BODY}>
          {t('card.create.body')}
        </TextV2>
      </View>
      <View style={styles.arrow}>
        {locked ? (
          <Lock size={17} color="#121212" strokeWidth={2.2} />
        ) : (
          <ArrowRight size={18} color="#121212" strokeWidth={2.2} />
        )}
      </View>
    </PressableScale>
  );
}

// "Plan terminado" (31.4): in Tu semana instead of Crear plan. Ver reporte
// opens the final report (31.10); without a plan id it stays disabled.
export function PlanFinishedCard({
  name,
  weeks,
  onCreate,
  onReport,
  style,
}: {
  name: string | null;
  weeks: number | null;
  onCreate: () => void;
  onReport?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { mode } = useThemeV2();
  const { t } = useTrainingPlanText();
  const reportOff = !onReport;
  return (
    <View style={[styles.card, styles.finishedCard, mode === 'dark' ? styles.darkRing : null, style]}>
      <View style={styles.finishedTexts}>
        <PlanEyebrow
          color={EYEBROW_EMBER}
          leading={<Flag size={13} color={ON_SCENE} strokeWidth={2} style={styles.flag} />}
        >
          {weeks ? t('card.finished.eyebrow', { n: weeks }) : t('card.finished.eyebrowNoWeeks')}
        </PlanEyebrow>
        {name ? (
          <AntonText size={26} color={ON_SCENE}>
            {name}
          </AntonText>
        ) : null}
        <TextV2 variant="meta" color={ON_SCENE_BODY}>
          {t('card.finished.body')}
        </TextV2>
      </View>
      <View style={styles.finishedActions}>
        <PressableScale
          accessibilityRole="button"
          accessibilityState={{ disabled: reportOff }}
          accessibilityHint={reportOff ? t('card.finished.reportSoon') : undefined}
          disabled={reportOff}
          onPress={onReport}
          style={[styles.pill, styles.pillGhost, reportOff ? styles.pillOff : null]}
        >
          <TextV2 variant="label" color={ON_SCENE} align="center">
            {t('card.finished.report')}
          </TextV2>
        </PressableScale>
        <PressableScale
          accessibilityRole="button"
          onPress={onCreate}
          style={[styles.pill, styles.pillWhite]}
        >
          <TextV2 variant="label" color="#121212" align="center">
            {t('card.finished.create')}
          </TextV2>
        </PressableScale>
      </View>
    </View>
  );
}

// The entry card by the plan's state: none → Crear plan; completed → Plan
// terminado (only where `finished` is wanted, Tu semana); active, paused or
// unknown → nothing. In the free version (31.12) Crear plan carries the lock
// and opens the Premium sheet instead of Crear plan.
export function PlanEntryCard({
  plan,
  finished = false,
  onCreate,
  onReport,
  style,
}: {
  plan: TrainingPlanState | null | undefined;
  finished?: boolean;
  onCreate: () => void;
  // Ver reporte of the finished card, with the id of the plan.
  onReport?: (planId: string) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const [premium, setPremium] = useState(false);
  if (!plan) {
    return null;
  }
  const locked = isPlanPaywalled(plan);
  const create = locked ? () => setPremium(true) : onCreate;
  let card: ReactNode = null;
  if (plan.state === 'completed' && finished) {
    const reportId = plan.planId;
    card = (
      <PlanFinishedCard
        name={plan.name}
        weeks={plan.weeks}
        onCreate={create}
        onReport={onReport && reportId ? () => onReport(reportId) : undefined}
        style={style}
      />
    );
  } else if (plan.state === 'none' || plan.state === 'completed') {
    card = <CreatePlanCard onPress={create} locked={locked} style={style} />;
  }
  if (!card) {
    return null;
  }
  return (
    <>
      {card}
      <PremiumSheet open={premium} onClose={() => setPremium(false)} />
    </>
  );
}

// Miniature line of weeks by block (31.1 durations, 31.2 card): loading
// weeks in `fill`, deloads in Recovery Blue.
export function BlockSegments({
  blocks,
  fill,
  segmentWidth,
  labels,
}: {
  blocks: PlanWeekKind[][];
  fill: string;
  segmentWidth?: number;
  labels?: string[];
}) {
  const { colors } = useThemeV2();
  return (
    <View style={styles.blocks}>
      {blocks.map((weeks, blockIndex) => (
        <View key={blockIndex} style={segmentWidth ? styles.blockFixed : styles.block}>
          <View style={styles.blockRow}>
            {weeks.map((kind, index) => (
              <View
                key={index}
                style={[
                  styles.segment,
                  segmentWidth ? [styles.segmentFixed, { width: segmentWidth }] : null,
                  { backgroundColor: isDeloadWeek(kind) ? colors.plan.tyD : fill },
                ]}
              />
            ))}
          </View>
          {labels?.[blockIndex] ? (
            <TextV2 variant="micro" color={colors.text.secondary} style={styles.blockLabel}>
              {labels[blockIndex]}
            </TextV2>
          ) : null}
        </View>
      ))}
    </View>
  );
}

// Progreso · "Plan de la semana" (31.4): the week's line and "Ver plan".
// It opens "Ver semana", which picks the view by the plan's state.
export function WeekPlanRow({ line, onPress }: { line: string; onPress: () => void }) {
  const { colors } = useThemeV2();
  const { t } = useTrainingPlanText();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${t('progress.title')}. ${line}`}
      onPress={onPress}
      style={[styles.weekRow, { borderTopColor: colors.divider, borderBottomColor: colors.divider }]}
    >
      <CalendarDays size={20} color={colors.text.primary} strokeWidth={1.8} style={styles.weekIcon} />
      <View style={styles.weekTexts}>
        <TextV2 variant="bodyStrong">{t('progress.title')}</TextV2>
        <TextV2 variant="meta" color={colors.text.secondary} numberOfLines={2}>
          {line}
        </TextV2>
      </View>
      <View style={styles.weekAction}>
        <TextV2 variant="metaStrong">{t('progress.view')}</TextV2>
        <ChevronRight size={14} color={colors.text.secondary} strokeWidth={2} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  weekIcon: { opacity: 0.75 },
  weekTexts: { flex: 1, minWidth: 0, gap: 2 },
  weekAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  card: { borderRadius: 24, backgroundColor: SCENE, padding: 18 },
  darkRing: { borderWidth: 1, borderColor: 'rgba(255,255,255,.08)' },
  createCard: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  createTexts: { flex: 1, minWidth: 0, gap: 6 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  eyebrow: {
    flexShrink: 1,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF5B1F' },
  flag: { opacity: 0.85 },
  arrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ON_SCENE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishedCard: { gap: 14 },
  finishedTexts: { gap: 6 },
  finishedActions: { flexDirection: 'row', gap: 8 },
  pill: {
    flex: 1,
    minHeight: 46,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillGhost: { backgroundColor: 'rgba(255,255,255,.12)' },
  pillWhite: { backgroundColor: ON_SCENE },
  pillOff: { opacity: 0.5 },
  blocks: { flexDirection: 'row', gap: 6 },
  block: { flex: 1, gap: 4 },
  blockFixed: { gap: 4 },
  blockRow: { flexDirection: 'row', gap: 2 },
  segment: { flex: 1, height: 6, borderRadius: 3 },
  segmentFixed: { flex: 0 },
  blockLabel: { fontSize: 10.5 },
});
