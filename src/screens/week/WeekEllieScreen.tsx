import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Lock, Moon } from 'lucide-react-native';
import {
  AppImage,
  BackButton,
  EllieActionButton,
  LivingHalo,
  PressableScale,
  StatusBarV2,
  TextV2,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { deviceTimezone } from '@app/features/profile/timezoneSync';
import { RadioDot, routineImage, routineTypeText } from '@app/features/week/v2/WeekParts';
import {
  DAY_LETTERS,
  ELLIE_QUESTIONS,
  FOCUS_OPTIONS,
  GENERATION_STEPS,
  GENERATION_STEP_MS,
  MINUTE_OPTIONS,
  addDays,
  availabilityLine,
  dayNumber,
  previewLine,
  selectableWeekdays,
  weekdayIndex,
  type WeekFocus,
  type WeekMinutes,
  type WeekPreview,
} from '@app/features/week/weekModel';
import { routineErrorCopy } from '@app/features/workouts/routineErrors';
import { useAuth } from '@app/hooks/useAuth';
import { useProfileLanguage } from '@app/hooks/useProfileLanguage';
import { useWeekChange, useWeekPlan } from '@app/hooks/useWeekPlan';
import { safeGoBack } from '@app/navigation/safeGoBack';
import { ROOT_ROUTES } from '@app/constants/routes';
import { weekPlanService } from '@app/services/routines/weekPlanService';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'WeekEllie'>;
type Phase = 'ask' | 'gen' | 'res' | 'error';

function defaultFocus(goal: string | null | undefined): WeekFocus {
  return goal === 'gain_muscle' ? 'hypertrophy' : goal === 'lose_weight' ? 'endurance' : goal === 'improve_health' ? 'mixed' : 'strength';
}

function defaultMinutes(preferred: number | null | undefined): WeekMinutes {
  if (!preferred) {
    return 45;
  }
  return MINUTE_OPTIONS.reduce((best, option) =>
    Math.abs(option - preferred) < Math.abs(best - preferred) ? option : best,
  );
}

// Planificar con ELLIE (handoff v2.15 §25.1 · WEEK_04): three questions
// (days, focus, minutes), the generation (plan_week_with_ellie, three steps of
// 650 ms) and the preview. "Activar semana" (activate_week_plan) is the only
// moment the active plan changes.
export function WeekEllieScreen({ navigation }: Props) {
  const { colors } = useThemeV2();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const language = useProfileLanguage();
  const { profile } = useAuth();
  const weekQuery = useWeekPlan();
  const change = useWeekChange();
  const week = weekQuery.data ?? null;
  const weekStart = week?.weekStart ?? '';
  const today = week?.today ?? '';
  const selectable = useMemo(
    () => (week ? selectableWeekdays(week.weekStart, week.today) : []),
    [week],
  );

  const [phase, setPhase] = useState<Phase>('ask');
  const [step, setStep] = useState(0);
  const [days, setDays] = useState<number[] | null>(null);
  const [focus, setFocus] = useState<WeekFocus>(defaultFocus(profile?.goal));
  const [minutes, setMinutes] = useState<WeekMinutes>(defaultMinutes(profile?.preferredSessionMinutes));
  const [genIndex, setGenIndex] = useState(0);
  const [preview, setPreview] = useState<WeekPreview | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);
  const generation = useRef(0);

  // Every day from today is available until the user says otherwise.
  const chosen = days ?? selectable;
  const canGoOn = step !== 0 || chosen.some(day => selectable.includes(day));

  // The three steps tick every 650 ms; the preview shows once they are all
  // done and the server has answered.
  useEffect(() => {
    if (phase !== 'gen') {
      return;
    }
    if (genIndex < GENERATION_STEPS.length) {
      const id = setTimeout(() => setGenIndex(value => value + 1), GENERATION_STEP_MS);
      return () => clearTimeout(id);
    }
    if (preview) {
      setPhase('res');
    }
  }, [genIndex, phase, preview]);

  const generate = () => {
    const ticket = generation.current + 1;
    generation.current = ticket;
    setPreview(null);
    setErrorText(null);
    setGenIndex(0);
    setPhase('gen');
    weekPlanService
      .planWeekWithEllie(
        { days: chosen.filter(day => selectable.includes(day)), focus, minutes, weekStart },
        deviceTimezone(),
      )
      .then(result => {
        if (generation.current === ticket) {
          setPreview(result);
        }
      })
      .catch(error => {
        if (generation.current === ticket) {
          setErrorText(routineErrorCopy(error, language).message);
          setPhase('error');
        }
      });
  };

  const next = () => {
    if (!canGoOn) {
      return;
    }
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    generate();
  };

  const back = () => {
    if (phase === 'ask' && step > 0) {
      setStep(step - 1);
    } else if (phase === 'res' || phase === 'error') {
      setPhase('ask');
      setStep(2);
    } else {
      generation.current += 1;
      safeGoBack(navigation, [ROOT_ROUTES.MainTabs]);
    }
  };

  const activate = async () => {
    if (!preview) {
      return;
    }
    setActivating(true);
    try {
      await change(() => weekPlanService.activateWeekPlan(preview.planId));
      toast.show('Tu semana está lista');
      safeGoBack(navigation, [ROOT_ROUTES.MainTabs]);
    } catch (error) {
      toast.show(routineErrorCopy(error, language).message, { tone: 'error' });
    } finally {
      setActivating(false);
    }
  };

  const toggleDay = (weekday: number) =>
    setDays(current => {
      const base = current ?? selectable;
      return base.includes(weekday) ? base.filter(day => day !== weekday) : [...base, weekday];
    });

  const line =
    phase === 'gen'
      ? 'Armando tu semana…'
      : phase === 'res' && preview
        ? previewLine(preview, today, focus)
        : phase === 'error'
          ? 'No pude armar tu semana.'
          : ELLIE_QUESTIONS[step];

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <LinearGradient
        colors={['rgba(255,91,31,.07)', 'rgba(255,91,31,0)']}
        locations={[0, 0.45]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={[styles.nav, { paddingTop: insets.top + 8 }]}>
        <BackButton onPress={back} />
        <TextV2 variant="cta" align="center" style={styles.navTitle}>
          Planificar semana
        </TextV2>
        <TextV2 variant="meta" color={colors.text.secondary} align="center" style={styles.navStep}>
          {phase === 'ask' ? `${step + 1}/3` : ''}
        </TextV2>
      </View>
      {phase === 'ask' ? (
        <View style={styles.bars}>
          {[0, 1, 2].map(i => (
            <View
              key={i}
              style={[styles.bar, { backgroundColor: i <= step ? colors.ember.base : colors.divider }]}
            />
          ))}
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.gap18}>
          <LivingHalo size={56} state={phase === 'gen' ? 'thinking' : 'idle'} />
          <View style={styles.gap8}>
            <TextV2 color={colors.text.secondary} style={styles.ellieLabel}>
              ELLIE
            </TextV2>
            <TextV2 style={styles.question}>{line}</TextV2>
          </View>
        </View>

        {phase === 'ask' && step === 0 && week ? (
          <View style={styles.gap12}>
            <View style={styles.row6}>
              {Array.from({ length: 7 }, (_, i) => {
                const weekday = i + 1;
                const date = addDays(weekStart, i);
                const past = !selectable.includes(weekday);
                const on = !past && chosen.includes(weekday);
                const pillColor = past ? 'transparent' : on ? colors.cta.primary : colors.surface.raised;
                return (
                  <PressableScale
                    key={date}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on, disabled: past }}
                    disabled={past}
                    onPress={() => toggleDay(weekday)}
                    style={[styles.dayPill, { backgroundColor: pillColor }]}
                  >
                    <TextV2
                      variant="bodyStrong"
                      color={past ? colors.text.disabled : on ? colors.cta.primaryText : colors.text.primary}
                      style={styles.fs15}
                    >
                      {DAY_LETTERS[weekdayIndex(date)]}
                    </TextV2>
                    <TextV2
                      color={past ? colors.text.disabled : on ? colors.cta.primaryText : colors.text.primary}
                      style={styles.dayNum}
                    >
                      {String(dayNumber(date))}
                    </TextV2>
                  </PressableScale>
                );
              })}
            </View>
            <TextV2 variant="body" color={colors.text.secondary} style={styles.fs14}>
              {availabilityLine(chosen, weekStart, today)}
            </TextV2>
          </View>
        ) : null}

        {phase === 'ask' && step === 1 ? (
          <View>
            {FOCUS_OPTIONS.map(option => (
              <PressableScale
                key={option.key}
                accessibilityRole="radio"
                accessibilityState={{ selected: focus === option.key }}
                onPress={() => setFocus(option.key)}
                style={[styles.focusRow, { borderBottomColor: colors.divider }]}
              >
                <RadioDot selected={focus === option.key} size={22} />
                <View style={styles.gap2}>
                  <TextV2 variant="cta">{option.title}</TextV2>
                  <TextV2 variant="meta" color={colors.text.secondary}>
                    {option.subtitle}
                  </TextV2>
                </View>
              </PressableScale>
            ))}
          </View>
        ) : null}

        {phase === 'ask' && step === 2 ? (
          <View style={styles.gap14}>
            <View style={styles.row8}>
              {MINUTE_OPTIONS.map(option => {
                const on = minutes === option;
                return (
                  <PressableScale
                    key={option}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    onPress={() => setMinutes(option)}
                    style={[styles.minuteTile, { backgroundColor: on ? colors.cta.primary : colors.surface.raised }]}
                  >
                    <TextV2 color={on ? colors.cta.primaryText : colors.text.primary} style={styles.minuteValue}>
                      {String(option)}
                    </TextV2>
                    <TextV2 variant="caption" color={on ? colors.cta.primaryText : colors.text.primary} style={styles.dim}>
                      min
                    </TextV2>
                  </PressableScale>
                );
              })}
            </View>
            <TextV2 variant="body" color={colors.text.secondary} style={styles.fs14}>
              Movilidad y descanso activo se quedan en 15 min.
            </TextV2>
          </View>
        ) : null}

        {phase === 'gen' ? (
          <View style={styles.gap12}>
            {GENERATION_STEPS.map((text, i) => {
              const on = i < genIndex;
              return (
                <View key={text} style={styles.genRow}>
                  <RadioDot selected={on} size={20} />
                  <TextV2
                    variant="body"
                    color={i <= genIndex ? colors.text.primary : colors.text.tertiary}
                    style={styles.fs15}
                  >
                    {text}
                  </TextV2>
                </View>
              );
            })}
          </View>
        ) : null}

        {phase === 'error' && errorText ? (
          <TextV2 variant="body" color={colors.text.secondary}>
            {errorText}
          </TextV2>
        ) : null}

        {phase === 'res' && preview ? (
          <View style={styles.preview}>
            {preview.days.map(day => {
              const past = day.date < today;
              const work = day.kind === 'session' && day.routine;
              return (
                <View
                  key={day.date}
                  style={[styles.previewRow, { borderBottomColor: colors.divider }, past ? styles.past : null]}
                >
                  <View style={styles.previewDay}>
                    <TextV2 variant="captionStrong" color={colors.text.secondary}>
                      {DAY_LETTERS[weekdayIndex(day.date)]}
                    </TextV2>
                    <TextV2 variant="cta">{String(dayNumber(day.date))}</TextV2>
                  </View>
                  {work && day.routine ? (
                    <AppImage source={routineImage(day.routine)} style={[styles.previewThumb, { backgroundColor: colors.divider }]} />
                  ) : (
                    <View
                      style={[
                        styles.previewThumb,
                        styles.center,
                        { backgroundColor: day.kind === 'unavailable' ? colors.surface.muted : colors.recovery.tintBg },
                      ]}
                    >
                      {day.kind === 'unavailable' ? (
                        <Lock size={16} color={colors.text.primary} strokeWidth={1.8} style={styles.dim} />
                      ) : (
                        <Moon size={16} color={colors.text.primary} strokeWidth={1.8} style={styles.dim} />
                      )}
                    </View>
                  )}
                  <View style={[styles.flex1, styles.gap2]}>
                    <TextV2 variant="bodyStrong" numberOfLines={1} style={styles.fs15}>
                      {work && day.routine
                        ? day.routine.title
                        : day.kind === 'unavailable'
                          ? 'No disponible'
                          : day.kind === 'empty'
                            ? 'Sin planificar'
                            : 'Descanso'}
                    </TextV2>
                    <TextV2 variant="meta" color={colors.text.secondary}>
                      {past
                        ? 'Ya pasó'
                        : work && day.routine
                          ? `${routineTypeText(day.routine)} · ${day.minutes ?? day.routine.duration} min`
                          : day.kind === 'unavailable'
                            ? 'Sin entreno'
                            : 'Recuperación'}
                    </TextV2>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 18 }]}>
        {phase === 'ask' ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityState={{ disabled: !canGoOn }}
            disabled={!canGoOn || !week}
            onPress={next}
            style={[styles.next, { backgroundColor: colors.cta.primary }, canGoOn ? null : styles.inactive]}
          >
            <TextV2 variant="cta" color={colors.cta.primaryText}>
              {step < 2 ? 'Siguiente' : 'Generar semana'}
            </TextV2>
          </PressableScale>
        ) : null}
        {phase === 'res' ? (
          <>
            <EllieActionButton
              label="Activar semana"
              size="lg"
              fullWidth
              loading={activating}
              loadingLabel="Activando…"
              onPress={activate}
            />
            <PressableScale accessibilityRole="button" onPress={() => { setPhase('ask'); setStep(0); }} style={styles.textButton}>
              <TextV2 variant="bodyStrong" style={styles.fs15}>
                Ajustar respuestas
              </TextV2>
            </PressableScale>
          </>
        ) : null}
        {phase === 'error' ? (
          <>
            <EllieActionButton label="Reintentar" size="lg" fullWidth onPress={generate} />
            <PressableScale accessibilityRole="button" onPress={() => { setPhase('ask'); setStep(0); }} style={styles.textButton}>
              <TextV2 variant="bodyStrong" style={styles.fs15}>
                Ajustar respuestas
              </TextV2>
            </PressableScale>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex1: { flex: 1, minWidth: 0 },
  center: { alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: 0.7 },
  gap2: { gap: 2 },
  gap8: { gap: 8 },
  gap12: { gap: 12 },
  gap14: { gap: 14 },
  gap18: { gap: 18 },
  row6: { flexDirection: 'row', gap: 6 },
  row8: { flexDirection: 'row', gap: 8 },
  fs14: { fontSize: 14 },
  fs15: { fontSize: 15 },
  nav: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 8 },
  navTitle: { flex: 1 },
  navStep: { width: 44 },
  bars: { flexDirection: 'row', gap: 4, paddingHorizontal: 20 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  body: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 24, gap: 26 },
  ellieLabel: { fontSize: 11, lineHeight: 13, fontWeight: '600', letterSpacing: 1.1 },
  question: { fontSize: 24, lineHeight: 31, fontWeight: '400', letterSpacing: -0.24 },
  dayPill: { flex: 1, height: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 2 },
  dayNum: { fontSize: 10, lineHeight: 12, fontWeight: '500', opacity: 0.7 },
  focusRow: { paddingVertical: 16, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  minuteTile: { flex: 1, height: 76, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 2 },
  minuteValue: { fontSize: 26, lineHeight: 28, fontWeight: '600', letterSpacing: -0.78 },
  genRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  preview: { marginTop: -6 },
  past: { opacity: 0.5 },
  inactive: { opacity: 0.4 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: 1 },
  previewDay: { width: 40, alignItems: 'center' },
  previewThumb: { width: 44, height: 44, borderRadius: 12 },
  footer: { paddingHorizontal: 20, paddingTop: 12, gap: 6 },
  next: { height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  textButton: { height: 44, alignItems: 'center', justifyContent: 'center' },
});
