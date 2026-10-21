import { GuideAnchor } from '@app/features/guides/GuideAnchor';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Defs, Line, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';
import {
  ArrowRight,
  Calendar,
  Check,
  ChevronRight,
  Dumbbell,
  GripVertical,
  Lock,
  Minus,
  Moon,
  Play,
  Plus,
  X,
} from 'lucide-react-native';
import {
  AppImage,
  LivingHalo,
  PressableScale,
  TextV2,
  useThemeV2,
  type AppImageSource,
} from '@app/components/v2';
import { workoutTypeLabel } from '@app/features/home/v2/homeLabels';
import {
  DAY_LETTERS,
  dayLabel,
  dayMinutes,
  dayNumber,
  isWorkDay,
  pillDot,
  weekdayIndex,
  type WeekDay,
  type WeekRoutine,
} from '@app/features/week/weekModel';
import { DEFAULT_WORKOUT_THUMBNAIL, resolveWorkoutThumbnailSource } from '@app/lib/workoutThumbnails';

// Tu semana (handoff v2.15 §25.1, WEEK_01–05).

// Dark headers (photo and rest) are dark in both themes.
const DARK = {
  rest: '#0D1015',
  white: '#FFFFFF',
  eyebrow: '#A8A6A1',
  meta: '#D8D6D1',
  restEyebrow: '#9DB5CF',
  restMeta: '#C9D3DE',
  missed: '#FF8A5C',
};

export function routineImage(routine: WeekRoutine | null): AppImageSource {
  if (!routine) {
    return DEFAULT_WORKOUT_THUMBNAIL;
  }
  const local = resolveWorkoutThumbnailSource({
    type: routine.type,
    targetMuscles: [],
    title: routine.title,
  });
  return routine.thumbKey ? { mediaKey: routine.thumbKey, fallback: local } : local;
}

export function routineTypeText(routine: WeekRoutine): string {
  return workoutTypeLabel({ routineCategory: routine.routineCategory, type: routine.type });
}

// ── Pills ───────────────────────────────────────────────────────────────────
export function DayPill({
  day,
  today,
  selected,
  moveFrom,
  moveTarget,
  height = 74,
  radius = 18,
  dotSize = 6,
  onPress,
}: {
  day: WeekDay;
  today: boolean;
  selected: boolean;
  moveFrom?: boolean;
  moveTarget?: boolean;
  height?: number;
  radius?: number;
  dotSize?: number;
  onPress?: () => void;
}) {
  const { colors } = useThemeV2();
  const blocked = day.kind === 'unavailable';
  const dot = pillDot(day);
  const ink = today ? colors.cta.primaryText : blocked ? colors.text.tertiary : colors.text.primary;
  const background = today
    ? colors.cta.primary
    : moveTarget
      ? 'rgba(255,91,31,.1)'
      : blocked
        ? 'transparent'
        : colors.surface.raised;
  const ring = moveFrom
    ? `inset 0 0 0 2px ${colors.ember.base}`
    : selected && !today
      ? `inset 0 0 0 1.5px ${colors.text.primary}`
      : blocked
        ? `inset 0 0 0 1px ${colors.divider}`
        : undefined;
  const dotColor =
    dot === 'done' ? colors.ember.base : dot === 'planned' ? (today ? colors.cta.primaryText : colors.text.primary) : 'transparent';
  const dotRing =
    dot === 'missed'
      ? `inset 0 0 0 1.5px ${colors.ember.base}`
      : dot === 'empty'
        ? `inset 0 0 0 1.5px ${colors.outline.control}`
        : undefined;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={dayLabel(day.date, today ? day.date : '')}
      accessibilityState={{ selected }}
      disabled={!onPress}
      onPress={onPress}
      style={[styles.pill, { height, borderRadius: radius, backgroundColor: background, boxShadow: ring }]}
    >
      <TextV2 color={ink} style={styles.pillLetter}>
        {DAY_LETTERS[weekdayIndex(day.date)]}
      </TextV2>
      <TextV2
        color={ink}
        style={[styles.pillNumber, blocked ? styles.strike : null]}
      >
        {String(dayNumber(day.date))}
      </TextV2>
      <View
        style={{
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: dotColor,
          boxShadow: dotRing,
        }}
      />
    </PressableScale>
  );
}

export function WeekPills({
  days,
  today,
  selected,
  moveFrom,
  onPressDay,
  compact = false,
}: {
  days: WeekDay[];
  today: string;
  selected?: string | null;
  moveFrom?: string | null;
  onPressDay?: (day: WeekDay, index: number) => void;
  // Inicio · tira (64 pt, radius 16, 5 pt dot).
  compact?: boolean;
}) {
  return (
    <View style={styles.pills}>
      {days.map((day, index) => (
        <DayPill
          key={day.date}
          day={day}
          today={day.date === today}
          selected={selected === day.date}
          moveFrom={moveFrom === day.date}
          moveTarget={Boolean(moveFrom) && day.date >= today && day.date !== moveFrom}
          height={compact ? 64 : 74}
          radius={compact ? 16 : 18}
          dotSize={compact ? 5 : 6}
          onPress={onPressDay ? () => onPressDay(day, index) : undefined}
        />
      ))}
    </View>
  );
}

// ── ELLIE band (missed day, plan the week) ──────────────────────────────────
export function EllieWash({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useThemeV2();
  return (
    <View style={[styles.wash, { backgroundColor: colors.bg }, style]}>
      <LinearGradient
        colors={['rgba(255,91,31,.08)', 'rgba(255,91,31,.04)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

export function MissedBand({
  text,
  canMove,
  busy,
  onMove,
  onKeep,
}: {
  text: string;
  canMove: boolean;
  busy: boolean;
  onMove: () => void;
  onKeep: () => void;
}) {
  const { colors } = useThemeV2();
  return (
    <EllieWash style={styles.missed}>
      <LivingHalo size={40} state={busy ? 'thinking' : 'idle'} />
      <View style={styles.missedBody}>
        <View style={styles.gap6}>
          <TextV2 color={colors.text.secondary} style={styles.ellieLabel}>
            ELLIE
          </TextV2>
          <TextV2 style={styles.missedText}>{text}</TextV2>
        </View>
        <View style={styles.row8}>
          {canMove ? (
            <PressableScale
              accessibilityRole="button"
              disabled={busy}
              onPress={onMove}
              style={[styles.smallPill, { backgroundColor: colors.cta.primary }]}
            >
              <TextV2 variant="bodyStrong" color={colors.cta.primaryText} style={styles.fs14}>
                Reacomodar
              </TextV2>
            </PressableScale>
          ) : null}
          <PressableScale
            accessibilityRole="button"
            disabled={busy}
            onPress={onKeep}
            style={[styles.smallPill, { backgroundColor: colors.surface.muted }]}
          >
            <TextV2 variant="bodyStrong" style={styles.fs14}>
              {canMove ? 'Dejar así' : 'Entendido'}
            </TextV2>
          </PressableScale>
        </View>
      </View>
    </EllieWash>
  );
}

export function CheckLine({ text }: { text: string }) {
  const { colors } = useThemeV2();
  return (
    <View style={styles.checkLine}>
      <View style={[styles.check22, { backgroundColor: colors.ember.base }]}>
        <Check size={12} color="#FFFFFF" strokeWidth={3} />
      </View>
      <TextV2 variant="body" color={colors.text.secondary} style={styles.flex1}>
        {text}
      </TextV2>
    </View>
  );
}

// ── Day card ────────────────────────────────────────────────────────────────
export type DayCardActions = {
  onPick: () => void;
  onMove: () => void;
  onToggleRest: () => void;
  onToggleBlock: () => void;
  onRegenerate: () => void;
  onMinutes: (delta: number) => void;
  onStart: () => void;
};

export function DayCard({
  day,
  today,
  width,
  editable,
  regenerating,
  minutes,
  habits,
  startLabel,
  note,
  actions,
  guideAnchors = false,
}: {
  // Today's card carries the anchors of the Tu semana guide.
  guideAnchors?: boolean;
  day: WeekDay;
  today: string;
  width: number;
  editable: boolean;
  regenerating: boolean;
  minutes: number;
  // Core 33 of this day: names and which are done (null: no Core 33 row).
  habits: { day: number; line: string; items: { name: string; done: boolean }[] } | null;
  startLabel: string;
  note: string | null;
  actions: DayCardActions;
}) {
  const { colors } = useThemeV2();
  const work = isWorkDay(day);
  const isToday = day.date === today;

  return (
    <View style={[styles.card, { width, backgroundColor: colors.surface.raised }]}>
      <DayHeader day={day} today={today} regenerating={regenerating} onPick={actions.onPick} editable={editable} />
      <View style={styles.cardBody}>
        {habits ? (
          <View style={styles.gap10}>
            <View style={styles.coreHead}>
              <TextV2 variant="eyebrow" color={colors.text.secondary}>
                {`Core 33 · Día ${habits.day}`}
              </TextV2>
              <TextV2 variant="caption" color={colors.text.secondary}>
                {habits.line}
              </TextV2>
            </View>
            <View style={styles.habits}>
              {habits.items.map(habit => (
                <View key={habit.name} style={styles.habit}>
                  <View
                    style={[
                      styles.habitDot,
                      habit.done
                        ? { backgroundColor: colors.ember.base }
                        : { boxShadow: `inset 0 0 0 1.5px ${colors.outline.control}` },
                    ]}
                  >
                    {habit.done ? <Check size={11} color="#FFFFFF" strokeWidth={3} /> : null}
                  </View>
                  <TextV2
                    variant="caption"
                    numberOfLines={1}
                    color={habit.done ? colors.text.primary : colors.text.secondary}
                    style={styles.flexShrink}
                  >
                    {habit.name}
                  </TextV2>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {editable && work ? (
          <View style={[styles.duration, { borderTopColor: colors.divider }]}>
            <TextV2 variant="bodyStrong" style={styles.fs14}>
              Duración
            </TextV2>
            <View style={styles.stepper}>
              <RoundIcon icon={Minus} label="Menos tiempo" onPress={() => actions.onMinutes(-5)} />
              <TextV2 variant="bodyStrong" align="center" style={styles.minutes}>
                {`${minutes} min`}
              </TextV2>
              <RoundIcon icon={Plus} label="Más tiempo" onPress={() => actions.onMinutes(5)} />
            </View>
          </View>
        ) : null}

        {editable ? (
          <View style={styles.actions}>
            {day.kind !== 'empty' && day.kind !== 'unavailable' ? (
              <ActionTile
                icon={Dumbbell}
                label={work ? 'Cambiar rutina' : 'Elegir rutina'}
                ink
                full
                anchorId={guideAnchors ? 'week.change' : undefined}
                onPress={actions.onPick}
              />
            ) : null}
            <ActionTile icon={GripVertical} label="Mover" onPress={actions.onMove} />
            <ActionTile
              icon={Moon}
              label={day.kind === 'rest' ? 'Entrenar' : 'Descanso'}
              onPress={actions.onToggleRest}
            />
            <ActionTile
              icon={Lock}
              label={day.kind === 'unavailable' ? 'Disponible' : 'No disponible'}
              onPress={actions.onToggleBlock}
            />
            <ActionTile
              ellie
              label={work ? 'Otra con ELLIE' : 'Sesión con ELLIE'}
              anchorId={guideAnchors ? 'week.ellie' : undefined}
              busy={regenerating}
              onPress={actions.onRegenerate}
            />
          </View>
        ) : null}

        {isToday && work && day.status === 'today' ? (
          <PressableScale
            accessibilityRole="button"
            onPress={actions.onStart}
            style={[styles.start, { backgroundColor: colors.cta.primary }]}
          >
            <TextV2 variant="cta" color={colors.cta.primaryText}>
              {startLabel}
            </TextV2>
            <Play size={16} color={colors.cta.primaryText} fill={colors.cta.primaryText} />
          </PressableScale>
        ) : null}

        {note ? (
          <TextV2 variant="meta" color={colors.text.secondary}>
            {note}
          </TextV2>
        ) : null}
      </View>
    </View>
  );
}

function DayHeader({
  day,
  today,
  regenerating,
  editable,
  onPick,
}: {
  day: WeekDay;
  today: string;
  regenerating: boolean;
  editable: boolean;
  onPick: () => void;
}) {
  const { colors } = useThemeV2();
  const isToday = day.date === today;
  const label = dayLabel(day.date, today);

  if (isWorkDay(day) && day.routine) {
    const routine = day.routine;
    return (
      <View style={[styles.header, styles.photoBase]}>
        <AppImage
          source={routineImage(routine)}
          style={[StyleSheet.absoluteFill, regenerating ? styles.photoRegen : styles.photo]}
        />
        <LinearGradient
          colors={['rgba(20,19,18,.45)', 'rgba(20,19,18,0)', 'rgba(20,19,18,.92)']}
          locations={[0, 0.3, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.headerTop}>
          <DayTag label={label} today={isToday} variant="glass" />
          {day.status === 'done' ? (
            <View style={[styles.doneDisc, { backgroundColor: colors.ember.base }]}>
              <Check size={16} color="#FFFFFF" strokeWidth={3} />
            </View>
          ) : day.status === 'missed' ? (
            <View style={styles.missedTag}>
              <TextV2 variant="captionStrong" color={DARK.missed}>
                Sin hacer
              </TextV2>
            </View>
          ) : null}
        </View>
        {regenerating ? (
          <View style={styles.regen}>
            <LivingHalo size={56} state="thinking" />
            <TextV2 variant="meta" color={DARK.meta}>
              ELLIE está buscando otra sesión
            </TextV2>
          </View>
        ) : null}
        <View style={styles.headerBottom}>
          <TextV2 variant="eyebrow" color={DARK.eyebrow}>
            {routineTypeText(routine)}
          </TextV2>
          <TextV2 numberOfLines={2} color={DARK.white} style={styles.headTitle}>
            {routine.title}
          </TextV2>
          <TextV2 variant="body" color={DARK.meta} style={styles.fs14}>
            {`${dayMinutes(day)} min${routine.exerciseCount ? ` · ${routine.exerciseCount} ejercicios` : ''}`}
          </TextV2>
        </View>
      </View>
    );
  }

  if (day.kind === 'rest') {
    return (
      <View style={[styles.header, { backgroundColor: DARK.rest }]}>
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <RadialGradient id="restGlow" cx="85%" cy="10%" rx="90%" ry="80%">
              <Stop offset="0" stopColor="#6E8FB3" stopOpacity={0.32} />
              <Stop offset="0.62" stopColor="#6E8FB3" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#restGlow)" />
        </Svg>
        <View style={styles.headerTop}>
          <DayTag label={label} today={isToday} variant="dim" />
        </View>
        <View style={styles.headerBottom}>
          <Moon size={22} color="#FFFFFF" strokeWidth={1.8} style={styles.restIcon} />
          <TextV2 variant="eyebrow" color={DARK.restEyebrow}>
            Recuperación
          </TextV2>
          <TextV2 color={DARK.white} style={styles.headTitle}>
            Día de descanso
          </TextV2>
          <TextV2 variant="body" color={DARK.restMeta} style={styles.fs14}>
            Caminar o 10 min de movilidad, si te apetece.
          </TextV2>
        </View>
      </View>
    );
  }

  if (day.kind === 'unavailable') {
    return (
      <View style={[styles.header, { backgroundColor: colors.surface.muted }]}>
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <Pattern id="stripes" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <Line x1="0" y1="0" x2="0" y2="20" stroke={colors.bg} strokeWidth="10" />
            </Pattern>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#stripes)" />
        </Svg>
        <View style={styles.headerTop}>
          <DayTag label={label} today={false} variant="plain" />
        </View>
        <View style={styles.headerBottom}>
          <Lock size={20} color={colors.text.primary} strokeWidth={1.8} style={styles.lockIcon} />
          <TextV2 style={styles.headTitle}>No disponible</TextV2>
          <TextV2 variant="body" color={colors.text.secondary} style={styles.fs14}>
            ELLIE no planificará nada este día.
          </TextV2>
        </View>
      </View>
    );
  }

  // Empty: "Día sin planificar".
  return (
    <View
      style={[
        styles.header,
        styles.emptyHeader,
        { backgroundColor: colors.bg, boxShadow: `inset 0 0 0 1.5px ${colors.outline.control}` },
      ]}
    >
      <View style={styles.headerTop}>
        <DayTag label={label} today={isToday} variant="plain" />
      </View>
      <View style={[styles.headerBottom, styles.gap14]}>
        <View style={styles.gap6}>
          <TextV2 style={styles.headTitle}>Día sin planificar</TextV2>
          <TextV2 variant="body" color={colors.text.secondary} style={styles.fs14}>
            Elige una rutina o márcalo como descanso.
          </TextV2>
        </View>
        {editable ? (
          <PressableScale
            accessibilityRole="button"
            onPress={onPick}
            style={[styles.smallPill, styles.pickPill, { backgroundColor: colors.cta.primary }]}
          >
            <Plus size={15} color={colors.cta.primaryText} strokeWidth={2.2} />
            <TextV2 variant="bodyStrong" color={colors.cta.primaryText}>
              Elegir rutina
            </TextV2>
          </PressableScale>
        ) : null}
      </View>
    </View>
  );
}

function DayTag({
  label,
  today,
  variant,
}: {
  label: string;
  today: boolean;
  variant: 'glass' | 'dim' | 'plain';
}) {
  const { colors } = useThemeV2();
  const background =
    variant === 'glass' ? 'rgba(255,255,255,.14)' : variant === 'dim' ? 'rgba(255,255,255,.1)' : colors.surface.raised;
  const ink = variant === 'plain' ? colors.text.primary : '#FFFFFF';
  return (
    <View style={[styles.tag, { backgroundColor: background }]}>
      {today ? <View style={[styles.tagDot, { backgroundColor: colors.ember.base }]} /> : null}
      <TextV2 variant="captionStrong" color={ink}>
        {label}
      </TextV2>
    </View>
  );
}

function RoundIcon({
  icon: Icon,
  label,
  onPress,
}: {
  icon: typeof Minus;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useThemeV2();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.round, { backgroundColor: colors.surface.muted }]}
    >
      <Icon size={16} color={colors.text.primary} strokeWidth={2} />
    </PressableScale>
  );
}

function ActionTile({
  icon: Icon,
  label,
  ink = false,
  full = false,
  ellie = false,
  busy = false,
  anchorId,
  onPress,
}: {
  // Guide anchor (the wrapper takes the tile's size).
  anchorId?: string;
  icon?: typeof Minus;
  label: string;
  ink?: boolean;
  full?: boolean;
  // AI action (22.2): Ember 10 % tint with the mini Living Halo.
  ellie?: boolean;
  busy?: boolean;
  onPress: () => void;
}) {
  const { colors } = useThemeV2();
  const background = ink ? colors.cta.primary : ellie ? 'rgba(255,91,31,.1)' : colors.surface.muted;
  const fg = ink ? colors.cta.primaryText : colors.text.primary;
  const size = full ? styles.tileFull : styles.tileHalf;
  const tile = (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ busy }}
      disabled={busy}
      onPress={onPress}
      style={[styles.tile, anchorId ? styles.tileFull : size, { backgroundColor: background }]}
    >
      {ellie ? (
        <LivingHalo size={18} state={busy ? 'thinking' : 'idle'} />
      ) : Icon ? (
        <Icon size={15} color={fg} strokeWidth={2} style={ink ? null : styles.dim} />
      ) : null}
      <TextV2 variant="captionStrong" color={fg} numberOfLines={2} align="center" style={styles.tileText}>
        {label}
      </TextV2>
    </PressableScale>
  );
  return anchorId ? (
    <GuideAnchor id={anchorId} style={size}>
      {tile}
    </GuideAnchor>
  ) : (
    tile
  );
}

// ── Planificar la semana ────────────────────────────────────────────────────
export function PlanSection({
  onEllie,
  onManual,
}: {
  onEllie: () => void;
  onManual: () => void;
}) {
  const { colors } = useThemeV2();
  return (
    <View style={styles.planSection}>
      <TextV2 style={styles.sectionTitle}>Planificar la semana</TextV2>
      <PressableScale accessibilityRole="button" accessibilityLabel="Planificar con ELLIE" onPress={onEllie}>
        <EllieWash style={styles.planBand}>
          <LivingHalo size={52} lit />
          <View style={[styles.flex1, styles.gap6]}>
            <TextV2 color={colors.text.secondary} style={styles.ellieLabel}>
              ELLIE
            </TextV2>
            <TextV2 style={styles.planLine}>Dime qué días puedes y armo tu semana completa.</TextV2>
            <View style={styles.planCta}>
              <TextV2 variant="bodyStrong" style={styles.fs15}>
                Planificar con ELLIE
              </TextV2>
              <ArrowRight size={15} color={colors.text.primary} strokeWidth={2} />
            </View>
          </View>
        </EllieWash>
      </PressableScale>
      <PressableScale
        accessibilityRole="button"
        onPress={onManual}
        style={[styles.manual, { borderBottomColor: colors.divider }]}
      >
        <View style={[styles.manualIcon, { backgroundColor: colors.surface.muted }]}>
          <Calendar size={22} color={colors.text.primary} strokeWidth={1.8} style={styles.dim} />
        </View>
        <View style={[styles.flex1, styles.gap4]}>
          <TextV2 variant="cta">Hazla tú</TextV2>
          <TextV2 variant="body" color={colors.text.secondary} style={styles.fs14}>
            Empieza en blanco y elige una rutina para cada día.
          </TextV2>
        </View>
        <ChevronRight size={16} color={colors.text.primary} strokeWidth={2} style={styles.faint} />
      </PressableScale>
      <TextV2 variant="meta" color={colors.text.secondary} style={styles.planNote}>
        Sea cual sea el camino, puedes editar cada día desde su tarjeta.
      </TextV2>
    </View>
  );
}

// ── Picker rows ("Elige la sesión") ─────────────────────────────────────────
export function PickRow({
  title,
  subtitle,
  image,
  rest = false,
  selected,
  onPress,
}: {
  title: string;
  subtitle: string;
  image?: AppImageSource;
  rest?: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useThemeV2();
  return (
    <PressableScale
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.pickRow, { borderBottomColor: colors.divider }]}
    >
      {rest ? (
        <View style={[styles.pickThumb, styles.center, { backgroundColor: colors.recovery.tintBg }]}>
          <Moon size={18} color={colors.text.primary} strokeWidth={1.8} style={styles.dim} />
        </View>
      ) : (
        <AppImage source={image ?? DEFAULT_WORKOUT_THUMBNAIL} style={[styles.pickThumb, { backgroundColor: colors.divider }]} />
      )}
      <View style={[styles.flex1, styles.gap2]}>
        <TextV2 variant="bodyStrong" numberOfLines={1}>
          {title}
        </TextV2>
        <TextV2 variant="meta" color={colors.text.secondary} numberOfLines={1}>
          {subtitle}
        </TextV2>
      </View>
      <RadioDot selected={selected} />
    </PressableScale>
  );
}

export function RadioDot({ selected, size = 24 }: { selected: boolean; size?: number }) {
  const { colors } = useThemeV2();
  return (
    <View
      style={[
        styles.center,
        { width: size, height: size, borderRadius: size / 2 },
        selected
          ? { backgroundColor: colors.ember.base }
          : { boxShadow: `inset 0 0 0 1.5px ${colors.outline.control}` },
      ]}
    >
      {selected ? <Check size={size / 2} color="#FFFFFF" strokeWidth={3} /> : null}
    </View>
  );
}

export function CloseButton({ onPress }: { onPress: () => void }) {
  const { colors } = useThemeV2();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="Cerrar"
      onPress={onPress}
      style={[styles.round, { backgroundColor: colors.surface.muted }]}
    >
      <X size={18} color={colors.text.primary} strokeWidth={2} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1, minWidth: 0 },
  flexShrink: { flexShrink: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: 0.7 },
  faint: { opacity: 0.4 },
  gap2: { gap: 2 },
  gap4: { gap: 4 },
  gap6: { gap: 6 },
  gap10: { gap: 10 },
  gap14: { gap: 14 },
  row8: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  fs14: { fontSize: 14 },
  fs15: { fontSize: 15 },
  strike: { textDecorationLine: 'line-through' },
  pills: { flexDirection: 'row', gap: 6 },
  pill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5 },
  pillLetter: { fontSize: 11, lineHeight: 13, fontWeight: '600', letterSpacing: 0.44, opacity: 0.72 },
  pillNumber: { fontSize: 18, lineHeight: 20, fontWeight: '600', letterSpacing: -0.36 },
  wash: { overflow: 'hidden' },
  missed: { marginHorizontal: -20, padding: 20, flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  missedBody: { flex: 1, minWidth: 0, gap: 14 },
  ellieLabel: { fontSize: 11, lineHeight: 13, fontWeight: '600', letterSpacing: 1.1 },
  missedText: { fontSize: 16, lineHeight: 23 },
  smallPill: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickPill: { alignSelf: 'flex-start', flexDirection: 'row', gap: 6 },
  checkLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  check22: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  card: {
    borderRadius: 28,
    overflow: 'hidden',
    boxShadow: '0 1px 2px rgba(0,0,0,.04), 0 12px 28px rgba(0,0,0,.07)',
  },
  header: { height: 250, overflow: 'hidden' },
  photoBase: { backgroundColor: '#141312' },
  photo: { opacity: 0.8 },
  photoRegen: { opacity: 0.25 },
  emptyHeader: { borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  headerTop: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerBottom: { position: 'absolute', left: 18, right: 18, bottom: 18, gap: 6 },
  headTitle: { fontSize: 24, lineHeight: 27, fontWeight: '600', letterSpacing: -0.48 },
  restIcon: { opacity: 0.75, marginBottom: 6 },
  lockIcon: { opacity: 0.6, marginBottom: 6 },
  tag: {
    height: 26,
    paddingHorizontal: 11,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagDot: { width: 6, height: 6, borderRadius: 3 },
  doneDisc: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  missedTag: {
    height: 26,
    paddingHorizontal: 11,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,138,92,.8)',
    justifyContent: 'center',
  },
  regen: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 12 },
  cardBody: { padding: 18, gap: 16 },
  coreHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  habits: { flexDirection: 'row', gap: 6 },
  habit: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 7 },
  habitDot: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  duration: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: 1,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  minutes: { minWidth: 66, fontSize: 17 },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: {
    height: 44,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 8,
  },
  tileFull: { width: '100%' },
  tileHalf: { flexBasis: '45%', flexGrow: 1 },
  tileText: { fontSize: 13, flexShrink: 1 },
  start: {
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  planSection: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 20, lineHeight: 24, fontWeight: '600', paddingBottom: 14 },
  planBand: { marginHorizontal: -20, paddingVertical: 26, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 20 },
  planLine: { fontSize: 17, lineHeight: 23 },
  planCta: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 8 },
  manual: { paddingVertical: 20, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 20 },
  manualIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  planNote: { paddingTop: 14, lineHeight: 19 },
  pickRow: { paddingVertical: 10, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 14 },
  pickThumb: { width: 52, height: 52, borderRadius: 14 },
});
