import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Activity,
  ArrowLeft,
  BicepsFlexed,
  Check,
  CircleAlert,
  Dumbbell,
  Flame,
  Minus,
  Plus,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import {
  AuraMark,
  PressableScale,
  StatusBarV2,
  TextV2,
  haptics,
  useThemeV2,
} from '@app/components/v2';
import { APP_ROUTES, ROOT_ROUTES } from '@app/constants/routes';
import {
  DAY_LETTERS,
  goalLabelKey,
  goalSubKey,
  isoWeekdayName,
  useTrainingPlanText,
  type TrainingPlanCopyKey,
} from '@app/features/trainingPlan/trainingPlanCopy';
import {
  DURATIONS,
  SESSION_LENGTHS,
  TARGETS,
  blocksOf,
  buildPlanRequest,
  canContinueDays,
  formatTarget,
  goalFromProfile,
  initialAnswers,
  recommendedWeeks,
  requestMessage,
  stepTarget,
  styleOptions,
  targetEstimate,
  targetOption,
  targetStart,
  toggleDay,
  totalSessions,
  type CreateAnswers,
} from '@app/features/trainingPlan/trainingPlanModel';
import { AntonText } from '@app/features/trainingPlan/v2/PlanParts';
import { CATEGORY_COVERS } from '@app/features/workouts/workoutAssets';
import { useAuth } from '@app/hooks/useAuth';
import { useRoutineCategories } from '@app/hooks/useRoutines';
import { createUuid } from '@app/lib/uuid';
import { safeGoBack } from '@app/navigation/safeGoBack';
import { EllieError, sendEllieMessage } from '@app/services/ellie/ellieService';
import { useQuery } from '@tanstack/react-query';
import {
  TRAINING_GOALS,
  fetchGoalTargetEstimates,
  type TrainingGoal,
} from '@app/services/supabase/trainingPlan';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'TrainingPlanCreate'>;

// 0–3: the four steps · generating · error (the answers are kept).
type Phase = 0 | 1 | 2 | 3 | 'generating' | 'error';

const GOAL_ICONS: Record<TrainingGoal, LucideIcon> = {
  gain_muscle: BicepsFlexed,
  gain_strength: Dumbbell,
  lose_weight: Flame,
  performance: Activity,
};

// The four lines of Generando mark themselves at these times (31.1); the
// chat opens once all four are marked, never before.
const STEP_MS = [700, 1400, 2100];
const MIN_GENERATING_MS = 2900;
const BACK_FALLBACKS = [ROOT_ROUTES.MainTabs];

// Crear plan (handoff v2.21 §31.1): a step-by-step sheet below the status
// bar. 1 Tu objetivo · 2 ¿Cuánto dura? · 3 ¿Qué días entrenas? · 4 Meta y
// estilo (optional). "Crear plan" sends the structured training_plan_request
// to ellie-chat (tp-1.2 §4), shows Generando (AURA processing and four
// steps) and then opens the chat with the proposal. A failure shows the
// error with Reintentar; the answers stay.
export function TrainingPlanCreateScreen({ navigation, route }: Props) {
  const { colors, mode, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const { t, language } = useTrainingPlanText();
  const categories = useRoutineCategories();
  // "Hoy: … estimado" of the four targets (get_goal_target_estimates).
  const estimates = useQuery({
    queryKey: ['training-plan', 'goal-target-estimates', profile?.id],
    enabled: Boolean(profile?.id),
    staleTime: 5 * 60 * 1000,
    queryFn: fetchGoalTargetEstimates,
  });
  const estimateOf = (key: CreateAnswers['target']) =>
    targetEstimate(targetOption(key), estimates.data ?? []);
  const [phase, setPhase] = useState<Phase>(0);
  // "Ver propuesta" of the final report arrives with the goal and the weeks
  // already chosen; "Crear otro" and every other entry starts from the profile.
  const [answers, setAnswers] = useState<CreateAnswers>(() => ({
    ...initialAnswers(profile),
    ...(route.params?.goal ? { goal: route.params.goal } : null),
    ...(route.params?.weeks ? { weeks: route.params.weeks } : null),
  }));
  const [marked, setMarked] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const mounted = useRef(true);
  // The last send: its answers and its client_message_id, generated once
  // per send and reused by Reintentar (ellie-chat never builds two plans).
  const lastSend = useRef<{ answers: CreateAnswers; messageId: string } | null>(null);
  // invalid_input (e.g. goal_target.exercise_slug) gets the generic error;
  // anything else, the dropped connection.
  const [failure, setFailure] = useState<'generic' | 'connection'>('connection');
  const scroll = useRef<ScrollView>(null);

  const profileGoal = goalFromProfile(profile?.goal);
  const styles_ = useMemo(
    () => styleOptions(categories.data ?? [], language),
    [categories.data, language],
  );

  useEffect(
    () => () => {
      mounted.current = false;
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  const update = (patch: Partial<CreateAnswers>) => setAnswers(current => ({ ...current, ...patch }));
  const goTo = (next: Phase) => {
    setPhase(next);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };

  const styleName = (key: string | null) => {
    if (!key) {
      return null;
    }
    const option = styles_.find(item => item.key === key);
    return option?.name ?? t(`style.${key}` as TrainingPlanCopyKey);
  };

  // A new send (Crear plan / Omitir y crear) gets a new id; Reintentar
  // sends the same request with the same id.
  const generate = async (send: { answers: CreateAnswers; messageId: string }) => {
    lastSend.current = send;
    const chosen = send.answers;
    timers.current.forEach(clearTimeout);
    timers.current = STEP_MS.map((ms, index) => setTimeout(() => setMarked(index + 1), ms));
    setMarked(0);
    goTo('generating');
    const style = styles_.find(item => item.key === chosen.style) ?? null;
    const started = Date.now();
    try {
      // JSON (stream: false): this sheet shows Generando, not the text, and
      // the chat reads the card from the conversation's history.
      const reply = await sendEllieMessage({
        conversationId: null,
        clientMessageId: send.messageId,
        message: requestMessage(language, chosen, styleName(chosen.style)),
        mode: 'generate_training_plan',
        clientContext: 'training_plan_create',
        trainingPlanRequest: buildPlanRequest(chosen, style?.slug ?? null, estimateOf(chosen.target)),
      });
      const left = MIN_GENERATING_MS - (Date.now() - started);
      if (left > 0) {
        await new Promise<void>(resolve => {
          timers.current.push(setTimeout(resolve, left));
        });
      }
      if (!mounted.current) {
        return;
      }
      setMarked(4);
      haptics.success();
      // The chat opens on the new conversation: the summary, ELLIE's answer
      // and the proposal come from its history.
      navigation.replace(APP_ROUTES.EllieChat, {
        conversationId: reply.conversationId,
        source: 'training_plan_create',
      });
    } catch (error) {
      __DEV__ && console.warn('[training-plan] training_plan_request:', error);
      timers.current.forEach(clearTimeout);
      if (mounted.current) {
        setFailure(error instanceof EllieError && error.code === 'invalid_input' ? 'generic' : 'connection');
        haptics.error();
        goTo('error');
      }
    }
  };

  const next = () => {
    if (phase === 'error') {
      generate(lastSend.current ?? { answers, messageId: createUuid() }).catch(() => undefined);
      return;
    }
    if (phase === 2 && !canContinueDays(answers.days)) {
      return;
    }
    if (phase === 3) {
      generate({ answers, messageId: createUuid() }).catch(() => undefined);
      return;
    }
    if (typeof phase === 'number') {
      haptics.light();
      goTo((phase + 1) as Phase);
    }
  };

  const skip = () => {
    const chosen = { ...answers, target: 'none' as const, targetValue: 0, style: null };
    setAnswers(chosen);
    generate({ answers: chosen, messageId: createUuid() }).catch(() => undefined);
  };

  const close = () => safeGoBack(navigation, BACK_FALLBACKS);
  const isForm = typeof phase === 'number';
  const stepLabel = isForm
    ? t('create.step', { n: phase + 1 })
    : phase === 'generating'
      ? t('create.generating')
      : t('create.error');
  const total = totalSessions(answers);
  const blocks = blocksOf(answers.weeks);
  const daysOk = canContinueDays(answers.days);

  // Radio of a choice row: Ember ring 7 when chosen, hairline else.
  const radio = (on: boolean) => (
    <View
      style={[
        styles.radio,
        { backgroundColor: colors.surface.raised },
        on ? [styles.radioOn, { borderColor: colors.ember.base }] : [styles.radioOff, { borderColor: colors.divider }],
      ]}
    />
  );
  const choiceBorder = (on: boolean) =>
    on ? [styles.choiceOn, { borderColor: colors.text.primary }] : [styles.choiceOff, { borderColor: colors.divider }];

  const titleBlock = (title: string, body: string, trailing?: ReactNode) => (
    <View style={styles.titleBlock}>
      <View style={styles.titleRow}>
        <AntonText size={36} style={styles.shrink}>
          {title}
        </AntonText>
        {trailing}
      </View>
      <TextV2 variant="label" color={colors.text.secondary} style={styles.bodyText}>
        {body}
      </TextV2>
    </View>
  );

  const stepGoal = (
    <>
      {titleBlock(t('goal.title'), t(profileGoal.fromProfile ? 'goal.body.profile' : 'goal.body.free'))}
      <View style={styles.list}>
        {TRAINING_GOALS.map(goal => {
          const on = answers.goal === goal;
          const Icon = GOAL_ICONS[goal];
          return (
            <PressableScale
              key={goal}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => {
                haptics.selection();
                update({ goal, weeks: recommendedWeeks(goal) });
              }}
              style={[styles.choice, { backgroundColor: colors.surface.raised }, choiceBorder(on)]}
            >
              <View style={[styles.goalIcon, { backgroundColor: colors.surface.muted }]}>
                <Icon size={18} color={colors.text.primary} strokeWidth={2} />
              </View>
              <View style={styles.choiceTexts}>
                <View style={styles.choiceTitleRow}>
                  <TextV2 variant="bodyStrong" style={styles.fs16}>
                    {t(goalLabelKey(goal))}
                  </TextV2>
                  {/* "Tu perfil" only when goal_from_profile would be true. */}
                  {profileGoal.fromProfile && profileGoal.goal === goal ? (
                    <View style={[styles.smallChip, { backgroundColor: colors.surface.muted }]}>
                      <TextV2 variant="captionStrong" color={colors.text.secondary} style={styles.fs11}>
                        {t('goal.profile')}
                      </TextV2>
                    </View>
                  ) : null}
                </View>
                <TextV2 variant="meta" color={colors.text.secondary}>
                  {t(goalSubKey(goal))}
                </TextV2>
              </View>
              {radio(on)}
            </PressableScale>
          );
        })}
      </View>
    </>
  );

  const recommended = recommendedWeeks(answers.goal);
  const stepDuration = (
    <>
      {titleBlock(t('duration.title'), t('duration.body'))}
      <View style={styles.list}>
        {DURATIONS.map((weeks, index) => {
          const on = answers.weeks === weeks;
          return (
            <PressableScale
              key={weeks}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => {
                haptics.selection();
                update({ weeks });
              }}
              style={[styles.choice, styles.durationChoice, { backgroundColor: colors.surface.raised }, choiceBorder(on)]}
            >
              <AntonText size={44} style={styles.durationNumber}>
                {String(index + 1)}
              </AntonText>
              <View style={styles.choiceTexts}>
                <View style={styles.choiceTitleRow}>
                  <TextV2 variant="bodyStrong" style={styles.fs16}>
                    {t(`duration.${weeks}` as const)}
                  </TextV2>
                  {weeks === recommended ? (
                    <View style={[styles.smallChip, { backgroundColor: colors.ember.base }]}>
                      <TextV2 color="#121212" style={styles.recommended}>
                        {t('duration.recommended')}
                      </TextV2>
                    </View>
                  ) : null}
                </View>
                <TextV2 variant="meta" color={colors.text.secondary}>
                  {t(`duration.${weeks}.sub` as const)}
                </TextV2>
                <View style={styles.miniWeeks}>
                  {Array.from({ length: weeks }, (_, week) => (
                    <View
                      key={week}
                      style={[
                        styles.miniWeek,
                        {
                          backgroundColor:
                            (week + 1) % 4 === 0
                              ? colors.plan.tyD
                              : on
                                ? colors.ember.base
                                : colors.divider,
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>
              {radio(on)}
            </PressableScale>
          );
        })}
      </View>
      <View style={[styles.why, { backgroundColor: colors.surface.muted }]}>
        <AuraMark size={20} state="rest" style={styles.whyMark} />
        <TextV2 variant="meta" color={colors.text.secondary} style={styles.flex}>
          {t(`duration.why.${answers.goal}` as const)}
        </TextV2>
      </View>
    </>
  );

  const letters = DAY_LETTERS[language];
  const stepDays = (
    <>
      {titleBlock(t('days.title'), t('days.body'))}
      <View style={styles.daysRow}>
        {letters.map((letter, index) => {
          const isoDay = index + 1;
          const on = answers.days.includes(isoDay);
          return (
            <PressableScale
              key={isoDay}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={isoWeekdayName(language, isoDay)}
              onPress={() => {
                haptics.selection();
                update({ days: toggleDay(answers.days, isoDay) });
              }}
              style={[
                styles.dayChip,
                { backgroundColor: on ? colors.cta.primary : colors.surface.muted },
              ]}
            >
              <TextV2 variant="bodyStrong" color={on ? colors.cta.primaryText : colors.text.primary}>
                {letter}
              </TextV2>
            </PressableScale>
          );
        })}
      </View>
      <View style={styles.lengthBlock}>
        <TextV2 variant="bodyStrong">{t('days.length')}</TextV2>
        <View style={[styles.segmented, { backgroundColor: colors.surface.muted }]}>
          {SESSION_LENGTHS.map(minutes => {
            const on = answers.minutes === minutes;
            return (
              <PressableScale
                key={minutes}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => {
                  haptics.selection();
                  update({ minutes });
                }}
                style={[styles.segment, on ? { backgroundColor: colors.cta.primary } : null]}
              >
                <TextV2 variant="label" color={on ? colors.cta.primaryText : colors.text.primary}>
                  {t('days.minutes', { n: minutes })}
                </TextV2>
              </PressableScale>
            );
          })}
        </View>
      </View>
      <View style={[styles.summary, { backgroundColor: colors.surface.muted }]}>
        <AntonText size={32}>{t('days.total', { n: total })}</AntonText>
        <TextV2 variant="label" color={colors.text.secondary} style={styles.regular}>
          {t('days.totalLine', { days: answers.days.length, min: answers.minutes, weeks: answers.weeks })}
        </TextV2>
      </View>
    </>
  );

  const target = targetOption(answers.target);
  const todayEstimate = estimateOf(answers.target);
  const stepTargetStyle = (
    <>
      {titleBlock(
        t('meta.title'),
        t('meta.body'),
        <View style={[styles.optional, { backgroundColor: colors.surface.muted }]}>
          <TextV2 variant="captionStrong" color={colors.text.secondary}>
            {t('meta.optional')}
          </TextV2>
        </View>,
      )}
      <View style={styles.section}>
        <TextV2 variant="bodyStrong">{t('meta.target')}</TextV2>
        <View style={styles.wrap}>
          {TARGETS.map(option => {
            const on = answers.target === option.key;
            return (
              <PressableScale
                key={option.key}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => {
                  haptics.selection();
                  // From today's estimate + one step, else the handoff's.
                  update({ target: option.key, targetValue: targetStart(option, estimateOf(option.key)) });
                }}
                style={[styles.pill, { backgroundColor: on ? colors.cta.primary : colors.surface.muted }]}
              >
                <TextV2 variant="label" color={on ? colors.cta.primaryText : colors.text.primary}>
                  {t(option.labelKey)}
                </TextV2>
              </PressableScale>
            );
          })}
        </View>
        {answers.target !== 'none' ? (
          <View style={[styles.stepper, { backgroundColor: colors.surface.muted }]}>
            <View style={styles.choiceTexts}>
              <TextV2 variant="bodyStrong">
                {t(target.unit === 'kg' ? 'meta.kgTitle' : 'meta.repsTitle', { name: t(target.labelKey) })}
              </TextV2>
              <TextV2 variant="caption" color={colors.text.secondary}>
                {todayEstimate !== null
                  ? t(target.unit === 'kg' ? 'meta.todayKg' : 'meta.todayReps', {
                      n: formatTarget(language, todayEstimate),
                    })
                  : t(target.unit === 'kg' ? 'meta.kgHint' : 'meta.repsHint')}
              </TextV2>
            </View>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={t('meta.less')}
              onPress={() => {
                haptics.selection();
                update({ targetValue: stepTarget(answers, -1) });
              }}
              style={[styles.stepButton, { backgroundColor: colors.surface.raised }]}
            >
              <Minus size={16} color={colors.text.primary} strokeWidth={2.2} />
            </PressableScale>
            <AntonText size={26} style={styles.stepValue}>
              {formatTarget(language, answers.targetValue)}
            </AntonText>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={t('meta.more')}
              onPress={() => {
                haptics.selection();
                update({ targetValue: stepTarget(answers, 1) });
              }}
              style={[styles.stepButton, { backgroundColor: colors.surface.raised }]}
            >
              <Plus size={16} color={colors.text.primary} strokeWidth={2.2} />
            </PressableScale>
          </View>
        ) : null}
      </View>
      <View style={styles.section}>
        <TextV2 variant="bodyStrong">{t('style.title')}</TextV2>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -layout.gutter }}
          contentContainerStyle={[styles.styleRow, { paddingHorizontal: layout.gutter }]}
        >
          {[{ key: null as string | null }, ...styles_].map(option => {
            const on = answers.style === option.key;
            const cover = option.key ? CATEGORY_COVERS[option.key] : null;
            const label = option.key ? styleName(option.key) : t('style.none');
            return (
              <PressableScale
                key={option.key ?? 'none'}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={label ?? ''}
                onPress={() => {
                  haptics.selection();
                  update({ style: option.key });
                }}
                style={[
                  styles.styleCard,
                  cover ? styles.styleCardPhoto : { backgroundColor: colors.surface.muted },
                  on ? [styles.styleCardOn, { borderColor: colors.ember.base }] : null,
                ]}
              >
                {cover ? (
                  <>
                    <Image
                      source={cover.image}
                      contentFit="cover"
                      contentPosition={cover.focus}
                      accessibilityIgnoresInvertColors
                      style={StyleSheet.absoluteFill}
                    />
                    <LinearGradient
                      colors={['rgba(20,19,18,0)', 'rgba(20,19,18,.85)']}
                      locations={[0.4, 1]}
                      style={StyleSheet.absoluteFill}
                    />
                  </>
                ) : null}
                <TextV2
                  variant="label"
                  color={cover ? '#FFFFFF' : colors.text.primary}
                  style={styles.styleName}
                >
                  {label}
                </TextV2>
                {on ? (
                  <View style={[styles.styleCheck, { backgroundColor: colors.ember.base }]}>
                    <Check size={13} color="#121212" strokeWidth={2.8} />
                  </View>
                ) : null}
              </PressableScale>
            );
          })}
        </ScrollView>
      </View>
    </>
  );

  const generatingSteps: string[] = [
    t('gen.step1'),
    blocks === 1 ? t('gen.step2.one', { n: total }) : t('gen.step2', { n: total, b: blocks }),
    t('gen.step3'),
    t('gen.step4'),
  ];
  const stepGenerating = (
    <View style={styles.center}>
      <AuraMark size={112} state="processing" />
      <View style={styles.centerTexts}>
        <TextV2 color={colors.text.secondary} style={styles.genEyebrow}>
          {t('gen.eyebrow')}
        </TextV2>
        <AntonText size={32} style={styles.centerTitle}>
          {t('gen.title')}
        </AntonText>
      </View>
      <View style={styles.genSteps}>
        {generatingSteps.map((line, index) => {
          const ok = index < marked;
          const current = index === marked;
          return (
            <View key={index} style={styles.genStep}>
              <View
                style={[
                  styles.genDot,
                  ok
                    ? { backgroundColor: colors.ember.base }
                    : [styles.genDotOpen, { borderColor: current ? colors.ember.base : colors.divider }],
                ]}
              >
                {ok ? <Check size={11} color="#121212" strokeWidth={3} /> : null}
              </View>
              <TextV2
                variant="label"
                color={ok || current ? colors.text.primary : colors.text.secondary}
                style={[styles.regular, styles.flex]}
              >
                {line}
              </TextV2>
            </View>
          );
        })}
      </View>
    </View>
  );

  const stepError = (
    <View style={styles.center}>
      <View style={[styles.errorIcon, { backgroundColor: colors.plan.emS }]}>
        <CircleAlert size={28} color={colors.text.primary} strokeWidth={2} />
      </View>
      <AntonText size={32} style={styles.centerTitle}>
        {t('gen.errorTitle')}
      </AntonText>
      <TextV2 variant="body" color={colors.text.secondary} align="center" style={styles.errorBody}>
        {t(failure === 'generic' ? 'gen.errorBodyGeneric' : 'gen.errorBody')}
      </TextV2>
    </View>
  );

  const showFooter = isForm || phase === 'error';
  const nextDisabled = phase === 2 && !daysOk;
  const nextLabel =
    phase === 3 ? t('create.submit') : phase === 'error' ? t('create.retry') : t('create.next');

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface.raised }]}>
      <StatusBarV2 />
      <View style={[styles.top, { paddingTop: Math.max(10, insets.top > 30 ? 10 : insets.top) }]}>
        <View style={[styles.grabber, { backgroundColor: colors.divider }]} />
        <View style={styles.header}>
          {isForm && phase > 0 ? (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={t('create.back')}
              onPress={() => goTo((phase - 1) as Phase)}
              style={[styles.round, { backgroundColor: colors.surface.muted }]}
            >
              <ArrowLeft size={18} color={colors.text.primary} strokeWidth={2} />
            </PressableScale>
          ) : (
            <View style={styles.round} />
          )}
          <View style={styles.headerTexts} accessibilityRole="header">
            <TextV2 variant="bodyStrong" style={styles.fs16} align="center">
              {t('create.title')}
            </TextV2>
            <TextV2 variant="caption" color={colors.text.secondary} align="center">
              {stepLabel}
            </TextV2>
          </View>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={t('create.close')}
            onPress={close}
            style={[styles.round, { backgroundColor: colors.surface.muted }]}
          >
            <X size={16} color={colors.text.primary} strokeWidth={2.2} />
          </PressableScale>
        </View>
        {isForm ? (
          <View style={styles.progress}>
            {[0, 1, 2, 3].map(index => (
              <View
                key={index}
                style={[
                  styles.progressSegment,
                  { backgroundColor: index <= phase ? colors.ember.base : colors.divider },
                ]}
              />
            ))}
          </View>
        ) : null}
      </View>

      <ScrollView
        ref={scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: layout.gutter, paddingBottom: (showFooter ? 150 : 40) + insets.bottom },
          isForm ? null : styles.contentCenter,
        ]}
      >
        {phase === 0
          ? stepGoal
          : phase === 1
            ? stepDuration
            : phase === 2
              ? stepDays
              : phase === 3
                ? stepTargetStyle
                : phase === 'generating'
                  ? stepGenerating
                  : stepError}
      </ScrollView>

      {showFooter ? (
        <View
          pointerEvents="box-none"
          style={[styles.footer, { paddingHorizontal: layout.gutter, paddingBottom: Math.max(insets.bottom, 20) + 14 }]}
        >
          <LinearGradient
            pointerEvents="none"
            colors={[
              mode === 'light' ? 'rgba(255,255,255,0)' : 'rgba(28,27,25,0)',
              colors.surface.raised,
            ]}
            locations={[0, 0.28]}
            style={StyleSheet.absoluteFill}
          />
          <PressableScale
            accessibilityRole="button"
            accessibilityState={{ disabled: nextDisabled }}
            accessibilityHint={nextDisabled ? t('create.minDays') : undefined}
            disabled={nextDisabled}
            onPress={next}
            style={[styles.cta, { backgroundColor: colors.cta.primary }, nextDisabled ? styles.ctaOff : null]}
          >
            <TextV2 variant="cta" color={colors.cta.primaryText} align="center">
              {nextLabel}
            </TextV2>
          </PressableScale>
          {phase === 3 ? (
            <PressableScale accessibilityRole="button" onPress={skip} style={styles.skip}>
              <TextV2 variant="label" align="center">
                {t('create.skip')}
              </TextV2>
            </PressableScale>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  shrink: { flexShrink: 1 },
  regular: { fontWeight: '400' },
  fs11: { fontSize: 11 },
  fs16: { fontSize: 16 },
  top: { paddingHorizontal: 16, gap: 10 },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3 },
  header: { flexDirection: 'row', alignItems: 'center' },
  headerTexts: { flex: 1, gap: 1, paddingHorizontal: 8 },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  progress: { flexDirection: 'row', gap: 4, paddingHorizontal: 4 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2 },
  content: { paddingTop: 22, gap: 18 },
  contentCenter: { flexGrow: 1, justifyContent: 'center' },
  titleBlock: { gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  bodyText: { fontWeight: '400', lineHeight: 20 },
  list: { gap: 8 },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 18,
  },
  durationChoice: { borderRadius: 20, paddingHorizontal: 18, gap: 16 },
  goalIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  choiceTexts: { flex: 1, minWidth: 0, gap: 3 },
  choiceTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  smallChip: { minHeight: 20, paddingHorizontal: 8, borderRadius: 10, justifyContent: 'center' },
  recommended: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  radio: { width: 22, height: 22, borderRadius: 11 },
  radioOn: { borderWidth: 7 },
  radioOff: { borderWidth: 2 },
  choiceOn: { borderWidth: 2 },
  choiceOff: { borderWidth: 1 },
  durationNumber: { width: 34 },
  miniWeeks: { flexDirection: 'row', gap: 3, marginTop: 4 },
  miniWeek: { width: 14, height: 5, borderRadius: 3 },
  why: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 16 },
  whyMark: { marginTop: 1 },
  daysRow: { flexDirection: 'row', gap: 6 },
  dayChip: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  lengthBlock: { gap: 10, marginTop: 6 },
  segmented: { flexDirection: 'row', padding: 3, borderRadius: 999, gap: 2 },
  segment: { flex: 1, minHeight: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  summary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: 8,
    padding: 16,
    borderRadius: 18,
  },
  optional: { minHeight: 22, paddingHorizontal: 9, borderRadius: 11, justifyContent: 'center' },
  section: { gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { minHeight: 38, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 19, justifyContent: 'center' },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  stepButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: 64, textAlign: 'center' },
  styleRow: { gap: 10, paddingTop: 2, paddingBottom: 4 },
  styleCard: { width: 118, height: 150, borderRadius: 18, overflow: 'hidden' },
  styleCardPhoto: { backgroundColor: '#141312' },
  styleCardOn: { borderWidth: 3 },
  styleName: { position: 'absolute', left: 12, right: 12, bottom: 12, lineHeight: 17 },
  styleCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { alignItems: 'center', gap: 22, paddingVertical: 24 },
  centerTexts: { alignItems: 'center', gap: 8 },
  centerTitle: { textAlign: 'center', maxWidth: 300 },
  genEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.3, textTransform: 'uppercase' },
  genSteps: { width: '100%', maxWidth: 320, gap: 10, alignItems: 'flex-start' },
  genStep: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  genDot: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  genDotOpen: { borderWidth: 2 },
  errorIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  errorBody: { maxWidth: 300 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 14, gap: 6 },
  cta: {
    minHeight: 54,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  ctaOff: { opacity: 0.35 },
  skip: { minHeight: 40, alignItems: 'center', justifyContent: 'center' },
});
