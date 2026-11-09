import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Check, ChevronRight, SlidersHorizontal } from 'lucide-react-native';
import {
  AuraMark,
  PressableScale,
  Skeleton,
  SkeletonGroup,
  TextV2,
  sessionTypeColor,
  sessionTypeTextColor,
  useThemeV2,
} from '@app/components/v2';
import { CARD_SHADOW, useProposalColors } from '@app/features/ellie/v2/RoutineProposalParts';
import {
  DAY_LETTERS,
  goalLabelKey,
  longDate,
  useTrainingPlanText,
  type TrainingPlanCopyKey,
} from '@app/features/trainingPlan/trainingPlanCopy';
import {
  blockLine,
  planCoverKey,
  planWeekKinds,
  splitChips,
  typicalWeekCells,
} from '@app/features/trainingPlan/trainingPlanModel';
import { AntonText, BlockSegments } from '@app/features/trainingPlan/v2/PlanParts';
import {
  CATEGORY_COVERS,
  CATEGORY_COVER_FALLBACK,
} from '@app/features/workouts/workoutAssets';
import type { TrainingPlanProposal } from '@app/services/supabase/trainingPlan';

export type TrainingPlanCardStatus =
  | 'loading'
  | 'open'
  | 'active'
  | 'replaced'
  | 'discarded'
  | 'unavailable';

const DEFAULT_CHIPS: TrainingPlanCopyKey[] = [
  'proposal.chip.1',
  'proposal.chip.2',
  'proposal.chip.3',
  'proposal.chip.4',
];

// training_plan_proposal (handoff v2.21 §31.2), the family of the routine
// card: 150 pt colour cover with "PLAN · 12 SEMANAS", the name in Anton and
// "4 días · 60 min · Ganar músculo"; the block line (deloads in blue), the
// split chips, the typical week with each type's colour, the total in Anton
// and ELLIE's reasoning with AURA. Activar · Ajustar (the adjust_chips, sent
// as a message) · Ver todo el plan. A replaced version is one muted line.
export function TrainingPlanProposalCard({
  proposal,
  status,
  version,
  activating,
  startDate,
  chipsOpen,
  disabled,
  onActivate,
  onToggleChips,
  onChip,
  onViewAll,
  onViewWeek,
  onReload,
}: {
  proposal: TrainingPlanProposal | null;
  status: TrainingPlanCardStatus;
  version: number;
  activating: boolean;
  // Active: when the plan starts (the server's or the proposal's).
  startDate: string | null;
  chipsOpen: boolean;
  // ELLIE is answering: no chip can be sent.
  disabled: boolean;
  onActivate: () => void;
  onToggleChips: () => void;
  onChip: (text: string) => void;
  onViewAll: () => void;
  onViewWeek: () => void;
  onReload: () => void;
}) {
  const { colors, mode } = useThemeV2();
  const tone = useProposalColors();
  const { t, language } = useTrainingPlanText();
  const [coverBroken, setCoverBroken] = useState(false);

  if (status === 'replaced' || status === 'discarded') {
    return (
      <View style={styles.muted}>
        <AuraMark size={22} state="rest" />
        <TextV2 variant="body" color={colors.text.secondary} style={styles.flex}>
          {status === 'replaced'
            ? t('proposal.replaced', { n: proposal?.version ?? version })
            : t('proposal.discarded')}
        </TextV2>
      </View>
    );
  }

  if (status === 'loading' || (!proposal && status !== 'unavailable')) {
    return (
      <View style={[styles.card, { backgroundColor: tone.card, boxShadow: CARD_SHADOW }]}>
        <SkeletonGroup>
          <Skeleton height={150} radius={0} />
          <View style={styles.body}>
            <Skeleton height={22} width="70%" />
            <Skeleton height={44} />
            <Skeleton height={16} width="50%" />
          </View>
        </SkeletonGroup>
      </View>
    );
  }

  if (!proposal) {
    return (
      <PressableScale
        accessibilityRole="button"
        onPress={onReload}
        style={[styles.card, styles.body, { backgroundColor: tone.card, boxShadow: CARD_SHADOW }]}
      >
        <TextV2 variant="meta" color={colors.text.secondary}>
          {t('proposal.unavailable')} · <TextV2 variant="metaStrong">{t('proposal.reload')}</TextV2>
        </TextV2>
      </PressableScale>
    );
  }

  const active = status === 'active';
  const coverKey = planCoverKey(proposal, key => key in CATEGORY_COVERS);
  const cover = !coverBroken ? CATEGORY_COVERS[coverKey] ?? CATEGORY_COVER_FALLBACK : CATEGORY_COVER_FALLBACK;
  const blocks = blockLine(planWeekKinds(proposal));
  const chips = splitChips(proposal, language);
  const cells = typicalWeekCells(proposal);
  const letters = DAY_LETTERS[language];
  const badge =
    t('proposal.badge', { n: proposal.weeks }) +
    (proposal.version > 1 ? t('proposal.badgeVersion', { v: proposal.version }) : '');
  const totalLine = [
    proposal.blocks === 1 ? t('proposal.blocks.one') : t('proposal.blocks.other', { n: proposal.blocks }),
    proposal.deloads > 0
      ? proposal.deloads === 1
        ? t('proposal.deloads.one')
        : t('proposal.deloads.other', { n: proposal.deloads })
      : null,
    proposal.hasTest ? t('proposal.test') : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const meta = t('proposal.meta', {
    days: proposal.daysOfWeek.length || proposal.typicalWeek.length,
    min: proposal.sessionMinutes,
    goal: proposal.goal ? t(goalLabelKey(proposal.goal)) : '',
  }).replace(/ · $/, '');
  const adjustChips =
    proposal.adjustChips.length > 0 ? proposal.adjustChips : DEFAULT_CHIPS.map(key => t(key));
  const start = startDate ?? proposal.startDate;

  return (
    <View style={styles.wrap}>
      <Animated.View
        entering={FadeInUp.duration(350).delay(100)}
        style={[styles.card, { backgroundColor: tone.card, boxShadow: CARD_SHADOW }]}
      >
        <View style={styles.cover}>
          <Image
            source={cover.image}
            contentFit="cover"
            contentPosition={cover.focusWide ?? cover.focus}
            accessibilityIgnoresInvertColors
            onError={() => setCoverBroken(true)}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['rgba(12,11,10,.1)', 'rgba(12,11,10,.35)', 'rgba(12,11,10,.88)']}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.badge}>
            <TextV2 color="#FFFFFF" style={styles.badgeText}>
              {badge}
            </TextV2>
          </View>
          <View style={styles.coverTexts}>
            <AntonText size={28} color="#FFFFFF">
              {proposal.name || t('proposal.defaultName')}
            </AntonText>
            <TextV2 variant="meta" color="#D8D6D1">
              {meta}
            </TextV2>
          </View>
        </View>

        <View style={styles.body}>
          <BlockSegments
            blocks={blocks}
            fill={colors.ember.base}
            labels={blocks.map((_, index) => t('proposal.block', { n: index + 1 }))}
          />

          {chips.length > 0 ? (
            <View style={styles.chips}>
              {chips.map(chip => (
                <View key={chip} style={[styles.chip, { backgroundColor: colors.surface.muted }]}>
                  <TextV2 variant="captionStrong">{chip}</TextV2>
                </View>
              ))}
            </View>
          ) : null}

          {proposal.typicalWeek.length > 0 ? (
            <View style={styles.week}>
              <TextV2 variant="eyebrow" color={colors.text.secondary} style={styles.eyebrowBold}>
                {t('proposal.typicalWeek')}
              </TextV2>
              <View style={styles.weekRow}>
                {cells.map(cell => (
                  <View key={cell.isoDay} style={styles.weekCol}>
                    <TextV2 variant="captionStrong" color={colors.text.secondary} style={styles.letter}>
                      {letters[cell.isoDay - 1]}
                    </TextV2>
                    <View
                      style={[
                        styles.weekCell,
                        cell.type
                          ? { backgroundColor: sessionTypeColor(colors, cell.type) }
                          : cell.label
                            ? { backgroundColor: colors.surface.muted }
                            : [styles.cellEmpty, { borderColor: colors.divider }],
                      ]}
                    >
                      {cell.label ? (
                        <TextV2
                          numberOfLines={2}
                          adjustsFontSizeToFit
                          minimumFontScale={0.8}
                          color={cell.type ? sessionTypeTextColor(colors, cell.type) : colors.text.primary}
                          style={styles.cellText}
                        >
                          {cell.label}
                        </TextV2>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.total}>
            <AntonText size={36}>{t('proposal.total', { n: proposal.totalSessions })}</AntonText>
            {totalLine ? (
              <TextV2 variant="meta" color={colors.text.secondary} style={styles.totalLine}>
                {totalLine}
              </TextV2>
            ) : null}
          </View>

          {proposal.reasoning ? (
            <View style={styles.reason}>
              <AuraMark size={20} state="rest" style={styles.reasonMark} />
              <TextV2 variant="label" color={colors.text.secondary} style={[styles.flex, styles.reasonText]}>
                {proposal.reasoning}
              </TextV2>
            </View>
          ) : null}

          {active ? (
            <View style={styles.activeRow}>
              <View style={styles.activeLeft}>
                <View style={[styles.check, { backgroundColor: colors.ember.base }]}>
                  <Check size={18} color="#121212" strokeWidth={2.6} />
                </View>
                <View style={styles.flex}>
                  <TextV2 variant="bodyStrong" style={styles.activeTitle}>
                    {t('proposal.active')}
                  </TextV2>
                  {start ? (
                    <TextV2 variant="caption" color={colors.text.secondary}>
                      {t('proposal.starts', { date: longDate(language, start) })}
                    </TextV2>
                  ) : null}
                </View>
              </View>
              <PressableScale accessibilityRole="button" onPress={onViewWeek} style={styles.viewWeek}>
                <TextV2 variant="label">{t('proposal.viewWeek')}</TextV2>
                <ChevronRight size={14} color={colors.text.primary} strokeWidth={2.2} />
              </PressableScale>
            </View>
          ) : (
            <View style={styles.actions}>
              <View style={styles.actionRow}>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityState={{ busy: activating, disabled: activating }}
                  disabled={activating}
                  onPress={onActivate}
                  style={[styles.primary, { backgroundColor: colors.cta.primary }]}
                >
                  {activating ? (
                    <AuraMark size={18} state="processing" tone={mode === 'light' ? 'dark' : 'light'} />
                  ) : null}
                  <TextV2 variant="bodyStrong" color={colors.cta.primaryText} align="center">
                    {activating ? t('proposal.activating') : t('proposal.activate')}
                  </TextV2>
                </PressableScale>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityState={{ expanded: chipsOpen, disabled: activating }}
                  disabled={activating}
                  onPress={onToggleChips}
                  style={[styles.secondary, { backgroundColor: colors.surface.muted }]}
                >
                  <SlidersHorizontal size={14} color={colors.text.primary} strokeWidth={2} />
                  <TextV2 variant="label">{t('proposal.adjust')}</TextV2>
                </PressableScale>
              </View>
              <PressableScale
                accessibilityRole="button"
                onPress={onViewAll}
                style={[styles.outline, { borderColor: colors.divider }]}
              >
                <TextV2 variant="label" align="center">
                  {t('proposal.viewAll')}
                </TextV2>
              </PressableScale>
            </View>
          )}
        </View>
      </Animated.View>

      {chipsOpen && !active ? (
        <View style={styles.quick}>
          {adjustChips.map(chip => (
            <PressableScale
              key={chip}
              accessibilityRole="button"
              accessibilityState={{ disabled }}
              disabled={disabled}
              onPress={() => onChip(chip)}
              style={[styles.quickChip, { backgroundColor: colors.surface.muted }, disabled ? styles.off : null]}
            >
              <TextV2 variant="metaStrong">{chip}</TextV2>
            </PressableScale>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { gap: 10 },
  muted: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  card: { borderRadius: 24, overflow: 'hidden' },
  cover: { height: 150, backgroundColor: '#141312', overflow: 'hidden' },
  badge: {
    position: 'absolute',
    top: 12,
    left: 14,
    minHeight: 22,
    paddingHorizontal: 8,
    borderRadius: 6,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,.18)',
  },
  badgeText: { fontSize: 10, lineHeight: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  coverTexts: { position: 'absolute', left: 16, right: 16, bottom: 14, gap: 4 },
  body: { paddingTop: 14, paddingHorizontal: 16, paddingBottom: 16, gap: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { minHeight: 26, paddingHorizontal: 10, borderRadius: 999, justifyContent: 'center' },
  week: { gap: 8 },
  eyebrowBold: { fontWeight: '700', letterSpacing: 1.1 },
  weekRow: { flexDirection: 'row', gap: 4 },
  weekCol: { flex: 1, alignItems: 'center', gap: 5 },
  letter: { fontSize: 11 },
  weekCell: {
    alignSelf: 'stretch',
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  cellEmpty: { borderWidth: 1 },
  cellText: { fontSize: 10, lineHeight: 11, fontWeight: '700', textAlign: 'center' },
  total: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 8, paddingTop: 2 },
  totalLine: { flexShrink: 1 },
  reason: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  reasonMark: { marginTop: 1 },
  reasonText: { fontWeight: '400', lineHeight: 20 },
  actions: { gap: 8 },
  actionRow: { flexDirection: 'row', gap: 8 },
  primary: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  secondary: {
    minHeight: 48,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
  },
  outline: {
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  activeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  activeLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  activeTitle: { fontSize: 16 },
  check: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  viewWeek: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8 },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  quickChip: { minHeight: 36, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center' },
  off: { opacity: 0.5 },
});
