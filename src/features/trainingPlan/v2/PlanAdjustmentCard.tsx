import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ArrowRight, Check } from 'lucide-react-native';
import { Button, TextV2, haptics, useThemeV2 } from '@app/components/v2';
import {
  adjustmentActions,
  adjustmentConfirmation,
  isBlueAdjustment,
  needsAnswer,
} from '@app/features/trainingPlan/adjustmentModel';
import { useTrainingPlanText } from '@app/features/trainingPlan/trainingPlanCopy';
import { usePlanAdjustments, useRespondAdjustment } from '@app/features/trainingPlan/usePlanSession';
import { getLocalDateKey } from '@app/lib/date';
import type { AdjustmentAction, PlanAdjustment } from '@app/services/supabase/trainingPlanSession';

// Tarjeta de ajuste del plan (31.8): eyebrow by type, title, explanation, the
// change "antes → después" and two buttons; once answered the buttons give way
// to the confirmation. The same card is in Tu semana and in the ELLIE chat.
export function PlanAdjustmentCard({
  adjustment,
  answered,
  busy,
  failed,
  closed = false,
  onRespond,
}: {
  adjustment: PlanAdjustment;
  // The action the athlete took (null: still waiting).
  answered: AdjustmentAction | null;
  busy: boolean;
  failed: boolean;
  // Already closed with no answer to show (an old card): no buttons.
  closed?: boolean;
  onRespond: (action: AdjustmentAction) => void;
}) {
  const { colors } = useThemeV2();
  const { t, language } = useTrainingPlanText();
  const blue = isBlueAdjustment(adjustment.kind);
  const accent = blue ? colors.plan.rbT : colors.plan.emT;
  const [main, other] = adjustmentActions(adjustment.kind);
  const title =
    adjustment.kind === 'missed_session' && adjustment.sessions[0]
      ? adjustment.sessions[0].title
      : t(`adj.title.${adjustment.kind}` as 'adj.title.variant_stall');
  const body = adjustment.reason ?? t(`adj.body.${adjustment.kind}` as 'adj.body.variant_stall');
  const hasChange = adjustment.before !== null || adjustment.after !== null;

  return (
    <View style={[styles.card, { backgroundColor: blue ? colors.plan.rbS : colors.surface.raised }]}>
      <TextV2 variant="eyebrow" color={accent}>
        {t(`adj.eyebrow.${adjustment.kind}` as 'adj.eyebrow.variant_stall').toUpperCase()}
      </TextV2>
      <TextV2 variant="bodyL" color={blue ? colors.plan.rbT : undefined} style={styles.title}>
        {title}
      </TextV2>
      <TextV2 variant="body" color={colors.text.secondary}>
        {body}
      </TextV2>
      {hasChange ? (
        <View style={[styles.change, { backgroundColor: colors.surface.muted }]}>
          <View style={styles.changeCol}>
            <TextV2 variant="caption" color={colors.text.secondary}>
              {t('adj.before')}
            </TextV2>
            <TextV2 variant="label">{adjustment.before ?? '—'}</TextV2>
          </View>
          <ArrowRight size={16} color={colors.text.secondary} strokeWidth={2} />
          <View style={styles.changeCol}>
            <TextV2 variant="caption" color={colors.text.secondary}>
              {t('adj.after')}
            </TextV2>
            <TextV2 variant="label">{adjustment.after ?? '—'}</TextV2>
          </View>
        </View>
      ) : null}
      {answered ? (
        <View style={styles.confirm}>
          <View style={[styles.check, { backgroundColor: colors.ember.base }]}>
            <Check size={14} color="#FFFFFF" strokeWidth={2.6} />
          </View>
          <TextV2 variant="label" style={styles.confirmText}>
            {adjustmentConfirmation(adjustment, answered, getLocalDateKey(), language, t)}
          </TextV2>
        </View>
      ) : closed ? null : (
        <>
          {failed ? (
            <TextV2 variant="meta" color={colors.plan.emT}>
              {t('adj.error')}
            </TextV2>
          ) : null}
          <View style={styles.actions}>
            <Button
              label={t(`adj.action.${main}` as 'adj.action.approve')}
              size="md"
              loading={busy}
              disabled={busy}
              onPress={() => onRespond(main)}
              style={styles.flex}
            />
            <Button
              label={t(`adj.action.${other}` as 'adj.action.reject')}
              variant="secondary"
              size="md"
              disabled={busy}
              onPress={() => onRespond(other)}
              style={styles.flex}
            />
          </View>
        </>
      )}
    </View>
  );
}

// The same card in the ELLIE chat (`plan_adjustment`): it answers through
// respond_plan_adjustment and tells the chat which action was taken.
export function PlanAdjustmentChatCard({
  adjustment,
  answered,
  onAnswered,
}: {
  adjustment: PlanAdjustment;
  answered: AdjustmentAction | null;
  onAnswered: (action: AdjustmentAction) => void;
}) {
  const { respond, busyId } = useRespondAdjustment();
  const [failed, setFailed] = useState(false);
  return (
    <PlanAdjustmentCard
      adjustment={adjustment}
      answered={answered}
      busy={busyId === adjustment.id}
      failed={failed}
      closed={answered === null && !needsAnswer(adjustment)}
      onRespond={action => {
        setFailed(false);
        respond(adjustment, action)
          .then(ok => {
            if (ok) {
              haptics.success();
              onAnswered(action);
            } else {
              haptics.error();
              setFailed(true);
            }
          })
          .catch(() => setFailed(true));
      }}
    />
  );
}

type Answered = Record<string, { adjustment: PlanAdjustment; action: AdjustmentAction }>;

// The adjustments waiting for an answer, on top of Tu semana (31.4). An
// answered one stays with its confirmation until the screen is left.
export function PlanAdjustmentsStack() {
  const query = usePlanAdjustments();
  const { respond, busyId } = useRespondAdjustment();
  const [answered, setAnswered] = useState<Answered>({});
  const [failedId, setFailedId] = useState<string | null>(null);

  const waiting = (query.data ?? []).filter(item => needsAnswer(item) && !answered[item.id]);
  const done = Object.values(answered).map(entry => entry.adjustment);
  const shown = [...waiting, ...done];
  if (shown.length === 0) {
    return null;
  }

  const answer = async (adjustment: PlanAdjustment, action: AdjustmentAction) => {
    setFailedId(null);
    const ok = await respond(adjustment, action);
    if (ok) {
      haptics.success();
      setAnswered(current => ({ ...current, [adjustment.id]: { adjustment, action } }));
    } else {
      haptics.error();
      setFailedId(adjustment.id);
    }
  };

  return (
    <View style={styles.stack}>
      {shown.map(adjustment => (
        <PlanAdjustmentCard
          key={adjustment.id}
          adjustment={adjustment}
          answered={answered[adjustment.id]?.action ?? null}
          busy={busyId === adjustment.id}
          failed={failedId === adjustment.id}
          onRespond={action => {
            answer(adjustment, action).catch(() => undefined);
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: 12 },
  card: { borderRadius: 20, padding: 16, gap: 10 },
  title: { fontWeight: '600' },
  change: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14 },
  changeCol: { flex: 1, gap: 2 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  confirm: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  check: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  confirmText: { flex: 1 },
});
