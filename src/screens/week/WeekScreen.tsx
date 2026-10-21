import { GuideAnchor, useGuide } from '@app/features/guides/GuideAnchor';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BackButton,
  Button,
  GlassHeader,
  LivingHalo,
  PressableScale,
  Sheet,
  Skeleton,
  SkeletonGroup,
  StatusBarV2,
  TextV2,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { APP_ROUTES, ROOT_ROUTES } from '@app/constants/routes';
import { BlockError } from '@app/features/home/v2/BlockError';
import {
  CheckLine,
  DayCard,
  MissedBand,
  PickRow,
  PlanSection,
  WeekPills,
  routineImage,
  routineTypeText,
} from '@app/features/week/v2/WeekParts';
import {
  dayLabel,
  dayMinutes,
  dayName,
  isEditable,
  isoWeekNumber,
  missedText,
  nextEmptyIndex,
  pastNote,
  stepMinutes,
  weekRangeLabel,
  weekRoutineFrom,
  weekSummaryLine,
  type WeekDay,
} from '@app/features/week/weekModel';
import { routineErrorCopy } from '@app/features/workouts/routineErrors';
import { useHomeFeed } from '@app/hooks/useHomeFeed';
import { useProfileLanguage } from '@app/hooks/useProfileLanguage';
import { useRoutineList } from '@app/hooks/useRoutines';
import { useWeekChange, useWeekPlan } from '@app/hooks/useWeekPlan';
import { safeGoBack } from '@app/navigation/safeGoBack';
import { weekPlanService } from '@app/services/routines/weekPlanService';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'Week'>;

const GAP = 12;
const SIDE = 20;
// "Otra con ELLIE" shows the thinking Halo at least this long (~1.1 s).
const REGEN_MIN_MS = 1100;
const MINUTES_COMMIT_MS = 600;
const DEFAULT_HABITS = ['Movimiento', 'Hidratación', 'Mente'];

// Tu semana (handoff v2.15 §25.1 · WEEK_01–03, WEEK_05): the seven days of
// the current week from get_week_plan. Each day card edits only that day
// (today and ahead): routine, minutes, move, rest, not available and "Otra
// con ELLIE". A missed session is proposed by ELLIE and confirmed by the
// user. "Planificar con ELLIE" opens WeekEllie; "Hazla tú" empties the days
// from today.
export function WeekScreen({ navigation }: Props) {
  const { colors } = useThemeV2();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const cardWidth = width - SIDE * 2;
  const toast = useToast();
  const language = useProfileLanguage();
  const query = useWeekPlan();
  const change = useWeekChange();
  const home = useHomeFeed();
  const library = useRoutineList('all', { exhaust: true });
  const week = query.data ?? null;
  const today = week?.today ?? '';

  const listRef = useRef<FlatList<WeekDay>>(null);
  const [index, setIndex] = useState(0);
  const [moveFrom, setMoveFrom] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [pickerDate, setPickerDate] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | 'manual' | 'deactivate'>(null);
  const [busy, setBusy] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [minutesOverride, setMinutesOverride] = useState<Record<string, number>>({});
  const [movedMiss, setMovedMiss] = useState<{ title: string; date: string } | null>(null);
  const minuteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const scrolledToToday = useRef(false);

  const days = useMemo(() => week?.days ?? [], [week]);
  // Guía de Tu semana (25.4), once the week is on screen.
  const scrollRef = useRef<ScrollView>(null);
  useGuide('week', { scrollRef, enabled: Boolean(week) });

  const showError = useCallback(
    (error: unknown) => toast.show(routineErrorCopy(error, language).message, { tone: 'error' }),
    [language, toast],
  );

  const goCard = useCallback(
    (target: number, animated = true) => {
      if (target < 0 || target >= days.length) {
        return;
      }
      listRef.current?.scrollToOffset({ offset: target * (cardWidth + GAP), animated });
      setIndex(target);
    },
    [cardWidth, days.length],
  );

  // Opens on today's card.
  useEffect(() => {
    if (!week || scrolledToToday.current || days.length === 0) {
      return;
    }
    scrolledToToday.current = true;
    const todayIndex = Math.max(0, days.findIndex(day => day.date === week.today));
    setTimeout(() => goCard(todayIndex, false), 60);
  }, [days, goCard, week]);

  useEffect(
    () => () => Object.values(minuteTimers.current).forEach(clearTimeout),
    [],
  );

  const run = useCallback(
    async (action: () => Promise<unknown>) => {
      try {
        await change(action);
        return true;
      } catch (error) {
        showError(error);
        return false;
      }
    },
    [change, showError],
  );

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / (cardWidth + GAP));
    setIndex(Math.max(0, Math.min(days.length - 1, next)));
  };

  // ── Day actions ─────────────────────────────────────────────────────────
  const regenerate = async (day: WeekDay) => {
    setRegenerating(day.date);
    const started = Date.now();
    await run(() => weekPlanService.regenerateWeekDay(day.date));
    const left = REGEN_MIN_MS - (Date.now() - started);
    setTimeout(() => setRegenerating(null), Math.max(0, left));
  };

  const changeMinutes = (day: WeekDay, delta: number) => {
    const current = minutesOverride[day.date] ?? dayMinutes(day);
    const next = stepMinutes(current, delta);
    setMinutesOverride(map => ({ ...map, [day.date]: next }));
    clearTimeout(minuteTimers.current[day.date]);
    minuteTimers.current[day.date] = setTimeout(() => {
      run(() => weekPlanService.setWeekDay(day.date, { minutes: next })).finally(() =>
        setMinutesOverride(map => {
          const left = { ...map };
          delete left[day.date];
          return left;
        }),
      );
    }, MINUTES_COMMIT_MS);
  };

  const pressPill = (day: WeekDay, target: number) => {
    if (!moveFrom) {
      goCard(target);
      return;
    }
    if (day.date < today || day.date === moveFrom) {
      return;
    }
    const from = moveFrom;
    setMoveFrom(null);
    run(() => weekPlanService.moveWeekDay(from, day.date)).then(ok => ok && goCard(target));
  };

  const pick = async (date: string, routineId: string | null) => {
    setPickerDate(null);
    const at = days.findIndex(day => day.date === date);
    const ok = await run(() =>
      weekPlanService.setWeekDay(
        date,
        routineId ? { kind: 'session', routineId } : { kind: 'rest' },
      ),
    );
    // "Hazla tú": on to the next empty day.
    if (ok && manualMode) {
      const next = nextEmptyIndex(days, at);
      if (next > 0) {
        setTimeout(() => goCard(next), 250);
      } else {
        setManualMode(false);
      }
    }
  };

  const startDay = (day: WeekDay) => {
    const routineId = day.routine?.id;
    if (!routineId) {
      return;
    }
    const resumable = home.data?.resumable;
    if (resumable?.workoutId === routineId) {
      navigation.navigate(APP_ROUTES.WorkoutSession, { workoutId: routineId, sessionId: resumable.id });
      return;
    }
    navigation.navigate(APP_ROUTES.WorkoutDetail, { workoutId: routineId });
  };

  const resolveMissed = async (action: 'reschedule' | 'keep') => {
    const missed = week?.missed;
    if (!missed) {
      return;
    }
    const title = days.find(day => day.date === missed.date)?.routine?.title ?? 'La sesión';
    setBusy(true);
    try {
      const result = await change(() =>
        weekPlanService.resolveMissedDay(missed.date, action, action === 'reschedule' ? missed.proposedDate : null),
      );
      const to = result.date ?? missed.proposedDate;
      if (action === 'reschedule' && to) {
        setMovedMiss({ title, date: to });
        const target = days.findIndex(day => day.date === to);
        if (target >= 0) {
          goCard(target);
        }
      }
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  };

  const emptyWeek = async () => {
    if (!week) {
      return;
    }
    setConfirm(null);
    const ok = await run(() => weekPlanService.clearWeek(week.weekStart));
    if (ok) {
      setManualMode(true);
      const todayIndex = Math.max(0, days.findIndex(day => day.date === today));
      goCard(todayIndex);
      setTimeout(() => setPickerDate(today), 450);
    }
  };

  const togglePlan = async () => {
    const plan = week?.plan;
    if (!plan) {
      return;
    }
    setConfirm(null);
    const ok = await run(() =>
      plan.active
        ? weekPlanService.deactivateWeekPlan(plan.id)
        : weekPlanService.activateWeekPlan(plan.id),
    );
    if (ok) {
      toast.show(plan.active ? 'Plan de la semana desactivado' : 'Plan de la semana activado');
    }
  };

  // ── Card data ───────────────────────────────────────────────────────────
  const challenge = home.data?.challenge ?? null;
  const habitNames = challenge?.habits.map(habit => habit.name) ?? DEFAULT_HABITS;
  const habitsFor = (day: WeekDay) => {
    const core = day.core33;
    if (!core?.active || day.kind === 'unavailable') {
      return null;
    }
    const total = habitNames.length || 3;
    const doneFlags =
      day.date === today && challenge
        ? habitNames.map((_, i) => Boolean(challenge.todayHabits[i]))
        : habitNames.map((_, i) => i < core.habitsDone);
    const done = doneFlags.filter(Boolean).length;
    const line =
      day.date < today
        ? done >= total
          ? 'Cerrado'
          : `${done} de ${total}`
        : day.date === today
          ? `${done} de ${total}`
          : 'Pendiente';
    return {
      day: core.day,
      line,
      items: habitNames.map((name, i) => ({ name, done: day.date > today ? false : doneFlags[i] })),
    };
  };
  const movedTo = (day: WeekDay) => days.find(item => item.movedFrom === day.date)?.date ?? null;

  const pickerDay = days.find(day => day.date === pickerDate) ?? null;
  const missText = week ? missedText(week) : null;
  const moving = moveFrom ? days.find(day => day.date === moveFrom) ?? null : null;

  // ── Render ──────────────────────────────────────────────────────────────
  const header = (
    <GlassHeader
      title="Tu semana"
      left={<BackButton onPress={() => safeGoBack(navigation, [ROOT_ROUTES.MainTabs])} />}
      right={
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Planificar con ELLIE"
          onPress={() => navigation.navigate(APP_ROUTES.WeekEllie)}
          style={[styles.headerOrb, { backgroundColor: colors.surface.muted }]}
        >
          <LivingHalo size={24} />
        </PressableScale>
      }
    />
  );

  if (!week) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.bg }]}>
        <StatusBarV2 />
        {header}
        <View style={styles.state}>
          {query.isError ? (
            <BlockError message="No pudimos cargar tu semana." onRetry={() => query.refetch()} />
          ) : (
            <SkeletonGroup>
              <Skeleton height={14} width="30%" />
              <Skeleton height={34} width="60%" />
              <Skeleton height={74} />
              <Skeleton height={420} />
            </SkeletonGroup>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      {header}
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
      >
        <View style={styles.top}>
          <View style={styles.gap4}>
            <TextV2 variant="eyebrow" color={colors.text.secondary}>
              {`Semana ${isoWeekNumber(week.weekStart)}`}
            </TextV2>
            <TextV2 style={styles.range}>{weekRangeLabel(week.weekStart)}</TextV2>
            <TextV2 variant="body" color={colors.text.secondary} style={styles.fs14}>
              {weekSummaryLine(week)}
            </TextV2>
          </View>

          <GuideAnchor id="week.days">
            <WeekPills
              days={days}
              today={today}
              selected={days[index]?.date ?? null}
              moveFrom={moveFrom}
              onPressDay={pressPill}
            />
          </GuideAnchor>

          {moving ? (
            <View style={styles.moving}>
              <TextV2 variant="body" color={colors.text.secondary} style={[styles.flex1, styles.fs14]}>
                {'Toca el día al que quieres mover '}
                <TextV2 variant="bodyStrong" style={styles.fs14}>
                  {moving.kind === 'session' ? moving.routine?.title ?? 'la sesión' : 'Descanso'}
                </TextV2>
              </TextV2>
              <PressableScale accessibilityRole="button" onPress={() => setMoveFrom(null)} style={styles.cancel}>
                <TextV2 variant="bodyStrong" style={styles.fs14}>
                  Cancelar
                </TextV2>
              </PressableScale>
            </View>
          ) : null}

          {missText && week.missed ? (
            <MissedBand
              text={missText}
              canMove={Boolean(week.missed.proposedDate)}
              busy={busy}
              onMove={() => resolveMissed('reschedule')}
              onKeep={() => resolveMissed('keep')}
            />
          ) : movedMiss ? (
            <CheckLine text={`${movedMiss.title} ahora está el ${dayName(movedMiss.date)}.`} />
          ) : null}
        </View>

        <FlatList
          ref={listRef}
          horizontal
          data={days}
          keyExtractor={day => day.date}
          showsHorizontalScrollIndicator={false}
          snapToInterval={cardWidth + GAP}
          decelerationRate="fast"
          disableIntervalMomentum
          contentContainerStyle={styles.track}
          ItemSeparatorComponent={Separator}
          getItemLayout={(_, i) => ({ length: cardWidth + GAP, offset: (cardWidth + GAP) * i, index: i })}
          onMomentumScrollEnd={onScrollEnd}
          renderItem={({ item: day }) => {
            const editable = isEditable(day, today);
            const resumable = home.data?.resumable;
            return (
              <DayCard
                day={day}
                today={today}
                width={cardWidth}
                editable={editable}
                regenerating={regenerating === day.date}
                minutes={minutesOverride[day.date] ?? dayMinutes(day)}
                habits={habitsFor(day)}
                startLabel={resumable && resumable.workoutId === day.routine?.id ? 'Retomar' : 'Empezar'}
                note={day.date < today ? pastNote(day, movedTo(day)) : null}
                guideAnchors={day.date === today}
                actions={{
                  onPick: () => setPickerDate(day.date),
                  onMove: () => setMoveFrom(day.date),
                  onToggleRest: () =>
                    day.kind === 'rest'
                      ? regenerate(day)
                      : run(() => weekPlanService.setWeekDay(day.date, { kind: 'rest' })),
                  onToggleBlock: () =>
                    run(() =>
                      weekPlanService.setWeekDay(day.date, {
                        kind: day.kind === 'unavailable' ? 'rest' : 'unavailable',
                      }),
                    ),
                  onRegenerate: () => regenerate(day),
                  onMinutes: delta => changeMinutes(day, delta),
                  onStart: () => startDay(day),
                }}
              />
            );
          }}
        />

        <GuideAnchor id="week.plan">
          <PlanSection onEllie={() => navigation.navigate(APP_ROUTES.WeekEllie)} onManual={() => setConfirm('manual')} />
        </GuideAnchor>

        {week.plan ? (
          <View style={styles.planToggle}>
            <Button
              label={week.plan.active ? 'Desactivar el plan de esta semana' : 'Activar el plan de esta semana'}
              variant="text"
              onPress={() => (week.plan?.active ? setConfirm('deactivate') : togglePlan())}
            />
          </View>
        ) : null}
      </ScrollView>

      <Sheet
        open={confirm === 'manual'}
        onClose={() => setConfirm(null)}
        title="¿Empezar en blanco?"
        footer={<Button label="Vaciar y planificar" onPress={emptyWeek} style={styles.flex1} />}
      >
        <TextV2 variant="body" tone="secondary">
          Se vacían los días desde hoy. Los días que ya pasaron se quedan como están.
        </TextV2>
      </Sheet>

      <Sheet
        open={confirm === 'deactivate'}
        onClose={() => setConfirm(null)}
        title="¿Desactivar el plan?"
        footer={<Button label="Desactivar" onPress={togglePlan} style={styles.flex1} />}
      >
        <TextV2 variant="body" tone="secondary">
          Inicio volverá a sugerirte una rutina cada día. Tus días se guardan por si lo vuelves a activar.
        </TextV2>
      </Sheet>

      <Sheet
        open={pickerDate !== null}
        onClose={() => setPickerDate(null)}
        eyebrow={pickerDate ? dayLabel(pickerDate, '') : undefined}
        title="Elige la sesión"
        scrollable
      >
        {pickerDay ? (
          <View>
            <PickRow
              rest
              title="Descanso"
              subtitle="Recuperación"
              selected={pickerDay.kind === 'rest'}
              onPress={() => pick(pickerDay.date, null)}
            />
            {library.items.map(workout => {
              const routine = weekRoutineFrom(workout);
              return (
                <PickRow
                  key={routine.id}
                  title={routine.title}
                  subtitle={`${routineTypeText(routine)} · ${routine.duration} min${
                    routine.exerciseCount ? ` · ${routine.exerciseCount} ejercicios` : ''
                  }`}
                  image={routineImage(routine)}
                  selected={pickerDay.kind === 'session' && pickerDay.routine?.id === routine.id}
                  onPress={() => pick(pickerDay.date, routine.id)}
                />
              );
            })}
            {library.isLoading ? (
              <TextV2 variant="meta" tone="secondary" style={styles.pickNote}>
                Cargando rutinas…
              </TextV2>
            ) : library.isError ? (
              <TextV2 variant="meta" tone="secondary" style={styles.pickNote}>
                No pudimos cargar las rutinas.
              </TextV2>
            ) : null}
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex1: { flex: 1 },
  gap4: { gap: 4 },
  fs14: { fontSize: 14 },
  state: { padding: SIDE },
  headerOrb: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  top: { paddingHorizontal: SIDE, paddingTop: 8, gap: 20 },
  range: { fontSize: 30, lineHeight: 32, fontWeight: '600', letterSpacing: -0.9 },
  moving: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: -6 },
  cancel: { height: 44, paddingHorizontal: 4, justifyContent: 'center' },
  track: { paddingHorizontal: SIDE, paddingTop: 18, paddingBottom: 24, alignItems: 'flex-start' },
  separator: { width: GAP },
  planToggle: { paddingHorizontal: SIDE, paddingTop: 12, alignItems: 'center' },
  pickNote: { paddingVertical: 14 },
});
