import type { EllieLanguage } from '@app/features/ellie/ellieCopy';
import {
  weekdayOf,
  type TrainingPlanT,
} from '@app/features/trainingPlan/trainingPlanCopy';
import type {
  AdjustmentAction,
  AdjustmentKind,
  PlanAdjustment,
} from '@app/services/supabase/trainingPlanSession';

// Ajustes de tu plan (handoff v2.21 §31.8): which adjustments the card shows,
// its buttons by type, and the confirmation that replaces them.

// An adjustment still waits for the athlete: an open one, or the discomfort
// that was already applied and has not been answered (it is the only one that
// applies before asking, so it is the only one with "Entendido / Revertir").
export function needsAnswer(adjustment: PlanAdjustment): boolean {
  return (
    adjustment.status === 'open' ||
    (adjustment.kind === 'discomfort' && adjustment.status === 'applied' && adjustment.respondedAt === null)
  );
}

// Recovery and discomfort cards are blue (the plan's deload colour).
export const isBlueAdjustment = (kind: AdjustmentKind) => kind === 'deload_early' || kind === 'discomfort';

// The two buttons, main one first.
export function adjustmentActions(kind: AdjustmentKind): [AdjustmentAction, AdjustmentAction] {
  switch (kind) {
    case 'missed_session':
      return ['move_today', 'skip'];
    case 'discomfort':
      return ['ack', 'revert'];
    default:
      return ['approve', 'reject'];
  }
}

// The line that replaces the buttons once answered (31.8 table).
export function adjustmentConfirmation(
  adjustment: PlanAdjustment,
  action: AdjustmentAction,
  today: string,
  language: EllieLanguage,
  t: TrainingPlanT,
): string {
  const week = adjustment.weekIndex;
  switch (action) {
    case 'approve': {
      const kind = adjustment.kind;
      if (kind === 'variant_stall' || kind === 'deload_early' || kind === 'repeat_week') {
        return week !== null
          ? t(`adj.done.${kind}` as 'adj.done.variant_stall', { n: week })
          : t(`adj.done.${kind}.noWeek` as 'adj.done.variant_stall.noWeek');
      }
      return t('adj.done.reject');
    }
    case 'move_today': {
      const day = Number(today.slice(8, 10));
      return t('adj.done.move_today', { day: `${weekdayOf(language, today)} ${day}` });
    }
    case 'skip':
      return t('adj.done.skip');
    case 'ack':
      return t('adj.done.ack');
    case 'revert':
      return t('adj.done.revert');
    default:
      return t('adj.done.reject');
  }
}
