import { useMemo, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowRight, Trophy, TrendingUp } from 'lucide-react-native';
import { BackButton, Button, GlassHeader, StatusBarV2, TextV2, useThemeV2 } from '@app/components/v2';
import { APP_ROUTES, ROOT_ROUTES } from '@app/constants/routes';
import {
  improvedAnchors,
  localDayOf,
  nextWeekStart,
  plannedSessions,
  recordsBetween,
  reviewAdjustments,
  volumeTonnes,
  weekBounds,
} from '@app/features/trainingPlan/planReviewModel';
import {
  longDate,
  phaseKey,
  useTrainingPlanText,
} from '@app/features/trainingPlan/trainingPlanCopy';
import { formatTarget } from '@app/features/trainingPlan/trainingPlanModel';
import { usePlanDetailOf, usePlanReview } from '@app/features/trainingPlan/usePlanReview';
import { PlanAdjustmentChatCard } from '@app/features/trainingPlan/v2/PlanAdjustmentCard';
import { AntonText, PlanEyebrow } from '@app/features/trainingPlan/v2/PlanParts';
import { PlanError, PlanLoading } from '@app/features/trainingPlan/v2/PlanStates';
import { useExerciseNames } from '@app/hooks/useCatalog';
import { usePersonalRecords } from '@app/hooks/usePersonalRecords';
import { useWeekPlan } from '@app/hooks/useWeekPlan';
import { safeGoBack } from '@app/navigation/safeGoBack';
import { formatPRValue } from '@app/shared';
import type { AdjustmentAction } from '@app/services/supabase/trainingPlanSession';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'PlanReview'>;

const BACK_FALLBACKS = [ROOT_ROUTES.MainTabs];
const capitalize = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

// Revisión semanal (handoff v2.21 §31.9): "Domingo 8 nov · 19:00", SEMANA 6
// de 12, Lo que hiciste (sessions of the week's plan, sets and volume), Lo
// que mejoró (1RM of each anchor against the previous week and the records
// of those dates), Ajustes automáticos (applied, antes → después), Para
// revisar (the open ones, with the adjustment card) and "Ver semana {n+1}".
// Opens from the row of Semana and from the push; without a review yet it
// says when the first one arrives.
export function PlanReviewScreen({ navigation, route }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const { t, language } = useTrainingPlanText();
  const requested = route.params?.weekIndex ?? null;
  const review = usePlanReview(requested);
  const data = review.data ?? null;
  const detail = usePlanDetailOf(data?.planId);
  const bounds = weekBounds(detail.data, data?.weekIndex ?? 0);
  const week = useWeekPlan(Boolean(data && bounds), bounds?.start ?? null);
  const records = usePersonalRecords();
  const [answered, setAnswered] = useState<Record<string, AdjustmentAction>>({});

  const week_ = data?.weekIndex ?? 0;
  const anchors = useMemo(
    () => (detail.data ? improvedAnchors(detail.data.anchors, week_) : []),
    [detail.data, week_],
  );
  const weekRecords = useMemo(
    () => (bounds ? recordsBetween(records.data ?? [], bounds.start, bounds.end) : []),
    [bounds, records.data],
  );
  const { names } = useExerciseNames(weekRecords.map(record => record.exerciseId));
  const adjustments = useMemo(() => reviewAdjustments(data?.adjustments ?? []), [data?.adjustments]);

  const back = () => safeGoBack(navigation, BACK_FALLBACKS);
  const retry = () => {
    review.refetch().catch(() => undefined);
    detail.refetch().catch(() => undefined);
  };
  const backToWeek = () => navigation.navigate(APP_ROUTES.Week, { view: 'plan' });

  let body: ReactNode;
  if (review.isError || detail.isError) {
    body = <PlanError onRetry={retry} />;
  } else if (review.isLoading || (data && detail.isLoading)) {
    body = <PlanLoading />;
  } else if (!data) {
    // not_found: there is no review yet.
    body = (
      <View style={styles.gap16}>
        <AntonText size={34}>{t('review.empty.title')}</AntonText>
        <TextV2 variant="body" color={colors.text.secondary}>
          {t('review.empty.body')}
        </TextV2>
        <Button label={t('review.empty.back')} variant="secondary" fullWidth onPress={backToWeek} />
      </View>
    );
  } else {
    const total = detail.data?.weeks ?? 0;
    const block = detail.data?.blocks.find(item => item.weeks.some(row => row.weekIndex === data.weekIndex));
    const day = localDayOf(data.createdAt);
    const planned = plannedSessions(week.data, data.sessionsDone, data.sessionsMissed);
    const nextStart = nextWeekStart(detail.data, data.weekIndex);
    const hasBetter = anchors.length > 0 || weekRecords.length > 0;

    body = (
      <>
        <View style={styles.gap8}>
          {day ? (
            <PlanEyebrow color={colors.text.secondary}>
              {t('review.when', { date: capitalize(longDate(language, day)) })}
            </PlanEyebrow>
          ) : null}
          <View style={styles.weekRow}>
            <AntonText size={54}>{t('phase.big', { n: data.weekIndex })}</AntonText>
            {total > 0 ? (
              <AntonText size={26} color={colors.text.secondary}>
                {t('phase.of', { n: total })}
              </AntonText>
            ) : null}
          </View>
          {block ? (
            <TextV2 variant="label" color={colors.text.secondary} style={styles.regular}>
              {t('review.block', { b: block.blockIndex, phase: t(phaseKey(block.phase)) })}
            </TextV2>
          ) : null}
        </View>

        <Section title={t('review.did')}>
          <View style={styles.scene}>
            <Stat value={String(data.sessionsDone)} unit={`/${planned}`} label={t('review.sessions')} />
            <Stat value={String(data.sets)} label={t('review.sets')} />
            <Stat value={volumeTonnes(data.volumeKg, language)} unit="t" label={t('review.volume')} />
          </View>
        </Section>

        {hasBetter ? (
          <Section title={t('review.better')}>
            {anchors.map(anchor => (
              <Row
                key={anchor.exerciseId}
                icon={<TrendingUp size={18} color={colors.text.primary} strokeWidth={2} />}
                title={anchor.name}
                sub={
                  anchor.delta === null
                    ? t('review.better.first')
                    : t('review.better.delta', { n: formatTarget(language, anchor.delta) })
                }
                value={`${formatTarget(language, anchor.e1rm)} kg`}
              />
            ))}
            {weekRecords.map(record => (
              <Row
                key={record.id}
                icon={<Trophy size={18} color={colors.text.primary} strokeWidth={2} />}
                title={names[record.exerciseId] ?? ''}
                sub={t('review.better.record')}
                value={formatPRValue(record)}
              />
            ))}
          </Section>
        ) : null}

        {adjustments.applied.length > 0 ? (
          <Section title={t('review.auto')} aside={t('review.auto.sub')}>
            {adjustments.applied.map(adjustment => (
              <View key={adjustment.id} style={[styles.autoRow, { borderBottomColor: colors.divider }]}>
                <TextV2 variant="bodyStrong" style={styles.autoTitle}>
                  {adjustment.kind === 'missed_session' && adjustment.sessions[0]
                    ? adjustment.sessions[0].title
                    : t(`adj.title.${adjustment.kind}` as 'adj.title.variant_stall')}
                </TextV2>
                {adjustment.before !== null || adjustment.after !== null ? (
                  <View style={styles.autoChange}>
                    <TextV2 variant="label" color={colors.text.secondary} style={styles.regular}>
                      {adjustment.before ?? '—'}
                    </TextV2>
                    <ArrowRight size={13} color={colors.text.secondary} strokeWidth={2} />
                    <TextV2 variant="bodyStrong">{adjustment.after ?? '—'}</TextV2>
                  </View>
                ) : null}
              </View>
            ))}
          </Section>
        ) : null}

        {adjustments.open.length > 0 ? (
          <Section
            title={t('review.pending')}
            aside={t(adjustments.open.length === 1 ? 'review.pending.one' : 'review.pending.other', {
              n: adjustments.open.length,
            })}
          >
            <View style={styles.gap12}>
              {adjustments.open.map(adjustment => (
                <PlanAdjustmentChatCard
                  key={adjustment.id}
                  adjustment={adjustment}
                  answered={answered[adjustment.id] ?? null}
                  onAnswered={action => setAnswered(current => ({ ...current, [adjustment.id]: action }))}
                />
              ))}
            </View>
          </Section>
        ) : null}

        {nextStart ? (
          <Button
            label={t('review.cta', { n: data.weekIndex + 1 })}
            size="lg"
            fullWidth
            onPress={() => navigation.navigate(APP_ROUTES.Week, { view: 'plan', weekStart: nextStart })}
          />
        ) : null}
      </>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <GlassHeader title={t('review.title')} left={<BackButton onPress={back} />} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: layout.gutter, paddingBottom: insets.bottom + 48 },
        ]}
      >
        {body}
      </ScrollView>
    </View>
  );
}

function Section({ title, aside, children }: { title: string; aside?: string; children: ReactNode }) {
  const { colors } = useThemeV2();
  return (
    <View style={styles.gap4}>
      <View style={styles.sectionHead}>
        <TextV2 variant="section">{title}</TextV2>
        {aside ? (
          <TextV2 variant="label" color={colors.text.secondary} style={styles.regular}>
            {aside}
          </TextV2>
        ) : null}
      </View>
      {children}
    </View>
  );
}

// One of the three figures of Lo que hiciste, on the dark scene.
function Stat({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <View style={styles.stat}>
      <View style={styles.statFigure}>
        <AntonText size={38} color="#FFFFFF" style={styles.statValue}>
          {value}
        </AntonText>
        {unit ? (
          <AntonText size={18} color="#8C8A85">
            {unit}
          </AntonText>
        ) : null}
      </View>
      <TextV2 variant="caption" color="#A8A6A1">
        {label}
      </TextV2>
    </View>
  );
}

function Row({ icon, title, sub, value }: { icon: ReactNode; title: string; sub: string; value: string }) {
  const { colors } = useThemeV2();
  return (
    <View style={[styles.row, { borderBottomColor: colors.divider }]}>
      <View style={[styles.rowIcon, { backgroundColor: colors.plan.emS }]}>{icon}</View>
      <View style={styles.rowTexts}>
        <TextV2 variant="bodyStrong" numberOfLines={2}>
          {title}
        </TextV2>
        <TextV2 variant="caption" color={colors.text.secondary}>
          {sub}
        </TextV2>
      </View>
      <TextV2 variant="bodyStrong" color={colors.plan.emT} style={styles.rowValue}>
        {value}
      </TextV2>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingTop: 12, gap: 24 },
  regular: { fontWeight: '400' },
  gap4: { gap: 4 },
  gap8: { gap: 8 },
  gap12: { gap: 12 },
  gap16: { gap: 16 },
  weekRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 10 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 4 },
  scene: {
    flexDirection: 'row',
    gap: 8,
    padding: 18,
    borderRadius: 22,
    backgroundColor: '#141312',
  },
  stat: { flex: 1, minWidth: 0, gap: 6 },
  statFigure: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  statValue: { lineHeight: 44 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rowTexts: { flex: 1, minWidth: 0, gap: 2 },
  rowValue: { flexShrink: 0 },
  autoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 12,
    rowGap: 4,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  autoTitle: { flex: 1, minWidth: 140 },
  autoChange: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
});
