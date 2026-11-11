import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  CalendarDays,
  ChevronRight,
  LogOut,
  Pause,
  Play,
  Target,
  type LucideIcon,
} from 'lucide-react-native';
import {
  Button,
  FilterChip,
  PressableScale,
  Sheet,
  TextV2,
  haptics,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import {
  ISO_DAYS,
  MAX_PLAN_DAYS,
  canSaveDays,
  durationOptions,
  endSummary,
  goalDurationChanged,
  initialDuration,
  manageActions,
  manageErrorKey,
  pauseOptions,
  pauseWeeksUsed,
  toggleDay,
} from '@app/features/trainingPlan/managePlanModel';
import {
  DAY_LETTERS,
  goalLabelKey,
  goalSubKey,
  shortDate,
  useTrainingPlanText,
} from '@app/features/trainingPlan/trainingPlanCopy';
import { useManagePlan, type ManageOutcome } from '@app/features/trainingPlan/useManagePlan';
import {
  TRAINING_GOALS,
  type TrainingGoal,
  type TrainingPlanDetail,
  type TrainingPlanState,
  type TrainingPlanWeeks,
} from '@app/services/supabase/trainingPlan';

// Gestionar el plan (handoff v2.21 §31.11): a sheet from the "···" menu and
// from "Gestionar plan". The menu lists what the plan's state allows (a
// read_only plan only offers Terminar antes); each option opens its panel
// inside the same sheet. Every write shows its loading on the button, reads
// the plan again (useManagePlan) and answers errors with a message of its own.

const DANGER = '#B42318';
const DANGER_TEXT = '#FFFFFF';

type View_ = 'menu' | 'pause' | 'resume' | 'days' | 'goal' | 'goalConfirm' | 'end';

export function ManagePlanSheet({
  open,
  onClose,
  planState,
  detail,
  onEnded,
}: {
  open: boolean;
  onClose: () => void;
  planState: TrainingPlanState | null;
  detail: TrainingPlanDetail | null;
  // The plan ended: the screen leaves the plan view and opens the final
  // report (whose data came inside the answer of end_training_plan).
  onEnded: (planId: string | null) => void;
}) {
  const { colors } = useThemeV2();
  const { t, language } = useTrainingPlanText();
  const toast = useToast();
  const { run, busy } = useManagePlan();
  const [view, setView] = useState<View_>('menu');
  const [error, setError] = useState<string | null>(null);

  const actions = manageActions(planState);
  const used = pauseWeeksUsed(detail);
  const pauses = useMemo(
    () => pauseOptions(used, planState?.endDate ?? detail?.endDate ?? null),
    [used, planState?.endDate, detail?.endDate],
  );
  const pauseLeft = pauses.some(option => option.enabled);
  const currentDays = useMemo(() => detail?.daysOfWeek ?? [], [detail?.daysOfWeek]);
  const durations = durationOptions(planState?.weekIndex);
  const currentGoal = detail?.goal ?? null;
  const currentWeeks = planState?.weeks ?? detail?.weeks ?? null;

  const [pauseWeeks, setPauseWeeks] = useState<1 | 2 | null>(null);
  const [days, setDays] = useState<number[]>([]);
  const [goal, setGoal] = useState<TrainingGoal | null>(null);
  const [weeks, setWeeks] = useState<TrainingPlanWeeks | null>(null);

  // Every opening starts at the menu with the plan's current values.
  useEffect(() => {
    if (!open) {
      return;
    }
    setView('menu');
    setError(null);
    setPauseWeeks(pauses.find(option => option.enabled)?.weeks ?? null);
    setDays(currentDays);
    setGoal(currentGoal);
    setWeeks(initialDuration(currentWeeks, durations));
    // Only when it opens: a refetch while open must not undo the choices.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const go = (next: View_) => {
    setError(null);
    setView(next);
  };

  // The write and what follows. A failure keeps the sheet open with its message.
  const submit = async (
    request: Parameters<typeof run>[0],
    done: (outcome: ManageOutcome) => void,
  ) => {
    setError(null);
    const outcome = await run(request);
    if (outcome.ok) {
      haptics.success();
      done(outcome);
    } else {
      setError(t(manageErrorKey(outcome.code)));
    }
  };

  const finish = (message: string) => {
    toast.show(message);
    onClose();
  };

  const pause = () => {
    if (pauseWeeks) {
      submit({ kind: 'pause', weeks: pauseWeeks }, () => finish(t('manage.toast.paused'))).catch(() => undefined);
    }
  };
  const resume = () => {
    submit({ kind: 'resume' }, () => finish(t('pause.resumed'))).catch(() => undefined);
  };
  const saveDays = () => {
    submit({ kind: 'days', days }, () => finish(t('manage.toast.days'))).catch(() => undefined);
  };
  const saveGoal = () => {
    if (goal && weeks) {
      submit({ kind: 'goal', goal, weeks }, () => finish(t('manage.toast.goal'))).catch(() => undefined);
    }
  };
  const endPlan = () => {
    submit({ kind: 'end' }, outcome => {
      toast.show(t('manage.toast.ended'));
      onClose();
      onEnded(outcome.ok ? outcome.planId : null);
    }).catch(() => undefined);
  };

  const goalChanged =
    goal !== null &&
    weeks !== null &&
    goalDurationChanged({ goal: currentGoal, weeks: currentWeeks }, { goal, weeks });

  const summary = endSummary(planState, detail);
  const fromWeek = (planState?.weekIndex ?? 0) + 1;
  const letters = DAY_LETTERS[language];

  // ── Titles and footers by view ──
  const titles: Record<View_, string> = {
    menu: t('manage.title'),
    pause: t('manage.pause.title'),
    resume: t('manage.resume.title'),
    days: t('manage.days.title'),
    goal: t('manage.goal.title'),
    goalConfirm: t('manage.goal.confirmTitle'),
    end: t('manage.end.heading'),
  };

  const twoButtons = (cancel: ReactNode, primary: ReactNode) => (
    <View style={styles.footer}>
      <View style={styles.cancel}>{cancel}</View>
      <View style={styles.primary}>{primary}</View>
    </View>
  );
  const cancelButton = (label = t('manage.cancel'), to: View_ = 'menu') => (
    <Button label={label} variant="secondary" fullWidth disabled={busy !== null} onPress={() => go(to)} />
  );

  let footer: ReactNode = null;
  if (view === 'pause') {
    footer = twoButtons(
      cancelButton(),
      <Button
        label={t('manage.pause.confirm')}
        fullWidth
        disabled={!pauseWeeks}
        loading={busy === 'pause'}
        onPress={pause}
      />,
    );
  } else if (view === 'resume') {
    footer = twoButtons(
      cancelButton(),
      <Button label={t('manage.resume.confirm')} fullWidth loading={busy === 'resume'} onPress={resume} />,
    );
  } else if (view === 'days') {
    footer = twoButtons(
      cancelButton(),
      <Button
        label={t('manage.days.save')}
        fullWidth
        disabled={!canSaveDays(days, currentDays)}
        loading={busy === 'days'}
        onPress={saveDays}
      />,
    );
  } else if (view === 'goal') {
    footer = twoButtons(
      cancelButton(),
      <Button
        label={t('manage.goal.review')}
        fullWidth
        disabled={!goalChanged}
        onPress={() => go('goalConfirm')}
      />,
    );
  } else if (view === 'goalConfirm') {
    footer = twoButtons(
      cancelButton(t('create.back'), 'goal'),
      <Button label={t('manage.goal.confirm')} fullWidth loading={busy === 'goal'} onPress={saveGoal} />,
    );
  } else if (view === 'end') {
    footer = twoButtons(
      cancelButton(t('manage.end.keep')),
      <DangerButton label={t('manage.end.confirm')} loading={busy === 'end'} onPress={endPlan} />,
    );
  }

  const errorLine = error ? (
    <TextV2 variant="label" color={colors.plan.emT} accessibilityLiveRegion="polite" style={styles.regular}>
      {error}
    </TextV2>
  ) : null;

  // ── Panels ──
  let body: ReactNode;
  if (view === 'menu') {
    const pauseSub = !pauseLeft
      ? t('manage.pause.subNone')
      : used === 1
        ? t('manage.pause.subOneLeft')
        : t('manage.pause.sub');
    const daysSub = currentDays.map(day => letters[day - 1]).join(' · ');
    const goalSub = currentGoal
      ? t('manage.goal.sub', { goal: t(goalLabelKey(currentGoal)), weeks: currentWeeks ?? '' })
      : currentWeeks
        ? t('manage.goal.weeks', { n: currentWeeks })
        : '';
    body = (
      <View style={styles.gap10}>
        {actions.pause ? (
          <MenuRow
            icon={Pause}
            title={t('manage.pause.title')}
            sub={pauseSub}
            disabled={!pauseLeft}
            onPress={() => go('pause')}
          />
        ) : null}
        {actions.resume ? (
          <MenuRow
            icon={Play}
            title={t('manage.resume.title')}
            sub={t('manage.resume.sub')}
            onPress={() => go('resume')}
          />
        ) : null}
        {actions.days ? (
          <MenuRow icon={CalendarDays} title={t('manage.days.title')} sub={daysSub} onPress={() => go('days')} />
        ) : null}
        {actions.goal ? (
          <MenuRow icon={Target} title={t('manage.goal.title')} sub={goalSub} onPress={() => go('goal')} />
        ) : null}
        {actions.end ? (
          <MenuRow
            icon={LogOut}
            title={t('manage.end.title')}
            sub={t('manage.end.sub')}
            tint={colors.plan.emS}
            onPress={() => go('end')}
          />
        ) : null}
      </View>
    );
  } else if (view === 'pause') {
    body = (
      <View style={styles.gap12}>
        <TextV2 variant="body" tone="secondary">
          {pauseLeft ? t('manage.pause.body') : t('manage.pause.limit')}
        </TextV2>
        {pauses.map(option => {
          const selected = pauseWeeks === option.weeks;
          return (
            <PressableScale
              key={option.weeks}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled: !option.enabled }}
              disabled={!option.enabled || busy !== null}
              onPress={() => {
                haptics.selection();
                setError(null);
                setPauseWeeks(option.weeks);
              }}
              style={[
                styles.option,
                { backgroundColor: colors.surface.raised },
                { borderColor: selected ? colors.text.primary : colors.divider },
                selected ? styles.optionOn : null,
                option.enabled ? null : styles.optionOff,
              ]}
            >
              <TextV2 variant="bodyStrong">{t(`manage.pause.week.${option.weeks}`)}</TextV2>
              <TextV2 variant="label" tone="secondary" style={styles.regular}>
                {!option.enabled
                  ? t('manage.pause.over')
                  : option.newEnd
                    ? t('manage.pause.ends', { date: shortDate(language, option.newEnd) })
                    : ''}
              </TextV2>
            </PressableScale>
          );
        })}
        {errorLine}
      </View>
    );
  } else if (view === 'resume') {
    body = (
      <View style={styles.gap12}>
        <TextV2 variant="body" tone="secondary">
          {t('manage.resume.body')}
        </TextV2>
        {errorLine}
      </View>
    );
  } else if (view === 'days') {
    const atMax = days.length >= MAX_PLAN_DAYS;
    body = (
      <View style={styles.gap12}>
        <TextV2 variant="body" tone="secondary">
          {t('manage.days.body')}
        </TextV2>
        <View style={styles.dayRow}>
          {ISO_DAYS.map(day => {
            const on = days.includes(day);
            return (
              <PressableScale
                key={day}
                accessibilityRole="checkbox"
                accessibilityLabel={letters[day - 1]}
                accessibilityState={{ checked: on, disabled: !on && atMax }}
                disabled={busy !== null}
                onPress={() => {
                  haptics.selection();
                  setError(null);
                  setDays(current => toggleDay(current, day));
                }}
                style={[
                  styles.dayChip,
                  { backgroundColor: on ? colors.cta.primary : colors.surface.muted },
                  !on && atMax ? styles.dim : null,
                ]}
              >
                <TextV2 variant="bodyStrong" color={on ? colors.cta.primaryText : colors.text.primary}>
                  {letters[day - 1]}
                </TextV2>
              </PressableScale>
            );
          })}
        </View>
        <TextV2 variant="label" tone="secondary" style={styles.regular}>
          {atMax
            ? t('manage.days.max')
            : days.length < 2
              ? t('create.minDays')
              : t(days.length === 1 ? 'manage.days.count.one' : 'manage.days.count.other', { n: days.length })}
        </TextV2>
        <View style={[styles.note, { backgroundColor: colors.surface.muted }]}>
          <TextV2 variant="label" style={styles.regular}>
            {t('manage.days.from', { n: fromWeek })}
          </TextV2>
        </View>
        {errorLine}
      </View>
    );
  } else if (view === 'goal') {
    body = (
      <View style={styles.gap12}>
        <TextV2 variant="body" tone="secondary">
          {t('manage.goal.body')}
        </TextV2>
        <TextV2 variant="eyebrow" tone="secondary">
          {t('manage.goal.goalLabel').toUpperCase()}
        </TextV2>
        <View style={styles.wrap}>
          {TRAINING_GOALS.map(item => (
            <FilterChip
              key={item}
              label={t(goalLabelKey(item))}
              selected={goal === item}
              size={40}
              onPress={() => {
                setError(null);
                setGoal(item);
              }}
            />
          ))}
        </View>
        {goal ? (
          <TextV2 variant="label" tone="secondary" style={styles.regular}>
            {t(goalSubKey(goal))}
          </TextV2>
        ) : null}
        <TextV2 variant="eyebrow" tone="secondary">
          {t('manage.goal.durationLabel').toUpperCase()}
        </TextV2>
        <View style={styles.wrap}>
          {durations.map(item => (
            <FilterChip
              key={item}
              label={t('manage.goal.weeks', { n: item })}
              selected={weeks === item}
              size={40}
              onPress={() => {
                setError(null);
                setWeeks(item);
              }}
            />
          ))}
        </View>
        {durations.length < 3 ? (
          <TextV2 variant="label" tone="secondary" style={styles.regular}>
            {t('manage.goal.hidden')}
          </TextV2>
        ) : null}
        {errorLine}
      </View>
    );
  } else if (view === 'goalConfirm') {
    body = (
      <View style={styles.gap12}>
        <TextV2 variant="body" tone="secondary">
          {t('manage.goal.confirmBody', {
            goal: goal ? t(goalLabelKey(goal)) : '',
            weeks: weeks ?? '',
            from: fromWeek,
          })}
        </TextV2>
        {errorLine}
      </View>
    );
  } else {
    body = (
      <View style={styles.gap12}>
        <View style={styles.stats}>
          <Stat
            label={t('manage.end.weeks')}
            value={t('manage.end.of', { a: summary.weeksDone, b: summary.weeks })}
          />
          <Stat
            label={t('manage.end.sessions')}
            value={t('manage.end.of', { a: summary.sessionsDone, b: summary.sessionsTotal })}
          />
        </View>
        <TextV2 variant="body" tone="secondary">
          {t('manage.end.body')}
        </TextV2>
        {errorLine}
      </View>
    );
  }

  return (
    <Sheet
      open={open}
      onClose={busy ? () => undefined : onClose}
      title={titles[view]}
      footer={footer ?? undefined}
      scrollable
    >
      {body}
    </Sheet>
  );
}

function MenuRow({
  icon: Icon,
  title,
  sub,
  tint,
  disabled = false,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  sub: string;
  tint?: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors } = useThemeV2();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${sub}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.row, { backgroundColor: tint ?? colors.surface.muted }, disabled ? styles.rowOff : null]}
    >
      <Icon size={20} color={colors.text.primary} strokeWidth={2} />
      <View style={styles.rowTexts}>
        <TextV2 variant="bodyStrong">{title}</TextV2>
        {sub ? (
          <TextV2 variant="label" tone="secondary" style={styles.regular}>
            {sub}
          </TextV2>
        ) : null}
      </View>
      <ChevronRight size={18} color={colors.text.secondary} strokeWidth={2} />
    </PressableScale>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { colors } = useThemeV2();
  return (
    <View style={[styles.stat, { backgroundColor: colors.surface.muted }]}>
      <TextV2 variant="eyebrow" tone="secondary">
        {label.toUpperCase()}
      </TextV2>
      <TextV2 variant="section">{value}</TextV2>
    </View>
  );
}

// The deep red of "Terminar antes" (#B42318): same pill as Button, white text.
function DangerButton({
  label,
  loading,
  onPress,
}: {
  label: string;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: loading, busy: loading }}
      disabled={loading}
      onPress={onPress}
      style={[styles.danger, loading ? styles.dangerBusy : null]}
    >
      <TextV2 variant="cta" color={DANGER_TEXT} numberOfLines={1}>
        {loading ? `${label}…` : label}
      </TextV2>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  regular: { fontWeight: '400' },
  gap10: { gap: 10 },
  gap12: { gap: 12 },
  footer: { flexDirection: 'row', gap: 10 },
  cancel: { flex: 1 },
  primary: { flex: 2 },
  row: {
    minHeight: 64,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  rowTexts: { flex: 1, gap: 2 },
  option: { borderRadius: 18, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, gap: 2 },
  optionOn: { borderWidth: 2 },
  optionOff: { opacity: 0.45 },
  rowOff: { opacity: 0.5 },
  dayRow: { flexDirection: 'row', gap: 6 },
  dayChip: { flex: 1, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: 0.4 },
  note: { borderRadius: 16, padding: 14 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, borderRadius: 18, padding: 14, gap: 4 },
  dangerBusy: { opacity: 0.7 },
  danger: {
    height: 56,
    borderRadius: 999,
    paddingHorizontal: 24,
    backgroundColor: DANGER,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
});
