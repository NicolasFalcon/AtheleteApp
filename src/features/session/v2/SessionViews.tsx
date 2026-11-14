import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Reanimated, {
  Easing,
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import {
  ArrowLeft,
  Bookmark,
  Check,
  CircleCheck,
  CirclePlay,
  Ellipsis,
  Pause,
  Play,
  RefreshCw,
  Repeat2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react-native';
import {
  AppImage,
  Button,
  GlassSurface,
  PressableScale,
  TextV2,
  isMediaImageSource,
  type AppImageSource,
} from '@app/components/v2';
import { useTrainingPlanText } from '@app/features/trainingPlan/trainingPlanCopy';
import { kgValue, lastTimeLine, repsRange } from '@app/features/trainingPlan/planSessionModel';
import {
  activePlan,
  formatClock,
  formatCountdown,
  formatDuration,
  formatKg,
  isNoLoadBlock,
  parseNumberInput,
  planAmount,
  planScheme,
  type PlannedExercise,
  type RestKind,
  type RestPhase,
} from '@app/features/session/sessionModel';
import type { SessionDraft } from '@app/features/session/useSessionRunner';
import { createTheme } from '@app/theme/theme';
import { useThemeV2 } from '@app/components/v2/useThemeV2';
import type { SessionMessagesMode } from '@app/lib/feedbackPrefs';

// Workout Session v2 (Session.dc.html, handoff §7 and Rest Timer / Session
// Pause Layer). Always a dark scene; colours are the prototype's.
const C = {
  plate: '#141312',
  card: '#1F1D1B',
  white: '#FFFFFF',
  body: '#E8E6E1',
  secondary: '#D8D6D1',
  meta: '#A8A6A1',
  tertiary: '#8C8A85',
  ember: '#FF5B1F',
  emberText: '#FF8A5C',
  recovery: '#6E8FB3',
  recoveryText: '#8FAACB',
  track: 'rgba(255,255,255,.12)',
  hairline: 'rgba(255,255,255,.07)',
  softButton: 'rgba(255,255,255,.1)',
};

// The focus scene is dark even when the app preference is light.
const REST_WARNING_COLOR = createTheme('dark').colors.danger;

const NUMBER_WORDS = [
  'Cero',
  'Uno',
  'Dos',
  'Tres',
  'Cuatro',
  'Cinco',
  'Seis',
  'Siete',
  'Ocho',
  'Nueve',
  'Diez',
];

// The picture of an exercise: its catalog thumb or poster (by key, signed
// when shown) when it has one, else (or if it fails to load) the generic
// muscle image.
export type ExerciseImage = {
  source: AppImageSource;
  fallback: ImageSourcePropType;
};
export type ThumbFor = (exercise: PlannedExercise) => ExerciseImage;

function ExercisePicture({
  image,
  style,
}: {
  image: ExerciseImage;
  style: StyleProp<ImageStyle>;
}) {
  const [failed, setFailed] = useState(false);
  // A new source gets a new chance.
  const identity = isMediaImageSource(image.source)
    ? image.source.mediaKey
    : typeof image.source === 'object' && image.source && 'uri' in image.source
      ? image.source.uri
      : undefined;
  useEffect(() => setFailed(false), [identity]);
  return (
    <AppImage
      source={failed ? image.fallback : image.source}
      style={style}
      onError={() => setFailed(true)}
    />
  );
}

export function doneLabel(done: number, total: number): string {
  return `${done} de ${total} ejercicios`;
}

// "3 × 10 · 2 × 14 kg" style meta for an exercise.
function exerciseMeta(exercise: PlannedExercise, weightKg?: number | null) {
  return [planScheme(exercise), formatKg(weightKg)].filter(Boolean).join(' · ');
}

// ── Header ──────────────────────────────────────────────────────────────────
export function SessionHeader({
  title,
  topInset,
  onBack,
  onMenu,
}: {
  title: string;
  topInset: number;
  onBack: () => void;
  onMenu?: () => void;
}) {
  return (
    <GlassSurface kind="nav" style={[styles.header, { paddingTop: topInset + 6 }]}>
      <RoundButton icon={ArrowLeft} label="Salir" onPress={onBack} />
      <View style={styles.headerTitle}>
        <TextV2 variant="bodyStrong" color={C.white} numberOfLines={1}>
          {title}
        </TextV2>
        <TextV2 variant="caption" color={C.tertiary}>
          Modo foco
        </TextV2>
      </View>
      {onMenu ? (
        <RoundButton icon={Ellipsis} label="Opciones" onPress={onMenu} />
      ) : (
        <View style={styles.round} />
      )}
    </GlassSurface>
  );
}

function RoundButton({
  icon: Icon,
  label,
  onPress,
}: {
  icon: typeof ArrowLeft;
  label: string;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.round, { backgroundColor: C.softButton }]}
    >
      <Icon size={20} color={C.white} strokeWidth={2} />
    </PressableScale>
  );
}

// ── "…" menu (SESSION_03 menu) ──────────────────────────────────────────────
export function SessionMenu({
  top,
  doneText,
  onClose,
  onSave,
  onFinish,
  onDiscard,
  soundOn,
  onToggleSound,
  messagesMode,
  onMessagesMode,
}: {
  top: number;
  doneText: string;
  onClose: () => void;
  onSave: () => void;
  onFinish: () => void;
  onDiscard: () => void;
  // Session sound switch (§28.7): rest, exercise and session sounds.
  soundOn: boolean;
  onToggleSound: () => void;
  // "Mensajes durante el entreno" (§28.13), saved on the device.
  messagesMode: SessionMessagesMode;
  onMessagesMode: (mode: SessionMessagesMode) => void;
}) {
  return (
    <>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Cerrar menú"
        onPress={onClose}
        style={styles.menuBackdrop}
      />
      <View style={[styles.menu, { top }]}>
        <MenuItem
          title="Guardar para después"
          subtitle="Retomas donde lo dejaste"
          icon={Bookmark}
          onPress={onSave}
        />
        <MenuItem
          title="Sonido de la sesión"
          subtitle={soundOn ? 'Descanso y ejercicios' : 'Silenciado · la vibración se mantiene'}
          icon={soundOn ? Volume2 : VolumeX}
          onPress={onToggleSound}
        />
        <MenuItem
          title="Finalizar entrenamiento"
          subtitle={`${doneText} · se guarda así`}
          icon={CircleCheck}
          onPress={onFinish}
          divider
        />
        <View style={[styles.menuMessages, styles.menuDivider]} accessibilityRole="radiogroup">
          <TextV2 variant="caption" color={C.meta}>
            Mensajes durante el entreno
          </TextV2>
          {MESSAGE_MODES.map(option => {
            const on = messagesMode === option.value;
            return (
              <PressableScale
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => onMessagesMode(option.value)}
                style={styles.menuRadio}
              >
                <View style={[styles.radio, on && styles.radioOn]}>
                  {on ? <View style={styles.radioDot} /> : null}
                </View>
                <View style={styles.menuTexts}>
                  <TextV2 variant="body" color={C.white} style={styles.medium}>
                    {option.label}
                  </TextV2>
                  {option.hint ? (
                    <TextV2 variant="caption" color={C.meta}>
                      {option.hint}
                    </TextV2>
                  ) : null}
                </View>
              </PressableScale>
            );
          })}
        </View>
        <PressableScale
          accessibilityRole="button"
          onPress={onDiscard}
          style={[styles.menuItem, styles.menuExit]}
        >
          <TextV2 variant="body" color={C.emberText} style={styles.medium}>
            Salir sin guardar
          </TextV2>
          <X size={18} color={C.white} strokeWidth={2} style={styles.dim} />
        </PressableScale>
      </View>
    </>
  );
}

const MESSAGE_MODES: { value: SessionMessagesMode; label: string; hint?: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'esenciales', label: 'Solo esenciales', hint: 'Récords y molestias' },
  { value: 'ninguno', label: 'Ninguno' },
];

function MenuItem({
  title,
  subtitle,
  icon: Icon,
  onPress,
  divider,
}: {
  title: string;
  subtitle: string;
  icon: typeof Bookmark;
  onPress: () => void;
  divider?: boolean;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={[styles.menuItem, divider && styles.menuDivider]}
    >
      <View style={styles.menuTexts}>
        <TextV2 variant="body" color={C.white} style={styles.medium}>
          {title}
        </TextV2>
        <TextV2 variant="caption" color={C.meta}>
          {subtitle}
        </TextV2>
      </View>
      <Icon size={18} color={C.white} strokeWidth={2} />
    </PressableScale>
  );
}

// ── Progress segments ───────────────────────────────────────────────────────
export function Segments({
  progress,
  currentIndex,
}: {
  progress: number[];
  currentIndex: number | null;
}) {
  return (
    <View style={styles.segments}>
      {progress.map((value, index) => {
        const current = index === currentIndex;
        const width = value >= 1 ? 100 : current ? Math.max(value, 0.25) * 100 : 0;
        return (
          <View key={index} style={[styles.segment, { backgroundColor: C.track }]}>
            <View
              style={[
                styles.segmentFill,
                {
                  width: `${width}%`,
                  backgroundColor: value >= 1 ? C.ember : 'rgba(255,255,255,.55)',
                },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

// ── Sesión activa (SESSION_01) ──────────────────────────────────────────────
export function ActiveView({
  topPadding,
  bottomPadding,
  elapsedSec,
  plan,
  progress,
  current,
  setIndex,
  doneCount,
  draft,
  onDraft,
  thumbFor,
  cardImage,
  onPause,
  onLogSet,
  onTechnique,
  onVariant,
  variantTag,
}: {
  topPadding: number;
  bottomPadding: number;
  elapsedSec: number;
  plan: PlannedExercise[];
  progress: number[];
  current: PlannedExercise | null;
  setIndex: number;
  doneCount: number;
  draft: SessionDraft;
  onDraft: (draft: SessionDraft) => void;
  thumbFor: ThumbFor;
  cardImage: ExerciseImage | null;
  onPause: () => void;
  onLogSet: () => void;
  onTechnique?: () => void;
  // Variants (25.6): opens the sheet; the tag of the current exercise.
  onVariant?: () => void;
  variantTag?: string | null;
}) {
  const doneExercises = plan.filter(exercise => progress[exercise.position] >= 1);
  const next = current
    ? plan.filter(exercise => exercise.position > current.position)
    : [];
  const total = plan.length;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={[
        styles.activeContent,
        { paddingTop: topPadding, paddingBottom: bottomPadding },
      ]}
    >
      <View style={styles.clockBlock}>
        <View style={styles.clockRow}>
          <Pulse />
          <TextV2 variant="displayM" color={C.white} style={styles.clock}>
            {formatClock(elapsedSec)}
          </TextV2>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Pausar sesión"
            onPress={onPause}
            style={[styles.round, { backgroundColor: C.softButton }]}
          >
            <Pause size={18} color={C.white} strokeWidth={2} />
          </PressableScale>
        </View>
        <TextV2 variant="label" color={C.meta} style={styles.regular}>
          {doneLabel(doneCount, total)}
        </TextV2>
      </View>

      <Segments progress={progress} currentIndex={current?.position ?? null} />

      {doneExercises.length > 0 ? (
        <View style={styles.doneList}>
          {doneExercises.map(exercise => (
            <View key={exercise.position} style={styles.doneRow}>
              <CheckDot />
              <TextV2
                variant="meta"
                color={C.tertiary}
                numberOfLines={1}
                style={styles.flex}
              >
                {exercise.name}
              </TextV2>
              <TextV2 variant="caption" color={C.tertiary}>
                {planScheme(exercise)}
              </TextV2>
            </View>
          ))}
        </View>
      ) : null}

      {current ? (
        <CurrentCard
          exercise={current}
          setIndex={setIndex}
          total={total}
          draft={draft}
          onDraft={onDraft}
          image={cardImage}
          onLogSet={onLogSet}
          onTechnique={onTechnique}
          onVariant={onVariant}
          variantTag={variantTag}
        />
      ) : (
        <View style={styles.allDone}>
          <View style={styles.allDoneCheck}>
            <Check size={30} color={C.white} strokeWidth={2.4} />
          </View>
          <TextV2 variant="section" color={C.white} align="center">
            {`${NUMBER_WORDS[total] ?? total} de ${
              NUMBER_WORDS[total]?.toLowerCase() ?? total
            }. Cierra la sesión.`}
          </TextV2>
        </View>
      )}

      {next.length > 0 ? (
        <View>
          <TextV2 variant="eyebrow" color={C.tertiary} style={styles.afterTitle}>
            Después
          </TextV2>
          {next.map(exercise => (
            <View key={exercise.position} style={styles.nextRow}>
              <ExercisePicture image={thumbFor(exercise)} style={styles.nextThumb} />
              <View style={styles.nextTexts}>
                <TextV2
                  variant="body"
                  color={C.body}
                  numberOfLines={1}
                  style={styles.medium}
                >
                  {exercise.name}
                </TextV2>
                <TextV2 variant="caption" color={C.tertiary}>
                  {`${planScheme(exercise)} · ${exercise.restSec} s`}
                </TextV2>
              </View>
              <TextV2 variant="caption" color={C.tertiary}>
                {exercise.position + 1}
              </TextV2>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

// Ember dot breathing next to the clock (stops in pause).
function Pulse() {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.35, duration: 900, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[styles.pulse, { opacity }]} />;
}

function CheckDot({ size = 20 }: { size?: number }) {
  return (
    <View
      style={[
        styles.checkDot,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Check size={size * 0.6} color={C.white} strokeWidth={2.6} />
    </View>
  );
}

// Current exercise: photo header, then the set being logged (reps and kg
// editable) and the 64 pt check that records it.
function CurrentCard({
  exercise,
  setIndex,
  total,
  draft,
  onDraft,
  image,
  onLogSet,
  onTechnique,
  onVariant,
  variantTag,
}: {
  exercise: PlannedExercise;
  setIndex: number;
  total: number;
  draft: SessionDraft;
  onDraft: (draft: SessionDraft) => void;
  image: ExerciseImage | null;
  onLogSet: () => void;
  onTechnique?: () => void;
  onVariant?: () => void;
  variantTag?: string | null;
}) {
  // Seconds and metres are the planned amount (not typed); reps and "máx"
  // are typed.
  const fixedAmount = exercise.unit === 'sec' || exercise.unit === 'm';

  return (
    <View style={styles.card}>
      <View style={styles.cardPhoto}>
        {image ? <ExercisePicture image={image} style={styles.fill} /> : null}
        <LinearGradient
          colors={['rgba(20,19,18,.35)', 'rgba(20,19,18,0)', 'rgba(31,29,27,.92)', C.card]}
          locations={[0, 0.35, 0.92, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.cardTop}>
          <View style={styles.nowPill}>
            <View style={styles.nowDot} />
            <TextV2 variant="caption" color={C.white} style={styles.nowText}>
              {`AHORA · ${exercise.position + 1} DE ${total}`}
            </TextV2>
          </View>
          <View style={styles.cardActions}>
            {onVariant ? (
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel="Cambiar por una variante"
                onPress={onVariant}
                style={styles.techButton}
              >
                <Repeat2 size={14} color={C.white} strokeWidth={2} />
                <TextV2 variant="captionStrong" color={C.white}>
                  Variante
                </TextV2>
              </PressableScale>
            ) : null}
            {onTechnique ? (
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel="Ver técnica"
                onPress={onTechnique}
                style={styles.techButton}
              >
                <CirclePlay size={14} color={C.white} strokeWidth={2} />
                <TextV2 variant="captionStrong" color={C.white}>
                  Técnica
                </TextV2>
              </PressableScale>
            ) : null}
          </View>
        </View>
        <View style={styles.cardTitle}>
          {variantTag ? (
            <View style={styles.variantTag}>
              <TextV2 variant="captionStrong" color={C.emberText} style={styles.variantTagText}>
                {variantTag}
              </TextV2>
            </View>
          ) : null}
          <TextV2 variant="title22" color={C.white} style={styles.cardName}>
            {exercise.name}
          </TextV2>
          <TextV2 variant="meta" color={C.meta}>
            {`Serie ${setIndex + 1} de ${exercise.sets} · ${planScheme(exercise)}`}
          </TextV2>
        </View>
      </View>
      <PlanTarget exercise={exercise} />
      <View style={styles.cardBottom}>
        <View style={styles.metrics}>
          {fixedAmount ? (
            <Metric
              value={planAmount(exercise) ?? '—'}
              label={exercise.unit === 'm' ? 'distancia' : 'tiempo'}
            />
          ) : (
            <EditableMetric
              value={draft.reps}
              label={exercise.unit === 'max' ? 'reps · máx' : 'reps'}
              accessibilityLabel="Repeticiones de la serie"
              keyboardType="number-pad"
              onChange={reps => onDraft({ ...draft, reps })}
            />
          )}
          {isNoLoadBlock(exercise) ? null : (
            <>
              <View style={styles.metricDivider} />
              <EditableMetric
                value={draft.weightKg}
                label={variantTag ? 'kg · ajusta el peso' : 'kg'}
                accessibilityLabel="Peso de la serie en kilos"
                keyboardType="decimal-pad"
                onChange={weightKg => onDraft({ ...draft, weightKg })}
              />
            </>
          )}
          <View style={styles.metricDivider} />
          <Metric
            value={`${exercise.restSec} s`}
            label="descanso"
            labelColor={C.recoveryText}
            dot={C.recovery}
          />
        </View>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Registrar serie ${setIndex + 1} de ${exercise.sets}`}
          onPress={onLogSet}
          style={styles.checkButton}
        >
          <Check size={26} color={C.white} strokeWidth={2.2} style={styles.checkIcon} />
        </PressableScale>
      </View>
    </View>
  );
}

// A session of the training plan (31.7): the recommended weight in big
// figures, the reps and RIR of the target and "Última vez". While calibrating
// there is no weight: it asks to pick one with 2 reps in reserve.
function PlanTarget({ exercise }: { exercise: PlannedExercise }) {
  const { t } = useTrainingPlanText();
  const plan = activePlan(exercise);
  if (!plan) {
    return null;
  }
  const big = plan.calibrate
    ? t('runner.calibrate')
    : plan.recommendedKg === null
      ? t('runner.bodyweight')
      : `${kgValue(plan.recommendedKg)} kg`;
  const reps = repsRange({ repMin: plan.repMin, repMax: plan.repMax });
  const target = reps
    ? plan.rir !== null
      ? t('runner.target', { reps, rir: plan.rir })
      : t('runner.targetNoRir', { reps })
    : null;
  return (
    <View style={styles.planBlock}>
      <View style={styles.planLeft}>
        <TextV2 variant="eyebrow" color={C.emberText}>
          {t('runner.recommended').toUpperCase()}
        </TextV2>
        <TextV2 variant="title28" color={C.white} style={styles.planBig}>
          {big}
        </TextV2>
        {plan.calibrate ? (
          <TextV2 variant="caption" color={C.meta}>
            {t('runner.calibrateHint')}
          </TextV2>
        ) : null}
      </View>
      <View style={styles.planRight}>
        {target ? (
          <TextV2 variant="bodyStrong" color={C.body} align="right">
            {target}
          </TextV2>
        ) : null}
        <TextV2 variant="caption" color={C.meta} align="right">
          {lastTimeLine({ lastTime: plan.lastTime }, t)}
        </TextV2>
      </View>
    </View>
  );
}

function Metric({
  value,
  label,
  labelColor = C.tertiary,
  dot,
}: {
  value: string;
  label: string;
  labelColor?: string;
  dot?: string;
}) {
  return (
    <View style={styles.metric}>
      <TextV2 variant="title28" color={C.white} style={styles.metricValue}>
        {value}
      </TextV2>
      <View style={styles.metricLabel}>
        {dot ? <View style={[styles.restDot, { backgroundColor: dot }]} /> : null}
        <TextV2 variant="caption" color={labelColor}>
          {label}
        </TextV2>
      </View>
    </View>
  );
}

function EditableMetric({
  value,
  label,
  accessibilityLabel,
  keyboardType,
  onChange,
}: {
  value: number | null;
  label: string;
  accessibilityLabel: string;
  keyboardType: 'number-pad' | 'decimal-pad';
  onChange: (value: number | null) => void;
}) {
  return (
    <View style={styles.metric}>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        value={value === null ? '' : String(value).replace('.', ',')}
        onChangeText={text => onChange(parseNumberInput(text))}
        placeholder="—"
        placeholderTextColor={C.tertiary}
        keyboardType={keyboardType}
        selectTextOnFocus
        maxLength={5}
        style={styles.input}
      />
      <View style={[styles.inputLine]} />
      <TextV2 variant="caption" color={C.tertiary}>
        {label}
      </TextV2>
    </View>
  );
}

// ── Sesión en pausa (SESSION_02) ────────────────────────────────────────────
export function PausedView({
  topPadding,
  bottomInset,
  elapsedSec,
  pausedForSec,
  progress,
  current,
  total,
  doneCount,
  weightKg,
  thumbFor,
  onResume,
}: {
  topPadding: number;
  bottomInset: number;
  elapsedSec: number;
  pausedForSec: number;
  progress: number[];
  current: PlannedExercise | null;
  total: number;
  doneCount: number;
  weightKg: number | null;
  thumbFor: ThumbFor;
  onResume: () => void;
}) {
  return (
    <View
      style={[
        styles.layer,
        { paddingTop: topPadding, paddingBottom: bottomInset },
      ]}
    >
      <View style={styles.pausedBody}>
        <View style={styles.pausedHead}>
          <View style={styles.eyebrowRow}>
            <View style={styles.ringDot} />
            <TextV2 variant="eyebrow" color={C.secondary}>
              Sesión en pausa
            </TextV2>
          </View>
          <TextV2 variant="displayM" color={C.white} style={[styles.clock, styles.half]}>
            {formatClock(elapsedSec)}
          </TextV2>
          <TextV2 variant="body" color={C.meta}>
            En pausa desde hace{' '}
            <TextV2 variant="bodyStrong" color={C.white}>
              {formatClock(pausedForSec)}
            </TextV2>
          </TextV2>
        </View>
        <View style={styles.pausedProgress}>
          <Segments progress={progress} currentIndex={current?.position ?? null} />
          <TextV2 variant="meta" color={C.tertiary}>
            {doneLabel(doneCount, total)}
          </TextV2>
        </View>
        {current ? (
          <View style={styles.compact}>
            <ExercisePicture image={thumbFor(current)} style={styles.compactThumb} />
            <View style={styles.flexGap}>
              <TextV2 variant="eyebrow" color={C.tertiary}>
                {`Ahora · ${current.position + 1} de ${total}`}
              </TextV2>
              <TextV2 variant="cta" color={C.white} style={styles.compactName}>
                {current.name}
              </TextV2>
              <TextV2 variant="meta" color={C.meta}>
                {exerciseMeta(current, weightKg)}
              </TextV2>
            </View>
          </View>
        ) : null}
        <TextV2 variant="meta" color={C.tertiary}>
          Tu sesión está a salvo. Guardar, finalizar o salir está en ···
        </TextV2>
      </View>
      <Button
        label="Continuar entrenamiento"
        variant="onScene"
        size="lg"
        fullWidth
        icon={Play}
        iconPosition="start"
        onPress={onResume}
      />
    </View>
  );
}

// ── Descanso (SESSION_03 / 04) y Fin del descanso (SESSION_05) ──────────────
const RING = 236;
const RADIUS = 110;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const AnimatedCircle = Reanimated.createAnimatedComponent(Circle);

// The rest glow, one static layer per colour: Reanimated cannot animate an
// SVG <Stop>, so the layers cross-fade by opacity (as in the prototype).
function RestGlow({ id, color }: { id: string; color: string }) {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id={id} cx="50%" cy="36%" rx="60%" ry="34%">
          <Stop offset="0" stopColor={color} stopOpacity={0.16} />
          <Stop offset="0.7" stopColor={C.plate} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

export function RestView({
  topPadding,
  bottomInset,
  kind,
  remainingMs,
  totalSec,
  phase,
  progress,
  doneText,
  doneLine,
  next,
  nextSetIndex,
  nextWeightKg,
  thumbFor,
  message,
  onAdd,
  onSkip,
}: {
  topPadding: number;
  bottomInset: number;
  kind: RestKind;
  remainingMs: number;
  totalSec: number;
  phase: RestPhase;
  progress: number[];
  doneText: string;
  doneLine: string;
  next: PlannedExercise | null;
  nextSetIndex: number;
  nextWeightKg: number | null;
  thumbFor: ThumbFor;
  // ELLIE's message (§28.13): takes the place of the next-exercise card while
  // it is open; never over the countdown.
  message?: React.ReactNode;
  onAdd: () => void;
  onSkip: () => void;
}) {
  const { type } = useThemeV2();
  const reduceMotion = useReducedMotion();
  const go = phase === 'go';
  const seconds = Math.ceil(Math.max(0, remainingMs) / 1000);
  // Prototype colours: Recovery blue while counting, red (aviso) from 10 s,
  // Ember for "¡Vamos!", which covers the whole screen.
  const warning = !go && seconds <= 10;
  const fraction = go ? 1 : Math.min(1, remainingMs / (totalSec * 1000));
  const warningProgress = useSharedValue(warning ? 1 : 0);
  const pulse = useSharedValue(1);
  const [showGo, setShowGo] = useState(true);

  useEffect(() => {
    warningProgress.value = reduceMotion
      ? Number(warning)
      : withTiming(Number(warning), { duration: 300, easing: Easing.out(Easing.cubic) });
  }, [reduceMotion, warning, warningProgress]);

  useEffect(() => {
    pulse.value = 1;
    if (!reduceMotion && !go && seconds > 0 && seconds <= 5) {
      // Prototype: 320 ms, peak at 40 %.
      pulse.value = withSequence(
        withTiming(1.06, { duration: 128, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 192, easing: Easing.out(Easing.cubic) }),
      );
    }
  }, [go, pulse, reduceMotion, seconds]);

  useEffect(() => {
    if (!go) {
      setShowGo(true);
      return;
    }
    const timeout = setTimeout(() => setShowGo(false), 600);
    return () => clearTimeout(timeout);
  }, [go]);

  const ringColor = useAnimatedProps(() => ({
    stroke: interpolateColor(warningProgress.value, [0, 1], [C.recovery, REST_WARNING_COLOR]),
  }));
  const countingGlow = useAnimatedStyle(() => ({ opacity: 1 - warningProgress.value }));
  const warningGlow = useAnimatedStyle(() => ({ opacity: warningProgress.value }));
  const countdownColor = useAnimatedStyle(() => ({
    color: interpolateColor(warningProgress.value, [0, 1], [C.white, REST_WARNING_COLOR]),
  }));
  const labelColor = useAnimatedStyle(() => ({
    color: interpolateColor(warningProgress.value, [0, 1], [C.meta, REST_WARNING_COLOR]),
  }));
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  // The runner keeps its existing turn window; the visual handoff is shorter.
  if (go && !showGo) {
    return null;
  }

  return (
    <View
      style={[
        styles.layer,
        { paddingTop: topPadding, paddingBottom: bottomInset },
      ]}
    >
      {go ? (
        <RestGlow id="restGlowGo" color={C.ember} />
      ) : (
        <>
          <Reanimated.View style={[StyleSheet.absoluteFill, countingGlow]} pointerEvents="none">
            <RestGlow id="restGlowCounting" color={C.recovery} />
          </Reanimated.View>
          <Reanimated.View style={[StyleSheet.absoluteFill, warningGlow]} pointerEvents="none">
            <RestGlow id="restGlowWarning" color={REST_WARNING_COLOR} />
          </Reanimated.View>
        </>
      )}
      <View style={styles.restTop}>
        {/* Resting: only what is done is marked. */}
        <Segments progress={progress} currentIndex={null} />
        <TextV2 variant="caption" color={C.tertiary}>
          {doneText}
        </TextV2>
      </View>

      <View style={styles.ring}>
        <Svg width={RING} height={RING} style={StyleSheet.absoluteFill}>
          <Circle
            cx={RING / 2}
            cy={RING / 2}
            r={RADIUS}
            stroke="rgba(255,255,255,.08)"
            strokeWidth={6}
            fill="none"
          />
          {go ? (
            <Circle
              cx={RING / 2}
              cy={RING / 2}
              r={RADIUS}
              stroke={C.ember}
              strokeWidth={6}
              fill="none"
            />
          ) : (
            <AnimatedCircle
              cx={RING / 2}
              cy={RING / 2}
              r={RADIUS}
              animatedProps={ringColor}
              strokeWidth={6}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${CIRCUMFERENCE * fraction} ${CIRCUMFERENCE}`}
              transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
            />
          )}
        </Svg>
        <View style={styles.ringCenter}>
          {go ? (
            <>
              <View style={styles.goPlay}>
                <Play size={20} color={C.white} strokeWidth={2} />
              </View>
              <TextV2 variant="title28" color={C.white} style={styles.goTitle}>
                ¡Vamos!
              </TextV2>
              <TextV2 variant="meta" color={C.meta} align="center" style={styles.goLine}>
                {next
                  ? kind === 'set'
                    ? `Serie ${nextSetIndex + 1} de ${next.sets}`
                    : next.name
                  : 'Cierra la sesión'}
              </TextV2>
            </>
          ) : (
            <>
              <Reanimated.View style={pulseStyle}>
                <Reanimated.Text style={[type.displayS, styles.countdown, countdownColor]}>
                  {formatCountdown(remainingMs)}
                </Reanimated.Text>
              </Reanimated.View>
              <Reanimated.Text style={[type.meta, labelColor]}>
                {warning ? 'Prepárate' : 'descanso restante'}
              </Reanimated.Text>
            </>
          )}
        </View>
      </View>

      {go ? null : (
        <>
          <View style={styles.restActions}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Sumar 30 segundos"
              onPress={onAdd}
              style={[styles.addRest, { backgroundColor: C.softButton }]}
            >
              <TextV2 variant="bodyStrong" color={C.white}>
                +30 s
              </TextV2>
            </PressableScale>
            <PressableScale
              accessibilityRole="button"
              onPress={onSkip}
              style={styles.skipRest}
            >
              <TextV2 variant="bodyStrong" color="#121212">
                Saltar descanso
              </TextV2>
            </PressableScale>
          </View>
          <View style={styles.flex} />
          {message ? (
            message
          ) : (
          <View style={styles.restCard}>
            <View style={styles.doneRow}>
              <CheckDot />
              <TextV2 variant="meta" color={C.tertiary} numberOfLines={1} style={styles.flex}>
                {doneLine}
              </TextV2>
            </View>
            {next ? (
              <>
                <View style={styles.restDivider} />
                <View style={styles.restNext}>
                  <ExercisePicture image={thumbFor(next)} style={styles.restThumb} />
                  <View style={styles.flexGap}>
                    <TextV2 variant="eyebrow" color={C.tertiary}>
                      {kind === 'set' ? 'Siguiente serie' : 'Siguiente ejercicio'}
                    </TextV2>
                    <TextV2 variant="cta" color={C.white} style={styles.compactName}>
                      {kind === 'set'
                        ? `Serie ${nextSetIndex + 1} de ${next.sets}`
                        : next.name}
                    </TextV2>
                    <TextV2 variant="meta" color={C.meta}>
                      {kind === 'set'
                        ? [
                            next.name,
                            planAmount(next),
                            formatKg(nextWeightKg),
                          ]
                            .filter(Boolean)
                            .join(' · ')
                        : exerciseMeta(next, nextWeightKg)}
                    </TextV2>
                  </View>
                </View>
              </>
            ) : null}
          </View>
          )}
        </>
      )}
    </View>
  );
}

// ── Error al guardar (STATE_09) ─────────────────────────────────────────────
export function SaveErrorView({
  topInset,
  bottomInset,
  durationSec,
  exercises,
  kcal,
  retrying,
  debugMessage,
  onRetry,
  onContinue,
}: {
  topInset: number;
  bottomInset: number;
  durationSec: number;
  exercises: number;
  kcal: number;
  retrying: boolean;
  // __DEV__ only: technical cause of the failure.
  debugMessage?: string | null;
  onRetry: () => void;
  onContinue: () => void;
}) {
  return (
    <View
      style={[
        styles.errorLayer,
        { paddingTop: topInset, paddingBottom: bottomInset },
      ]}
    >
      <View style={styles.errorBody}>
        <View style={styles.errorIcon}>
          <RefreshCw size={30} color={C.white} strokeWidth={2} />
        </View>
        <View style={styles.errorTexts}>
          <TextV2 variant="title24" color={C.white} align="center" style={styles.errorTitle}>
            {'No pudimos\nguardar el entreno'}
          </TextV2>
          <TextV2 variant="body" color="#BDBAB4" align="center" style={styles.errorText}>
            Está a salvo en este teléfono. Se sincroniza solo cuando vuelva la
            conexión.
          </TextV2>
        </View>
        {__DEV__ && debugMessage ? (
          <TextV2 variant="caption" color={C.tertiary} align="center" style={styles.errorText}>
            {debugMessage}
          </TextV2>
        ) : null}
        <View style={styles.errorTrio}>
          <TrioItem value={formatDuration(durationSec)} label="Duración" />
          <View style={styles.trioDivider} />
          <TrioItem value={String(exercises)} label="Ejercicios" />
          <View style={styles.trioDivider} />
          <TrioItem value={String(kcal)} label="kcal" />
        </View>
      </View>
      <View style={styles.errorActions}>
        <PressableScale
          accessibilityRole="button"
          accessibilityState={{ busy: retrying }}
          disabled={retrying}
          onPress={onRetry}
          style={styles.retry}
        >
          <TextV2 variant="cta" color="#121212">
            {retrying ? 'Reintentando…' : 'Reintentar ahora'}
          </TextV2>
        </PressableScale>
        <PressableScale
          accessibilityRole="button"
          onPress={onContinue}
          style={styles.continueOffline}
        >
          <TextV2 variant="bodyStrong" color={C.white}>
            Continuar sin sincronizar
          </TextV2>
        </PressableScale>
      </View>
    </View>
  );
}

function TrioItem({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.trioItem}>
      <TextV2 variant="section" color={C.white}>
        {value}
      </TextV2>
      <TextV2 variant="meta" color={C.meta}>
        {label}
      </TextV2>
    </View>
  );
}

// Footer of the session once every exercise is done.
export function FinishFooter({
  bottomInset,
  busy,
  onFinish,
}: {
  bottomInset: number;
  busy: boolean;
  onFinish: () => void;
}) {
  // Fabric: a padded LinearGradient used as a container shifts its children;
  // the gradient is only an absolute background.
  return (
    <View style={[styles.finishFooter, { paddingBottom: bottomInset }]}>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(20,19,18,0)', 'rgba(20,19,18,.92)', C.plate]}
        locations={[0, 0.3, 1]}
        style={styles.gradientFill}
      />
      <Button
        label="Finalizar entreno"
        variant="onScene"
        size="lg"
        fullWidth
        loading={busy}
        loadingLabel="Guardando"
        onPress={onFinish}
      />
    </View>
  );
}

export const SESSION_COLORS = C;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexGap: { flex: 1, gap: 3, minWidth: 0 },
  fill: { width: '100%', height: '100%' },
  medium: { fontWeight: '500' },
  regular: { fontWeight: '400' },
  dim: { opacity: 0.7 },
  half: { opacity: 0.5 },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
    paddingHorizontal: 14,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 8,
    backgroundColor: 'rgba(0,0,0,.4)',
  },
  menu: {
    position: 'absolute',
    right: 14,
    zIndex: 9,
    width: 256,
    borderRadius: 20,
    backgroundColor: 'rgba(44,42,39,.97)',
    boxShadow: '0 0 0 .5px rgba(255,255,255,.1), 0 20px 50px rgba(0,0,0,.5)',
    overflow: 'hidden',
  },
  menuItem: {
    minHeight: 56,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,.1)',
  },
  menuExit: {
    minHeight: 52,
    borderTopWidth: 6,
    borderTopColor: 'rgba(0,0,0,.22)',
  },
  menuTexts: { gap: 1 },
  menuMessages: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 6, gap: 2 },
  menuRadio: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: C.ember },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.ember },
  segments: { flexDirection: 'row', gap: 4 },
  segment: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  segmentFill: { height: '100%', borderRadius: 2 },
  activeContent: { paddingHorizontal: 20, gap: 18 },
  clockBlock: { alignItems: 'center', gap: 6, paddingTop: 6 },
  clockRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  clock: { fontWeight: '500' },
  pulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.ember },
  doneList: { gap: 2 },
  doneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 5,
    paddingHorizontal: 2,
  },
  checkDot: {
    backgroundColor: C.ember,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: C.card,
    boxShadow: '0 0 0 .5px rgba(255,255,255,.06), 0 24px 48px rgba(0,0,0,.4)',
  },
  cardPhoto: { height: 220, backgroundColor: '#2A2724' },
  cardTop: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nowPill: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    backgroundColor: 'rgba(20,19,18,.55)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nowDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.ember },
  nowText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.66 },
  techButton: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,.14)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardActions: { flexDirection: 'row', gap: 8 },
  variantTag: {
    alignSelf: 'flex-start',
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 11,
    backgroundColor: 'rgba(255,91,31,.2)',
    justifyContent: 'center',
    marginBottom: 4,
  },
  variantTagText: { fontSize: 11, letterSpacing: 0.66 },
  cardTitle: { position: 'absolute', left: 18, right: 18, bottom: 10, gap: 3 },
  cardName: { lineHeight: 26 },
  planBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 12,
    paddingHorizontal: 18,
  },
  planLeft: { flex: 1, gap: 2 },
  planBig: { fontWeight: '700', letterSpacing: -0.6 },
  planRight: { flexShrink: 1, maxWidth: '50%', gap: 4, alignItems: 'flex-end' },
  cardBottom: {
    paddingTop: 14,
    paddingHorizontal: 18,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  metrics: { flex: 1, flexDirection: 'row', gap: 16 },
  metric: { gap: 2 },
  metricValue: { fontWeight: '600', letterSpacing: -0.56 },
  metricLabel: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metricDivider: { width: 1, backgroundColor: 'rgba(255,255,255,.1)' },
  restDot: { width: 6, height: 6, borderRadius: 3 },
  input: {
    minWidth: 44,
    padding: 0,
    color: C.white,
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: -0.56,
    fontVariant: ['tabular-nums'],
  },
  inputLine: { height: 1, backgroundColor: 'rgba(255,255,255,.18)', marginTop: 1 },
  checkButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'inset 0 0 0 2px rgba(255,91,31,.7)',
  },
  checkIcon: { opacity: 0.85 },
  allDone: { paddingTop: 26, paddingBottom: 8, alignItems: 'center', gap: 12 },
  allDoneCheck: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.ember,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 0 10px rgba(255,91,31,.14)',
  },
  afterTitle: { paddingTop: 4, paddingBottom: 8 },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: C.hairline,
  },
  nextThumb: { width: 44, height: 44, borderRadius: 12, opacity: 0.75 },
  nextTexts: { flex: 1, gap: 1, minWidth: 0 },
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 4,
    backgroundColor: C.plate,
    paddingHorizontal: 20,
  },
  pausedBody: { flex: 1, gap: 30 },
  pausedHead: { gap: 12 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ringDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: C.secondary,
  },
  pausedProgress: { gap: 10 },
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: 24,
    backgroundColor: C.card,
    boxShadow: '0 0 0 .5px rgba(255,255,255,.06)',
  },
  compactThumb: { width: 72, height: 72, borderRadius: 16 },
  compactName: { lineHeight: 21 },
  restTop: { gap: 8 },
  ring: { alignSelf: 'center', width: RING, height: RING, marginTop: 26 },
  ringCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  countdown: { fontSize: 64, lineHeight: 66, fontWeight: '500', letterSpacing: -2.9 },
  goPlay: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.ember,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goTitle: { fontWeight: '600' },
  goLine: { maxWidth: 180 },
  restActions: { flexDirection: 'row', gap: 10, marginTop: 26 },
  addRest: {
    width: 104,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipRest: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restCard: {
    borderRadius: 24,
    backgroundColor: C.card,
    boxShadow: '0 0 0 .5px rgba(255,255,255,.06)',
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  restDivider: { height: 1, backgroundColor: C.hairline },
  restNext: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  restThumb: { width: 56, height: 56, borderRadius: 14 },
  errorLayer: {
    flex: 1,
    backgroundColor: C.plate,
    paddingHorizontal: 24,
  },
  errorBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22 },
  errorIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `inset 0 0 0 2px ${C.emberText}`,
  },
  errorTexts: { gap: 8, alignItems: 'center' },
  errorTitle: { maxWidth: 250 },
  errorText: { maxWidth: 300, lineHeight: 22 },
  errorTrio: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 300,
    marginTop: 10,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,.1)',
    gap: 16,
  },
  trioItem: { flex: 1, gap: 2, alignItems: 'center' },
  trioDivider: { width: 1, backgroundColor: 'rgba(255,255,255,.1)' },
  errorActions: { gap: 8 },
  retry: {
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F2F0EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueOffline: {
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  finishFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 14,
    paddingHorizontal: 20,
  },
});
