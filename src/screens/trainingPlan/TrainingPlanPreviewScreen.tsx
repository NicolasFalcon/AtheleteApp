import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ChevronRight, CircleAlert } from 'lucide-react-native';
import {
  AuraMark,
  BackButton,
  GlassHeader,
  PressableScale,
  Skeleton,
  SkeletonGroup,
  StatusBarV2,
  TextV2,
  sessionTypeColor,
  useThemeV2,
} from '@app/components/v2';
import { APP_ROUTES, ROOT_ROUTES } from '@app/constants/routes';
import { BlockError } from '@app/features/home/v2/BlockError';
import {
  DAY_LETTERS,
  joinNames,
  longDate,
  phaseKey,
  sessionTypeKey,
  shortDate,
  useTrainingPlanText,
  weekKindKey,
} from '@app/features/trainingPlan/trainingPlanCopy';
import { groupByBlock, replacementSummary } from '@app/features/trainingPlan/trainingPlanModel';
import { useOpenWeek } from '@app/features/trainingPlan/useOpenWeek';
import { useTrainingPlanActivation } from '@app/features/trainingPlan/useTrainingPlanActivation';
import {
  trainingPlanKeys,
  useTrainingPlanState,
} from '@app/features/trainingPlan/useTrainingPlanState';
import { AntonText } from '@app/features/trainingPlan/v2/PlanParts';
import { safeGoBack } from '@app/navigation/safeGoBack';
import { getProposal } from '@app/services/ellie/ellieProposals';
import { fetchTrainingPlanPreview } from '@app/services/supabase/trainingPlan';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'TrainingPlanPreview'>;

const BACK_FALLBACKS = [ROOT_ROUTES.MainTabs];

// 0 = Monday … 6 = Sunday of a YYYY-MM-DD date.
function weekdayIndex(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return (new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay() + 6) % 7;
}

// Detalle antes de activar (handoff v2.21 §31.3): get_training_plan_preview
// of the proposal's draft. Name in Anton and "12 semanas · 4 días · 60 min ·
// 48 sesiones · del 9 nov al 31 ene"; the replacement notice when `replaces`
// is not empty; the weeks grouped by block, each with its dates, its tag
// (Calibración, Descarga, Descarga y test) and its sessions with the bar of
// their type. Fixed CTA: Activar plan + Ajustar (back to the chat with the
// adjust chips open).
export function TrainingPlanPreviewScreen({ navigation, route }: Props) {
  const { proposalId } = route.params;
  const { colors, layout, mode } = useThemeV2();
  const insets = useSafeAreaInsets();
  const { t, language } = useTrainingPlanText();
  const openWeek = useOpenWeek();
  const planState = useTrainingPlanState();
  const [activated, setActivated] = useState<{ startDate: string | null } | null>(null);

  const preview = useQuery({
    queryKey: trainingPlanKeys.preview(proposalId),
    queryFn: () => fetchTrainingPlanPreview(proposalId),
    staleTime: 60 * 1000,
  });
  // The proposal's payload fills what the preview leaves out (name, days…).
  const proposal = useQuery({
    queryKey: ['ellie', 'proposal', proposalId],
    queryFn: () => getProposal(proposalId),
    staleTime: 60 * 1000,
  });
  const plan = proposal.data?.training ?? null;

  const activation = useTrainingPlanActivation({
    onActivated: (_, startDate) => setActivated({ startDate }),
    onNotOpen: () => safeGoBack(navigation, BACK_FALLBACKS),
  });
  const activating = activation.busyId === proposalId;
  // Already active (here, in the chat or before): the plan's draft is the
  // active plan, or get_proposal says so.
  const isActive =
    activated !== null ||
    proposal.data?.status === 'active' ||
    (Boolean(plan?.planId) &&
      plan?.planId === planState.data?.planId &&
      (planState.data?.state === 'active' || planState.data?.state === 'paused'));

  const data = preview.data;
  const name = data?.name ?? plan?.name ?? t('proposal.defaultName');
  const weeks = data?.weeks ?? plan?.weeks ?? 0;
  const days = (data?.daysOfWeek.length || plan?.daysOfWeek.length) ?? 0;
  const minutes = data?.sessionMinutes ?? plan?.sessionMinutes ?? 0;
  // Counted from the preview's weeks; the proposal's total until it loads.
  const sessions = data?.totalSessions ?? plan?.totalSessions ?? 0;
  const startDate = data?.startDate ?? plan?.startDate ?? data?.planWeeks[0]?.startDate ?? null;
  const endDate =
    data?.endDate ?? plan?.endDate ?? data?.planWeeks[data.planWeeks.length - 1]?.endDate ?? null;
  const meta = [
    t('preview.meta', { weeks, days, min: minutes, n: sessions }),
    startDate && endDate
      ? t('preview.range', { from: shortDate(language, startDate), to: shortDate(language, endDate) })
      : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const replaced = replacementSummary(data?.replaces ?? []);
  const blocks = groupByBlock(data?.planWeeks ?? []);
  const letters = DAY_LETTERS[language];

  const adjust = () =>
    navigation.popTo(
      APP_ROUTES.EllieChat,
      { planAdjust: { proposalId, at: Date.now() } },
      { merge: true },
    );

  const activate = () =>
    activation
      .activate({ proposalId, startDate: plan?.startDate ?? startDate })
      .catch(() => undefined);

  const body = preview.isError ? (
    <BlockError message={t('preview.error')} onRetry={() => preview.refetch()} />
  ) : !data ? (
    <View style={styles.loading}>
      <View style={styles.loadingRow}>
        <AuraMark size={24} state="processing" />
        <TextV2 variant="meta" color={colors.text.secondary}>
          {t('preview.loading')}
        </TextV2>
      </View>
      <SkeletonGroup>
        <View style={styles.gap14}>
          <Skeleton height={44} width="80%" />
          <Skeleton height={16} width="60%" />
          <Skeleton height={180} radius={18} />
          <Skeleton height={180} radius={18} />
        </View>
      </SkeletonGroup>
    </View>
  ) : (
    <>
      <View style={styles.head}>
        <TextV2 color={colors.plan.emT} style={styles.eyebrow}>
          {t('preview.eyebrow')}
        </TextV2>
        <AntonText size={44}>{name}</AntonText>
        <TextV2 variant="label" color={colors.text.secondary} style={styles.regular}>
          {meta}
        </TextV2>
      </View>

      {replaced.count > 0 ? (
        <View style={[styles.notice, { backgroundColor: colors.plan.emS }]}>
          <CircleAlert size={20} color={colors.text.primary} strokeWidth={2} style={styles.noticeIcon} />
          <View style={styles.noticeTexts}>
            <TextV2 variant="bodyStrong">
              {replaced.count === 1
                ? t('preview.replace.one')
                : t('preview.replace.other', { n: replaced.count })}
            </TextV2>
            <TextV2 variant="label" color={colors.text.secondary} style={styles.regular}>
              {replaced.from === replaced.to
                ? t('preview.replace.bodyOne', {
                    names: joinNames(language, replaced.names),
                    from: replaced.from ? longDate(language, replaced.from) : '',
                  })
                : t('preview.replace.body', {
                    names: joinNames(language, replaced.names),
                    from: replaced.from ? shortDate(language, replaced.from) : '',
                    to: replaced.to ? shortDate(language, replaced.to) : '',
                  })}
            </TextV2>
          </View>
        </View>
      ) : null}

      {blocks.map(block => {
        const first = block.weeks[0]?.weekIndex ?? 1;
        const last = block.weeks[block.weeks.length - 1]?.weekIndex ?? first;
        return (
          <View key={block.blockIndex} style={styles.block}>
            <View style={[styles.blockHead, { borderTopColor: colors.divider }]}>
              <AntonText size={26} style={styles.shrink}>
                {t('preview.block', { n: block.blockIndex, phase: t(phaseKey(block.weeks[0].phase)) })}
              </AntonText>
              <TextV2 variant="meta" color={colors.text.secondary}>
                {t('preview.blockWeeks', { a: first, b: last })}
              </TextV2>
            </View>
            {block.weeks.map(week => {
              const tagKey = weekKindKey(week.kind);
              const calibration = week.kind === 'calibracion';
              return (
                <View key={week.weekIndex} style={styles.week}>
                  <View style={styles.weekHead}>
                    <TextV2 variant="bodyStrong" style={styles.fs16}>
                      {t('preview.week', { n: week.weekIndex })}
                    </TextV2>
                    {week.startDate && week.endDate ? (
                      <TextV2 variant="meta" color={colors.text.secondary}>
                        {`${shortDate(language, week.startDate)} – ${shortDate(language, week.endDate)}`}
                      </TextV2>
                    ) : null}
                    {tagKey ? (
                      <View
                        style={[
                          styles.tag,
                          { backgroundColor: calibration ? colors.plan.emS : colors.plan.rbS },
                        ]}
                      >
                        <TextV2
                          color={calibration ? colors.plan.emT : colors.plan.rbT}
                          style={styles.tagText}
                        >
                          {t(tagKey)}
                        </TextV2>
                      </View>
                    ) : null}
                  </View>
                  <View
                    style={[
                      styles.sessions,
                      { backgroundColor: colors.surface.raised },
                      mode === 'light' ? styles.lightShadow : [styles.darkBorder, { borderColor: colors.border.onDark }],
                    ]}
                  >
                    {week.sessions.length === 0 ? (
                      <TextV2 variant="meta" color={colors.text.secondary} style={styles.noSessions}>
                        {t('preview.noSessions')}
                      </TextV2>
                    ) : (
                      week.sessions.map((session, index) => (
                        <View
                          key={`${session.date}-${index}`}
                          style={[
                            styles.session,
                            index < week.sessions.length - 1
                              ? [styles.sessionDivider, { borderBottomColor: colors.divider }]
                              : null,
                          ]}
                        >
                          <TextV2 color={colors.text.secondary} style={styles.dayLetter}>
                            {session.date ? letters[weekdayIndex(session.date)] : ''}
                          </TextV2>
                          <View
                            style={[
                              styles.bar,
                              {
                                backgroundColor: session.type
                                  ? sessionTypeColor(colors, session.type)
                                  : colors.divider,
                              },
                            ]}
                          />
                          <View style={styles.sessionTexts}>
                            <TextV2 variant="label">{session.title}</TextV2>
                            <TextV2 variant="caption" color={colors.text.secondary}>
                              {[
                                session.type ? t(sessionTypeKey(session.type)) : null,
                                session.minutes ? `${session.minutes} min` : null,
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </TextV2>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        );
      })}
    </>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <GlassHeader
        title={t('preview.header')}
        left={<BackButton onPress={() => safeGoBack(navigation, BACK_FALLBACKS)} />}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: layout.gutter, paddingBottom: insets.bottom + 150 },
        ]}
      >
        {body}
      </ScrollView>

      {data || plan ? (
        <View
          pointerEvents="box-none"
          style={[styles.footer, { paddingHorizontal: layout.gutter, paddingBottom: Math.max(insets.bottom, 20) + 14 }]}
        >
          <LinearGradient
            pointerEvents="none"
            colors={[mode === 'light' ? 'rgba(247,246,243,0)' : 'rgba(18,17,16,0)', colors.bg]}
            locations={[0, 0.3]}
            style={StyleSheet.absoluteFill}
          />
          {isActive ? (
            <View style={styles.activeRow}>
              <View style={styles.activeLeft}>
                <View style={[styles.check, { backgroundColor: colors.ember.base }]}>
                  <Check size={18} color="#121212" strokeWidth={2.6} />
                </View>
                <View style={styles.shrink}>
                  <TextV2 variant="bodyStrong" style={styles.fs16}>
                    {t('proposal.active')}
                  </TextV2>
                  {activated?.startDate ?? startDate ? (
                    <TextV2 variant="caption" color={colors.text.secondary}>
                      {t('proposal.starts', {
                        date: longDate(language, (activated?.startDate ?? startDate) as string),
                      })}
                    </TextV2>
                  ) : null}
                </View>
              </View>
              <PressableScale accessibilityRole="button" onPress={() => openWeek()} style={styles.viewWeek}>
                <TextV2 variant="label">{t('proposal.viewWeek')}</TextV2>
                <ChevronRight size={14} color={colors.text.primary} strokeWidth={2.2} />
              </PressableScale>
            </View>
          ) : (
            <View style={styles.ctaRow}>
              <PressableScale
                accessibilityRole="button"
                accessibilityState={{ busy: activating, disabled: activating }}
                disabled={activating}
                onPress={activate}
                style={[styles.cta, { backgroundColor: colors.cta.primary }]}
              >
                {activating ? (
                  <AuraMark size={20} state="processing" tone={mode === 'light' ? 'dark' : 'light'} />
                ) : null}
                <TextV2 variant="cta" color={colors.cta.primaryText} align="center">
                  {activating ? t('proposal.activating') : t('preview.activate')}
                </TextV2>
              </PressableScale>
              <PressableScale
                accessibilityRole="button"
                disabled={activating}
                onPress={adjust}
                style={[styles.adjust, { backgroundColor: colors.surface.muted }]}
              >
                <TextV2 variant="bodyStrong">{t('preview.adjust')}</TextV2>
              </PressableScale>
            </View>
          )}
        </View>
      ) : null}

      {activation.sheets}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  shrink: { flexShrink: 1 },
  regular: { fontWeight: '400' },
  fs16: { fontSize: 16 },
  gap14: { gap: 14 },
  content: { paddingTop: 8, gap: 22 },
  loading: { gap: 18 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  head: { gap: 8 },
  eyebrow: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, borderRadius: 20 },
  noticeIcon: { marginTop: 1 },
  noticeTexts: { flex: 1, gap: 4 },
  block: { gap: 18 },
  blockHead: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    columnGap: 10,
    borderTopWidth: 1,
    paddingTop: 16,
  },
  week: { gap: 10 },
  weekHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8, rowGap: 4 },
  tag: { minHeight: 20, paddingHorizontal: 8, borderRadius: 10, justifyContent: 'center' },
  tagText: { fontSize: 10.5, lineHeight: 13, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  sessions: { borderRadius: 18, overflow: 'hidden' },
  darkBorder: { borderWidth: 1 },
  sessionDivider: { borderBottomWidth: 1 },
  lightShadow: { boxShadow: '0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.05)' },
  noSessions: { padding: 14 },
  session: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  dayLetter: { width: 28, fontSize: 12, fontWeight: '700' },
  bar: { width: 4, height: 28, borderRadius: 2 },
  sessionTexts: { flex: 1, minWidth: 0, gap: 1 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 16 },
  ctaRow: { flexDirection: 'row', gap: 8 },
  cta: {
    flex: 1,
    minHeight: 54,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  adjust: { minHeight: 54, borderRadius: 999, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  activeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 54 },
  activeLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  check: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  viewWeek: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8 },
});
