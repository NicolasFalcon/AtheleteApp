import { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Check, ChevronDown } from 'lucide-react-native';
import {
  Button,
  EllieActionButton,
  LivingHalo,
  PressableScale,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { HOME_PHOTOS } from '@app/features/home/v2/homePhotos';
import {
  DONUT_LENGTH,
  DONUT_RADIUS,
  macroDonut,
  type NutritionCardMessage,
  type WorkoutCardMessage,
} from '@app/features/ellie/chatModel';

// ELLIE speaks without a bubble: a 24 pt orb and 17/400 text.
export function EllieVoice({
  text,
  muted = false,
  showOrb = true,
}: {
  text: string;
  // Explanatory notice (error): lighter text and a switched-off orb.
  muted?: boolean;
  showOrb?: boolean;
}) {
  const { colors } = useThemeV2();
  return (
    <View style={styles.voiceRow}>
      <View style={styles.voiceOrb}>
        {showOrb ? (
          <LivingHalo size={24} state={muted ? 'offline' : 'idle'} />
        ) : null}
      </View>
      <TextV2
        variant="bodyL"
        color={muted ? colors.ellie.textSecondary : colors.text.primary}
        style={styles.voiceText}
      >
        {text}
      </TextV2>
    </View>
  );
}

// The user: a black pill, right aligned, up to 78 % of the width. Failed
// sends are grey with "No enviado · Reintentar".
export function UserPill({
  text,
  status,
  onRetry,
}: {
  text: string;
  status: 'sending' | 'sent' | 'failed';
  onRetry: () => void;
}) {
  const { colors } = useThemeV2();
  const failed = status === 'failed';
  return (
    <View style={styles.userRow}>
      <View
        style={[
          styles.pill,
          {
            backgroundColor: failed
              ? colors.ellie.textSecondary
              : colors.cta.primary,
            opacity: status === 'sending' ? 0.7 : 1,
          },
        ]}
      >
        <TextV2 variant="body" color={colors.cta.primaryText}>
          {text}
        </TextV2>
      </View>
      {failed ? (
        <PressableScale
          accessibilityRole="button"
          onPress={onRetry}
          style={styles.failed}
        >
          <TextV2 variant="caption" color={colors.ember.deep}>
            No enviado ·{' '}
            <TextV2 variant="captionStrong" color={colors.ember.deep}>
              Reintentar
            </TextV2>
          </TextV2>
        </PressableScale>
      ) : null}
    </View>
  );
}

function Dot({ index }: { index: number }) {
  const { colors } = useThemeV2();
  const level = useSharedValue(0.3);
  useEffect(() => {
    level.value = withDelay(
      index * 160,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 420, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.3, { duration: 420, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      ),
    );
  }, [index, level]);
  const style = useAnimatedStyle(() => ({ opacity: level.value }));
  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: colors.ellie.textSecondary },
        style,
      ]}
    />
  );
}

// ELLIE is writing: the orb in "thinking" and three dots.
export function ThinkingIndicator() {
  return (
    <View
      style={styles.voiceRow}
      accessibilityRole="progressbar"
      accessibilityLabel="ELLIE está escribiendo"
    >
      <View style={styles.voiceOrb}>
        <LivingHalo size={24} state="thinking" />
      </View>
      <View style={styles.dots}>
        <Dot index={0} />
        <Dot index={1} />
        <Dot index={2} />
      </View>
    </View>
  );
}

export function SuggestionPills({
  items,
  onPick,
}: {
  items: string[];
  onPick: (index: number) => void;
}) {
  const { colors } = useThemeV2();
  return (
    <View style={styles.suggestions}>
      {items.map((item, index) => (
        <PressableScale
          key={item}
          accessibilityRole="button"
          onPress={() => onPick(index)}
          style={[
            styles.suggestion,
            {
              backgroundColor: colors.ellie.input,
              boxShadow: `inset 0 0 0 1px ${colors.divider}`,
            },
          ]}
        >
          <TextV2 variant="bodyStrong" style={styles.suggestionText}>
            {item}
          </TextV2>
        </PressableScale>
      ))}
    </View>
  );
}

const MACRO_LABELS = ['proteína', 'carbos', 'grasas'] as const;

// ELLIE_03: the nutrition plan she proposes. Activar plan commits it;
// Otra versión asks for another; Ajustar writes the adjustment in the chat.
export function NutritionPlanCard({
  card,
  regenerating,
  onActivate,
  onAnother,
  onAdjust,
}: {
  card: NutritionCardMessage;
  regenerating: boolean;
  onActivate: () => void;
  onAnother: () => void;
  onAdjust: () => void;
}) {
  const { colors, shadow } = useThemeV2();
  const [open, setOpen] = useState(false);
  const { plan, stage } = card;
  const tones = [
    colors.text.primary,
    colors.text.secondary,
    colors.outline.strong,
  ];
  const values = [plan.targetProtein, plan.targetCarbs, plan.targetFats];
  const arcs = macroDonut(plan);
  const active = stage === 'active';
  const busy = stage === 'activating' || regenerating;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface.raised, boxShadow: shadow.subtle },
      ]}
    >
      <View style={styles.planTop}>
        <View style={styles.donut}>
          <Svg width={104} height={104} viewBox="0 0 104 104">
            <Circle
              cx={52}
              cy={52}
              r={DONUT_RADIUS}
              stroke={colors.surface.track}
              strokeWidth={12}
              fill="none"
            />
            {arcs.map((arc, index) => (
              <Circle
                key={MACRO_LABELS[index]}
                cx={52}
                cy={52}
                r={DONUT_RADIUS}
                stroke={tones[index]}
                strokeWidth={12}
                fill="none"
                strokeDasharray={`${arc.length} ${DONUT_LENGTH}`}
                strokeDashoffset={arc.offset}
                rotation={-90}
                origin="52, 52"
              />
            ))}
          </Svg>
          <View style={styles.donutCenter}>
            <TextV2 variant="title22" style={styles.kcal}>
              {String(Math.round(plan.targetCalories)).replace(
                /\B(?=(\d{3})+(?!\d))/g,
                '.',
              )}
            </TextV2>
            <TextV2 variant="caption" color={colors.text.secondary}>
              kcal/día
            </TextV2>
          </View>
        </View>
        <View style={styles.macros}>
          {values.map((value, index) => (
            <View key={MACRO_LABELS[index]} style={styles.macro}>
              <View
                style={[styles.swatch, { backgroundColor: tones[index] }]}
              />
              <TextV2 variant="bodyStrong">{`${Math.round(value)} g`}</TextV2>
              <TextV2 variant="meta" color={colors.text.secondary}>
                {MACRO_LABELS[index]}
              </TextV2>
            </View>
          ))}
        </View>
      </View>

      {plan.notes ? (
        <>
          <PressableScale
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            onPress={() => setOpen(value => !value)}
            style={[styles.why, { borderTopColor: colors.divider }]}
          >
            <TextV2 variant="bodyStrong" style={styles.flex}>
              Por qué este plan
            </TextV2>
            <ChevronDown
              size={18}
              color={colors.text.primary}
              style={open ? styles.flip : undefined}
            />
          </PressableScale>
          {open ? (
            <TextV2
              variant="body"
              color={colors.text.secondary}
              style={styles.whyText}
            >
              {plan.notes}
            </TextV2>
          ) : null}
        </>
      ) : null}

      {active ? (
        <View style={styles.activeRow}>
          <Check size={18} color={colors.ember.base} strokeWidth={2.5} />
          <TextV2 variant="bodyStrong">Plan activo</TextV2>
        </View>
      ) : (
        <>
          <Button
            label={stage === 'error' ? 'Reintentar activar' : 'Activar plan'}
            loading={stage === 'activating'}
            loadingLabel="Activando"
            disabled={busy}
            onPress={onActivate}
            fullWidth
          />
          {stage === 'error' ? (
            <TextV2 variant="meta" color={colors.ember.deep}>
              No pudimos activar el plan. Inténtalo de nuevo.
            </TextV2>
          ) : null}
          <View style={styles.pair}>
            <EllieActionButton
              label="Otra versión"
              variant="compact"
              loading={regenerating}
              loadingLabel="Generando"
              disabled={busy}
              onPress={onAnother}
              style={styles.flex}
            />
            <EllieActionButton
              label="Ajustar"
              variant="compact"
              disabled={busy}
              onPress={onAdjust}
              style={styles.flex}
            />
          </View>
        </>
      )}
    </View>
  );
}

// ELLIE_03 · routine: the one she proposes, ready to start or to keep.
export function RoutineCard({
  card,
  regenerating,
  onStart,
  onSave,
  onAnother,
}: {
  card: WorkoutCardMessage;
  regenerating: boolean;
  onStart: () => void;
  onSave: () => void;
  onAnother: () => void;
}) {
  const { colors, shadow } = useThemeV2();
  const { workout, stage } = card;
  const saved = stage === 'saved';
  return (
    <View
      style={[
        styles.card,
        styles.routine,
        { backgroundColor: colors.surface.raised, boxShadow: shadow.subtle },
      ]}
    >
      <View style={styles.routineHero}>
        {workout.imageUrl ? (
          <Image
            source={{ uri: workout.imageUrl }}
            resizeMode="cover"
            style={styles.fill}
          />
        ) : (
          <Image
            source={HOME_PHOTOS.effort}
            resizeMode="cover"
            style={styles.fill}
          />
        )}
        <View style={styles.routineShade} />
        <View style={styles.routineText}>
          <TextV2 variant="title22" color="#FFFFFF" numberOfLines={2}>
            {workout.title}
          </TextV2>
          <TextV2 variant="meta" color="rgba(255,255,255,.8)">
            {`${workout.duration} min · ${workout.exercises.length} ejercicios`}
          </TextV2>
        </View>
      </View>
      <View style={styles.routineActions}>
        {saved ? (
          <Button label="Empezar" onPress={onStart} fullWidth />
        ) : (
          <View style={styles.pair}>
            <Button
              label="Guardar"
              variant="primary"
              size="md"
              loading={stage === 'saving'}
              loadingLabel="Guardando"
              disabled={stage === 'saving' || regenerating}
              onPress={onSave}
              style={styles.flex}
            />
            <EllieActionButton
              label="Otra versión"
              variant="compact"
              loading={regenerating}
              loadingLabel="Generando"
              disabled={stage === 'saving' || regenerating}
              onPress={onAnother}
              style={styles.flex}
            />
          </View>
        )}
        {saved ? (
          <View style={styles.activeRow}>
            <Check size={18} color={colors.ember.base} strokeWidth={2.5} />
            <TextV2 variant="bodyStrong">Guardada en tus entrenos</TextV2>
          </View>
        ) : null}
        {stage === 'error' ? (
          <TextV2 variant="meta" color={colors.ember.deep}>
            No pudimos guardar la rutina. Inténtalo de nuevo.
          </TextV2>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fill: { width: '100%', height: '100%' },
  flip: { transform: [{ rotate: '180deg' }] },
  voiceRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    paddingRight: 8,
  },
  voiceOrb: { width: 24, height: 24, marginTop: 3 },
  voiceText: { flex: 1, lineHeight: 26, fontWeight: '400' },
  userRow: { alignItems: 'flex-end', gap: 6 },
  pill: {
    maxWidth: '78%',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  failed: { paddingRight: 4 },
  dots: { flexDirection: 'row', gap: 5, height: 30, alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  suggestions: { gap: 8, alignItems: 'flex-start', paddingLeft: 36 },
  suggestion: { borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11 },
  suggestionText: { fontWeight: '500' },
  card: { marginLeft: 36, borderRadius: 24, padding: 20, gap: 14 },
  planTop: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  donut: { width: 104, height: 104 },
  donutCenter: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kcal: { fontWeight: '600', letterSpacing: -0.5 },
  macros: { flex: 1, gap: 8 },
  macro: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  swatch: { width: 10, height: 10, borderRadius: 3, alignSelf: 'center' },
  why: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
  },
  whyText: { lineHeight: 22 },
  pair: { flexDirection: 'row', gap: 8 },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  routine: { padding: 0, overflow: 'hidden' },
  routineHero: {
    height: 120,
    backgroundColor: '#141312',
    justifyContent: 'flex-end',
  },
  routineShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,.38)',
  },
  routineText: { padding: 16, gap: 2 },
  routineActions: { padding: 16, gap: 10 },
});
