import { useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowDown, CalendarPlus, Check } from 'lucide-react-native';
import {
  Button,
  haptics,
  isSessionType,
  PressableScale,
  SessionTypeChip,
  Sheet,
  Skeleton,
  SkeletonGroup,
  TextV2,
  useThemeV2,
  useToast,
  type SessionType,
} from '@app/components/v2';
import { planContext, planDayView } from '@app/features/trainingPlan/planViewModel';
import { isPlanOn } from '@app/features/trainingPlan/trainingPlanModel';
import { sessionTypeKey, useTrainingPlanText } from '@app/features/trainingPlan/trainingPlanCopy';
import { useOpenWeek } from '@app/features/trainingPlan/useOpenWeek';
import { useTrainingPlanState } from '@app/features/trainingPlan/useTrainingPlanState';
import {
  addedLine,
  addToWeekError,
  addToWeekText,
  weekdayLabel,
  weekdayName,
} from '@app/features/week/addToWeekCopy';
import { addDays, weekStartOf, type WeekDay } from '@app/features/week/weekModel';
import { invalidateWeek, useWeekPlan } from '@app/hooks/useWeekPlan';
import { useProfileLanguage } from '@app/hooks/useProfileLanguage';
import { createUuid } from '@app/lib/uuid';
import { planRoutineForDay, ProposalError } from '@app/services/ellie/ellieProposals';

// "Agregar a semana": the current week and the next one; past days are
// disabled and the days that have a routine show its name. Picking a day calls
// plan_routine_for_day with a new client id (a library routine sends
// p_routine_id, an open proposal p_proposal_id). A day that already has a
// routine asks before replacing it.
export type AddToWeekTarget = {
  name: string;
  routineId?: string | null;
  proposalId?: string | null;
};

// What was added, for the chat card that confirms it: the day, the routine,
// whether a plan is on (the rest of the week does not change) and the plan
// session it replaced (null: none).
export type AddedToWeek = {
  date: string;
  name: string;
  planOn: boolean;
  substitutes: string | null;
};

// A day with a session of the plan, waiting for "Reemplazar".
type PlanConflict = { date: string; title: string; type: SessionType | null };

export function useAddToWeek(onAdded?: (added: AddedToWeek) => void) {
  const [target, setTarget] = useState<AddToWeekTarget | null>(null);
  // The sheet keeps its target while it closes (no blank frame).
  const last = useRef<AddToWeekTarget | null>(null);
  if (target) {
    last.current = target;
  }
  return {
    open: (next: AddToWeekTarget) => setTarget(next),
    sheet: (
      <AddToWeekSheet
        open={target !== null}
        target={target ?? last.current}
        onClose={() => setTarget(null)}
        onAdded={onAdded}
      />
    ),
  };
}

export function AddToWeekSheet({
  open,
  target,
  onClose,
  onAdded,
}: {
  open: boolean;
  target: AddToWeekTarget | null;
  onClose: () => void;
  onAdded?: (added: AddedToWeek) => void;
}) {
  const { colors } = useThemeV2();
  const language = useProfileLanguage();
  const planText = useTrainingPlanText();
  const planState = useTrainingPlanState(open);
  const planOn = isPlanOn(planState.data?.state);
  const toast = useToast();
  const queryClient = useQueryClient();
  // "Ver semana" (31.4): the single route that picks the view by the plan.
  const openWeek = useOpenWeek();
  const current = useWeekPlan(open);
  const nextStart = current.data ? addDays(current.data.weekStart, 7) : null;
  const next = useWeekPlan(open && nextStart !== null, nextStart);
  const [busyDate, setBusyDate] = useState<string | null>(null);
  const [conflict, setConflict] = useState<PlanConflict | null>(null);

  const today = current.data?.today ?? '';
  const weeks = useMemo(
    () => [
      { key: 'this', title: addToWeekText(language, 'addToWeek.thisWeek'), days: current.data?.days ?? [] },
      { key: 'next', title: addToWeekText(language, 'addToWeek.nextWeek'), days: next.data?.days ?? [] },
    ],
    [current.data, language, next.data],
  );
  const known = useMemo(() => {
    const names: Record<string, string> = {};
    weeks.forEach(week =>
      week.days.forEach(day => {
        if (day.routine) {
          names[day.date] = day.routine.title;
        }
      }),
    );
    return names;
  }, [weeks]);

  const planCtx = planContext(today, planState.data, current.data?.trainingPlan);

  const done = (date: string, replacedSession: string | null) => {
    haptics.success();
    setConflict(null);
    if (target) {
      onAdded?.({ date, name: target.name, planOn, substitutes: replacedSession });
    }
    invalidateWeek(queryClient).catch(() => undefined);
    onClose();
    toast.show(addedLine(language, date), {
      action: {
        label: addToWeekText(language, 'addToWeek.viewWeek'),
        onPress: () => openWeek({ weekStart: weekStartOf(date), date }),
      },
    });
  };

  const plan = async (date: string, replace: boolean, replacedSession: string | null = null): Promise<void> => {
    if (!target) {
      return;
    }
    setBusyDate(date);
    try {
      await planRoutineForDay({
        date,
        routineId: target.proposalId ? null : target.routineId,
        proposalId: target.proposalId ?? null,
        replace,
        clientId: createUuid(),
      });
      setBusyDate(null);
      done(date, replacedSession);
    } catch (error) {
      setBusyDate(null);
      // A day with a session of the plan: asks first, in its own step. Only
      // "Reemplazar" repeats the call with p_replace (the session then stays
      // as substituted, not as missed).
      if (error instanceof ProposalError && error.code === 'day_has_plan_session' && !replace) {
        setConflict({
          date,
          title: error.planSession?.title || weeks.flatMap(week => week.days).find(day => day.date === date)?.planSession?.title || '',
          type: isSessionType(error.planSession?.type) ? error.planSession?.type ?? null : null,
        });
        return;
      }
      if (error instanceof ProposalError && error.code === 'day_has_routine' && !replace) {
        const existing = error.existing?.name || known[date] || '';
        Alert.alert(
          addToWeekText(language, 'addToWeek.replace.title', {
            day: weekdayName(language, date),
            name: existing,
          }),
          undefined,
          [
            { text: addToWeekText(language, 'addToWeek.replace.cancel'), style: 'cancel' },
            {
              text: addToWeekText(language, 'addToWeek.replace.confirm'),
              onPress: () => {
                plan(date, true).catch(() => undefined);
              },
            },
          ],
        );
        return;
      }
      if (error instanceof ProposalError && error.code === 'past_day') {
        invalidateWeek(queryClient).catch(() => undefined);
      }
      haptics.error();
      toast.show(addToWeekError(language, error), { tone: 'error' });
    }
  };

  const loading = current.isLoading || (next.isLoading && Boolean(nextStart));
  const failed = current.isError;

  // What the day holds, under its name: with a plan, its session (type chip
  // and title), a routine added, "Descanso en tu plan" or "Libre · plan en
  // pausa"; without one, the routine it has or "Libre".
  const daySub = (day: WeekDay, past: boolean): React.ReactNode => {
    const free = past ? ' ' : addToWeekText(language, 'addToWeek.free');
    const line = (text: string) => (
      <TextV2 variant="caption" color={colors.text.secondary} numberOfLines={1}>
        {text}
      </TextV2>
    );
    if (!planOn) {
      return line(day.routine?.title ?? free);
    }
    const view = planDayView(day, planCtx);
    if (view.state === 'pause') {
      return line(addToWeekText(language, 'addToWeek.planPause'));
    }
    if (day.planSession && view.state !== 'moved') {
      return (
        <View style={styles.planLine}>
          {day.planSession.type ? (
            <SessionTypeChip type={day.planSession.type} label={planText.t(sessionTypeKey(day.planSession.type))} />
          ) : null}
          <TextV2 variant="caption" color={colors.text.secondary} numberOfLines={1} style={styles.flex}>
            {day.planSession.title}
          </TextV2>
        </View>
      );
    }
    if (day.routine) {
      return line(day.routine.title);
    }
    return line(view.state === 'rest' ? addToWeekText(language, 'addToWeek.planRest') : free);
  };

  const row = (day: WeekDay) => {
    const past = Boolean(today) && day.date < today;
    const busy = busyDate === day.date;
    const name = day.planSession?.title ?? day.routine?.title ?? null;
    return (
      <PressableScale
        key={day.date}
        accessibilityRole="button"
        accessibilityState={{ disabled: past || busyDate !== null }}
        accessibilityLabel={[weekdayLabel(language, day.date), name].filter(Boolean).join(', ')}
        disabled={past || busyDate !== null}
        onPress={() => {
          plan(day.date, false).catch(() => undefined);
        }}
        style={[styles.row, { borderBottomColor: colors.divider }, past ? styles.past : null]}
      >
        <View style={styles.flex}>
          <TextV2 variant="label">
            {weekdayLabel(language, day.date)}
            {day.date === today ? ` · ${addToWeekText(language, 'addToWeek.today')}` : ''}
          </TextV2>
          {busy ? (
            <TextV2 variant="caption" color={colors.text.secondary} numberOfLines={1}>
              {addToWeekText(language, 'addToWeek.adding')}
            </TextV2>
          ) : (
            daySub(day, past)
          )}
        </View>
        {name && !busy ? <Check size={16} color={colors.text.tertiary} strokeWidth={2} /> : null}
      </PressableScale>
    );
  };

  return (
    <Sheet
      open={open}
      onClose={() => {
        if (busyDate === null) {
          setConflict(null);
          onClose();
        }
      }}
      eyebrow={addToWeekText(language, 'addToWeek.title').toUpperCase()}
      title={
        conflict
          ? addToWeekText(language, 'addToWeek.conflict.title')
          : target
            ? addToWeekText(language, 'addToWeek.subtitle', { name: target.name })
            : undefined
      }
      scrollable
      footer={
        conflict ? (
          <View style={styles.footer}>
            <Button
              label={addToWeekText(language, 'addToWeek.conflict.other')}
              variant="secondary"
              size="lg"
              disabled={busyDate !== null}
              onPress={() => setConflict(null)}
              style={styles.footerButton}
            />
            <Button
              label={addToWeekText(language, 'addToWeek.conflict.replace')}
              size="lg"
              loading={busyDate === conflict.date}
              loadingLabel={addToWeekText(language, 'addToWeek.adding')}
              disabled={busyDate !== null}
              onPress={() => {
                plan(conflict.date, true, conflict.title || null).catch(() => undefined);
              }}
              style={styles.footerButton}
            />
          </View>
        ) : undefined
      }
    >
      {conflict && target ? (
        <View style={styles.conflict}>
          <TextV2 variant="eyebrow" color={colors.text.secondary}>
            {weekdayLabel(language, conflict.date).toUpperCase()}
          </TextV2>
          <View style={[styles.swap, { backgroundColor: colors.surface.muted }]}>
            <View style={styles.planLine}>
              {conflict.type ? (
                <SessionTypeChip type={conflict.type} label={planText.t(sessionTypeKey(conflict.type))} />
              ) : null}
              <TextV2 variant="label" color={colors.text.secondary} style={[styles.flex, styles.struck]}>
                {conflict.title}
              </TextV2>
            </View>
            <ArrowDown size={16} color={colors.text.secondary} strokeWidth={2} />
            <TextV2 variant="bodyStrong">{target.name}</TextV2>
          </View>
          <TextV2 variant="body" color={colors.text.secondary}>
            {addToWeekText(language, 'addToWeek.conflict.note')}
          </TextV2>
        </View>
      ) : loading ? (
        <SkeletonGroup>
          <View style={styles.skeleton}>
            <Skeleton height={44} width="100%" />
            <Skeleton height={44} width="100%" />
            <Skeleton height={44} width="100%" />
          </View>
        </SkeletonGroup>
      ) : failed ? (
        <Button
          label={addToWeekText(language, 'addToWeek.error.generic')}
          variant="secondary"
          icon={CalendarPlus}
          onPress={() => {
            current.refetch().catch(() => undefined);
          }}
        />
      ) : (
        <View style={styles.weeks}>
          {weeks.map(week =>
            week.days.length > 0 ? (
              <View key={week.key}>
                <TextV2 variant="eyebrow" color={colors.text.secondary}>
                  {week.title.toUpperCase()}
                </TextV2>
                {week.days.map(row)}
              </View>
            ) : null,
          )}
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  weeks: { gap: 18, paddingBottom: 12 },
  skeleton: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  past: { opacity: 0.4 },
  planLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  conflict: { gap: 14, paddingBottom: 12 },
  swap: { gap: 10, padding: 14, borderRadius: 16 },
  struck: { textDecorationLine: 'line-through' },
  footer: { flex: 1, flexDirection: 'row', gap: 8 },
  footerButton: { flex: 1 },
});
