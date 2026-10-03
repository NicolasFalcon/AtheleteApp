import { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type ImageSourcePropType,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import {
  ArrowLeft,
  Bookmark,
  Check,
  CircleCheck,
  Ellipsis,
  Pause,
  Play,
  RefreshCw,
  Rotate3d,
  X,
} from 'lucide-react-native';
import {
  Button,
  GlassSurface,
  PressableScale,
  TextV2,
} from '@app/components/v2';
import {
  formatClock,
  formatCountdown,
  formatDuration,
  formatKg,
  parseNumberInput,
  planScheme,
  type PlannedExercise,
  type RestKind,
  type RestPhase,
} from '@app/features/session/sessionModel';
import type { SessionDraft } from '@app/features/session/useSessionRunner';

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

export type ThumbFor = (exercise: PlannedExercise) => ImageSourcePropType;

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
}: {
  top: number;
  doneText: string;
  onClose: () => void;
  onSave: () => void;
  onFinish: () => void;
  onDiscard: () => void;
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
          title="Finalizar entrenamiento"
          subtitle={`${doneText} · se guarda así`}
          icon={CircleCheck}
          onPress={onFinish}
          divider
        />
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
  cardImage: ImageSourcePropType | null;
  onPause: () => void;
  onLogSet: () => void;
  onTechnique?: () => void;
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
              <Image
                source={thumbFor(exercise)}
                resizeMode="cover"
                style={styles.nextThumb}
              />
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
}: {
  exercise: PlannedExercise;
  setIndex: number;
  total: number;
  draft: SessionDraft;
  onDraft: (draft: SessionDraft) => void;
  image: ImageSourcePropType | null;
  onLogSet: () => void;
  onTechnique?: () => void;
}) {
  const timed = Boolean(exercise.durationSec);

  return (
    <View style={styles.card}>
      <View style={styles.cardPhoto}>
        {image ? (
          <Image source={image} resizeMode="cover" style={styles.fill} />
        ) : null}
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
          {onTechnique ? (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Ver técnica"
              onPress={onTechnique}
              style={styles.techButton}
            >
              <Rotate3d size={14} color={C.white} strokeWidth={2} />
              <TextV2 variant="captionStrong" color={C.white}>
                Técnica
              </TextV2>
            </PressableScale>
          ) : null}
        </View>
        <View style={styles.cardTitle}>
          <TextV2 variant="title22" color={C.white} style={styles.cardName}>
            {exercise.name}
          </TextV2>
          <TextV2 variant="meta" color={C.meta}>
            {`Serie ${setIndex + 1} de ${exercise.sets} · ${planScheme(exercise)}`}
          </TextV2>
        </View>
      </View>
      <View style={styles.cardBottom}>
        <View style={styles.metrics}>
          {timed ? (
            <Metric value={`${exercise.durationSec} s`} label="tiempo" />
          ) : (
            <EditableMetric
              value={draft.reps}
              label="reps"
              accessibilityLabel="Repeticiones de la serie"
              keyboardType="number-pad"
              onChange={reps => onDraft({ ...draft, reps })}
            />
          )}
          <View style={styles.metricDivider} />
          <EditableMetric
            value={draft.weightKg}
            label="kg"
            accessibilityLabel="Peso de la serie en kilos"
            keyboardType="decimal-pad"
            onChange={weightKg => onDraft({ ...draft, weightKg })}
          />
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
            <Image source={thumbFor(current)} resizeMode="cover" style={styles.compactThumb} />
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
  onAdd: () => void;
  onSkip: () => void;
}) {
  const go = phase === 'go';
  const warm = phase !== 'counting';
  const fraction = go ? 1 : Math.min(1, remainingMs / (totalSec * 1000));
  const ringColor = warm ? C.ember : C.recovery;
  const glow = warm ? 'rgba(255,91,31,.16)' : 'rgba(110,143,179,.09)';

  return (
    <View
      style={[
        styles.layer,
        { paddingTop: topPadding, paddingBottom: bottomInset },
        go && styles.goLayer,
      ]}
    >
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id="restGlow" cx="50%" cy="36%" rx="60%" ry="34%">
            <Stop offset="0" stopColor={glow} stopOpacity={1} />
            <Stop offset="0.7" stopColor={C.plate} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#restGlow)" />
      </Svg>
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
          <Circle
            cx={RING / 2}
            cy={RING / 2}
            r={RADIUS}
            stroke={ringColor}
            strokeWidth={6}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${CIRCUMFERENCE * fraction} ${CIRCUMFERENCE}`}
            transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
          />
        </Svg>
        <View style={styles.ringCenter}>
          {go ? (
            <>
              <View style={styles.goPlay}>
                <Play size={20} color={C.white} strokeWidth={2} />
              </View>
              <TextV2 variant="title28" color={C.white} style={styles.goTitle}>
                Tu turno
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
              <TextV2
                variant="displayS"
                color={warm ? C.emberText : C.white}
                style={styles.countdown}
              >
                {formatCountdown(remainingMs)}
              </TextV2>
              <TextV2 variant="meta" color={C.meta}>
                descanso restante
              </TextV2>
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
                  <Image source={thumbFor(next)} resizeMode="cover" style={styles.restThumb} />
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
                            next.durationSec
                              ? `${next.durationSec} s`
                              : next.reps
                              ? `${next.reps} reps`
                              : null,
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
        </>
      )}
      {go ? (
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(20,19,18,0)', C.plate]}
          style={styles.goFade}
        />
      ) : null}
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
  onRetry,
  onContinue,
}: {
  topInset: number;
  bottomInset: number;
  durationSec: number;
  exercises: number;
  kcal: number;
  retrying: boolean;
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
  cardTitle: { position: 'absolute', left: 18, right: 18, bottom: 10, gap: 3 },
  cardName: { lineHeight: 26 },
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
  goLayer: { bottom: '36%' },
  goFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 80 },
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
