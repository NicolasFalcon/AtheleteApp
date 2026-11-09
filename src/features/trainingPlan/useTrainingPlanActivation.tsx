import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Sheet, TextV2, haptics, useThemeV2, useToast } from '@app/components/v2';
import {
  joinNames,
  longDate,
  shortDate,
  useTrainingPlanText,
} from '@app/features/trainingPlan/trainingPlanCopy';
import { invalidateTrainingPlan } from '@app/features/trainingPlan/useTrainingPlanState';
import { createUuid } from '@app/lib/uuid';
import {
  TrainingPlanError,
  activateTrainingPlan,
  type PlannedSession,
} from '@app/services/supabase/trainingPlan';

export type ActivationTarget = {
  proposalId: string;
  // The proposal's start date, when the server's answer has none.
  startDate: string | null;
};

type Confirm =
  | { kind: 'week'; target: ActivationTarget; sessions: PlannedSession[] }
  | { kind: 'plan'; target: ActivationTarget; currentName: string | null };

// Activar (31.2 card · 31.3 detail): activate_training_plan with a new
// p_client_id per attempt.
//   week_has_sessions  → "Reemplazar tu semana planificada" with the sessions
//                        (naming the coach of an assigned one) → again with
//                        the confirmation.
//   plan_active_exists → confirm replacing the current plan → again.
//   premium_required   → a generic error (no paywall in this version).
// Done: the plan's state and the week are invalidated and `onActivated`
// receives the start date.
export function useTrainingPlanActivation(options: {
  onActivated: (proposalId: string, startDate: string | null) => void;
  // The proposal is no longer open (replaced or active elsewhere).
  onNotOpen?: (proposalId: string) => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t, language } = useTrainingPlanText();
  const { colors } = useThemeV2();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const busy = useRef(false);
  const latest = useRef(options);
  latest.current = options;

  const run = useCallback(
    async (target: ActivationTarget, confirmReplace: boolean) => {
      if (busy.current) {
        return;
      }
      busy.current = true;
      setConfirm(null);
      setBusyId(target.proposalId);
      try {
        const result = await activateTrainingPlan({
          proposalId: target.proposalId,
          clientId: createUuid(),
          confirmReplace,
        });
        await invalidateTrainingPlan(queryClient);
        haptics.success();
        latest.current.onActivated(target.proposalId, result.startDate ?? target.startDate);
      } catch (error) {
        const failure = error instanceof TrainingPlanError ? error : new TrainingPlanError('unknown');
        __DEV__ && console.warn('[training-plan] activate_training_plan:', failure.code, failure.message);
        if (failure.code === 'week_has_sessions' && !confirmReplace) {
          setConfirm({ kind: 'week', target, sessions: failure.sessions });
        } else if (failure.code === 'plan_active_exists' && !confirmReplace) {
          setConfirm({ kind: 'plan', target, currentName: failure.currentPlanName });
        } else if (failure.code === 'proposal_not_open') {
          toast.show(t('activate.notOpen'), { tone: 'error' });
          latest.current.onNotOpen?.(target.proposalId);
        } else {
          // premium_required included: the paywall is not active (§10).
          toast.show(t(failure.code === 'offline' ? 'activate.offline' : 'activate.error'), {
            tone: 'error',
          });
        }
      } finally {
        busy.current = false;
        setBusyId(null);
      }
    },
    [queryClient, t, toast],
  );

  const activate = useCallback((target: ActivationTarget) => run(target, false), [run]);
  const close = () => setConfirm(null);
  const confirmNow = () => {
    if (confirm) {
      run(confirm.target, true).catch(() => undefined);
    }
  };

  const footer = (
    <View style={styles.footer}>
      <Button label={t('activate.cancel')} variant="secondary" onPress={close} style={styles.cancel} />
      <Button
        label={t(confirm?.kind === 'plan' ? 'replacePlan.confirm' : 'replaceWeek.confirm')}
        onPress={confirmNow}
        style={styles.primary}
      />
    </View>
  );

  const sessions = confirm?.kind === 'week' ? confirm.sessions : [];
  const dates = sessions.map(item => item.date).filter((date): date is string => Boolean(date)).sort();
  const from = dates[0] ?? null;
  const to = dates[dates.length - 1] ?? null;
  // "Tu coach {nombre} te asignó …", one line per coach.
  const byCoach = new Map<string, string[]>();
  sessions
    .filter(item => item.source === 'coach')
    .forEach(item => {
      const name = item.coachName ?? '';
      byCoach.set(name, [...(byCoach.get(name) ?? []), item.name]);
    });

  const sheets = (
    <>
      <Sheet
        open={confirm?.kind === 'week'}
        onClose={close}
        title={t('replaceWeek.title')}
        footer={footer}
        scrollable
      >
        <View style={styles.body}>
          <TextV2 variant="body" tone="secondary">
            {sessions.length === 1 || from === to
              ? t('replaceWeek.body.one', { from: from ? shortDate(language, from) : '' })
              : t('replaceWeek.body.other', {
                  n: sessions.length,
                  from: from ? shortDate(language, from) : '',
                  to: to ? shortDate(language, to) : '',
                })}
          </TextV2>
          {Array.from(byCoach.entries()).map(([coach, names]) => (
            <View key={coach || 'coach'} style={[styles.coach, { backgroundColor: colors.plan.emS }]}>
              <TextV2 variant="label">
                {t(names.length > 1 ? 'replaceWeek.coachMany' : 'replaceWeek.coach', {
                  name: coach,
                  sessions: joinNames(language, names),
                })}
              </TextV2>
            </View>
          ))}
          <View>
            {sessions.map((item, index) => (
              <View
                key={`${item.date}-${item.name}-${index}`}
                style={[styles.row, { borderBottomColor: colors.divider }]}
              >
                <TextV2 variant="metaStrong" tone="secondary" style={styles.rowDate}>
                  {item.date ? longDate(language, item.date) : ''}
                </TextV2>
                <TextV2 variant="bodyStrong" style={styles.rowName}>
                  {item.name}
                </TextV2>
              </View>
            ))}
          </View>
        </View>
      </Sheet>
      <Sheet open={confirm?.kind === 'plan'} onClose={close} title={t('replacePlan.title')} footer={footer}>
        <TextV2 variant="body" tone="secondary">
          {t('replacePlan.body', {
            name: confirm?.kind === 'plan' && confirm.currentName ? confirm.currentName : t('replacePlan.current'),
          })}
        </TextV2>
      </Sheet>
    </>
  );

  return { activate, busyId, sheets };
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', gap: 10 },
  cancel: { flex: 1 },
  primary: { flex: 2 },
  body: { gap: 14 },
  coach: { borderRadius: 16, padding: 14 },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowDate: { minWidth: 110 },
  rowName: { flexShrink: 1 },
});
