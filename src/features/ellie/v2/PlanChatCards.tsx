import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Check, X } from 'lucide-react-native';
import { Button, TextV2, haptics, useThemeV2 } from '@app/components/v2';
import type { PlanActionConfirmMessage, PlanReviewMessage } from '@app/features/ellie/chatModel';
import { reviewOpenAdjustments, reviewSessionsTotal } from '@app/features/ellie/planCardsModel';
import { manageErrorKey } from '@app/features/trainingPlan/managePlanModel';
import {
  shortDate,
  useTrainingPlanText,
  type TrainingPlanCopyKey,
} from '@app/features/trainingPlan/trainingPlanCopy';
import { useManagePlan } from '@app/features/trainingPlan/useManagePlan';

// ELLIE · the training-plan cards (docs/backend/ELLIE_CARDS_FLOW.md):
// plan_review (compact weekly review) and plan_action_confirm (Confirmar /
// Cancelar). plan_adjustment is PlanAdjustmentChatCard.

function useCardStyle() {
  const { colors } = useThemeV2();
  return { backgroundColor: colors.surface.raised };
}

export function PlanReviewChatCard({
  card,
  onOpen,
}: {
  card: PlanReviewMessage;
  onOpen: (weekIndex: number) => void;
}) {
  const { colors } = useThemeV2();
  const { t, language } = useTrainingPlanText();
  const { review } = card;
  const open = reviewOpenAdjustments(review);
  const volume = Math.round(review.volumeKg).toLocaleString(language === 'es' ? 'es-ES' : 'en-US');
  return (
    <View style={[styles.card, useCardStyle()]}>
      <TextV2 variant="bodyL" style={styles.title}>
        {t('chat.review.title', { n: review.weekIndex })}
      </TextV2>
      <View style={styles.lines}>
        <TextV2 variant="body">
          {t('chat.review.sessions', { done: review.sessionsDone, total: reviewSessionsTotal(review) })}
        </TextV2>
        <TextV2 variant="body" color={colors.text.secondary}>
          {t('chat.review.setsVolume', { sets: review.sets, volume })}
        </TextV2>
        <TextV2 variant="meta" color={open > 0 ? colors.ember.base : colors.text.secondary}>
          {open === 0
            ? t('chat.review.adjust.none')
            : open === 1
              ? t('chat.review.adjust.one')
              : t('chat.review.adjust.other', { n: open })}
        </TextV2>
      </View>
      <Button label={t('chat.review.cta')} size="md" onPress={() => onOpen(review.weekIndex)} />
    </View>
  );
}

const DONE_KEY: Record<PlanActionConfirmMessage['confirm']['action'], TrainingPlanCopyKey> = {
  pause: 'chat.action.done.pauseNoDate',
  resume: 'chat.action.done.resume',
  change_days: 'chat.action.done.days',
  change_goal_duration: 'chat.action.done.goal',
  end: 'chat.action.done.end',
};

// Confirmar runs the same write as Gestionar el plan (useManagePlan: a new
// p_client_id, the same errors, the same invalidations). Cancelar calls nothing.
export function PlanActionConfirmCard({
  card,
  onStatus,
  onEnded,
}: {
  card: PlanActionConfirmMessage;
  onStatus: (status: 'confirmed' | 'cancelled', pausedUntil?: string | null) => void;
  // Ending opens the final report (the one the answer carried).
  onEnded: (planId: string | null) => void;
}) {
  const { colors } = useThemeV2();
  const { t, language } = useTrainingPlanText();
  const { run, busy } = useManagePlan();
  const [error, setError] = useState<string | null>(null);
  const { confirm, status } = card;
  const style = useCardStyle();

  const submit = async () => {
    setError(null);
    const outcome = await run(confirm.request);
    if (!outcome.ok) {
      haptics.error();
      setError(t(manageErrorKey(outcome.code)));
      return;
    }
    haptics.success();
    onStatus('confirmed', outcome.pausedUntil);
    if (confirm.action === 'end') {
      onEnded(outcome.planId);
    }
  };

  if (status !== 'open') {
    const done = status === 'confirmed';
    const text = !done
      ? t('chat.action.cancelled')
      : confirm.action === 'pause' && card.pausedUntil
        ? t('chat.action.done.pause', { date: shortDate(language, card.pausedUntil) })
        : t(DONE_KEY[confirm.action]);
    const Icon = done ? Check : X;
    return (
      <View style={[styles.card, styles.done, style]}>
        <View style={[styles.mark, { backgroundColor: done ? colors.ember.base : colors.surface.muted }]}>
          <Icon size={14} color={done ? '#FFFFFF' : colors.text.secondary} strokeWidth={2.6} />
        </View>
        <View style={styles.flex}>
          <TextV2 variant="label">{text}</TextV2>
          {confirm.summary ? (
            <TextV2 variant="meta" color={colors.text.secondary}>
              {confirm.summary}
            </TextV2>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, style]}>
      <TextV2 variant="eyebrow" color={colors.plan.emT}>
        {t('chat.action.eyebrow')}
      </TextV2>
      <TextV2 variant="bodyL" style={styles.title}>
        {confirm.summary}
      </TextV2>
      {error ? (
        <TextV2 variant="meta" color={colors.plan.emT}>
          {error}
        </TextV2>
      ) : null}
      <View style={styles.actions}>
        <Button
          label={t('chat.action.confirm')}
          size="md"
          loading={busy !== null}
          disabled={busy !== null}
          onPress={() => {
            submit().catch(() => undefined);
          }}
          style={styles.flex}
        />
        <Button
          label={t('chat.action.cancel')}
          variant="secondary"
          size="md"
          disabled={busy !== null}
          onPress={() => onStatus('cancelled')}
          style={styles.flex}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { borderRadius: 20, padding: 16, gap: 10 },
  title: { fontWeight: '600' },
  lines: { gap: 2 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  done: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
