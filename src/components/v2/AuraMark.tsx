import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Image,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

// ELLIE · AURA ORIGINAL (handoff v2.18 §28.2), replaces the Living Halo.
// Two layers from the official raster art (assets/aura): the "^" mark, always
// static, and the 300° Ember arc, which only rotates (no scale, glow or
// colour change). Motion is a Reanimated frame callback on the UI thread
// (same physics as the prototype's ellie-orb.js); React never re-renders per
// frame and the callback is switched off once the arc is back at rest.
export type AuraState = 'rest' | 'active' | 'processing' | 'finishing';
export type AuraTone = 'light' | 'dark';

export type AuraMarkProps = {
  size?: number;
  // rest: still at 0° · active: 1 turn / 4 s · processing: 1 turn / 1.6 s ·
  // finishing: decelerates to complete the current turn and stays at rest.
  // Going from a moving state to `rest` also finishes without a cut.
  state?: AuraState;
  // Mark colour: ink on light backgrounds, white on dark. Defaults to the
  // theme (scenes are dark).
  tone?: AuraTone;
  // Offline: rest at 35 % opacity.
  offline?: boolean;
  style?: StyleProp<ViewStyle>;
};

const MARKS = {
  light: require('@app/assets/v2/aura/mark-light.png'),
  dark: require('@app/assets/v2/aura/mark-dark.png'),
};
// Static arcs for "Reducir movimiento" (rest also covers finishing).
const ARCS = {
  rest: require('@app/assets/v2/aura/arc-rest.png'),
  active: require('@app/assets/v2/aura/arc-active.png'),
  processing: require('@app/assets/v2/aura/arc-processing.png'),
};

const SPEED: Record<AuraState, number> = {
  rest: 0,
  finishing: 0,
  active: 360 / 4000, // deg per ms
  processing: 360 / 1600,
};
const DECEL = 0.00028; // deg/ms², Finalizado → Reposo
const TAU_MS = 350; // speed changes between Activo and Procesando
const SMALL_MAX = 36; // AURA small (≤ 36 pt)

function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (alive) setReduce(value);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

export function AuraMark({
  size = 48,
  state = 'rest',
  tone,
  offline = false,
  style,
}: AuraMarkProps) {
  const { mode } = useThemeV2();
  const reduceMotion = useReduceMotion();
  const shown: AuraState = offline ? 'rest' : state;
  const small = size <= SMALL_MAX;
  const markTone = tone ?? (mode === 'light' ? 'light' : 'dark');

  const target = useSharedValue(SPEED[shown]);
  const angle = useSharedValue(0);
  const speed = useSharedValue(0);
  const stopAt = useSharedValue(-1); // -1: no stop planned

  // Called from the worklet once the arc is back at 0°.
  const frameRef = useRef<{ setActive: (active: boolean) => void } | null>(null);
  const deactivate = useCallback(() => frameRef.current?.setActive(false), []);
  const frame = useFrameCallback((info) => {
    'worklet';
    const dt = Math.min(64, info.timeSincePreviousFrame ?? 0);
    const vt = target.value;
    if (vt > 0) {
      stopAt.value = -1;
      speed.value += (vt - speed.value) * (1 - Math.exp(-dt / TAU_MS));
      angle.value += speed.value * dt;
      if (angle.value >= 3600) angle.value %= 360;
      return;
    }
    if (speed.value <= 0 && stopAt.value < 0) {
      angle.value = 0;
      runOnJS(deactivate)();
      return;
    }
    if (stopAt.value < 0) {
      const travel = (speed.value * speed.value) / (2 * DECEL);
      stopAt.value = Math.ceil((angle.value + travel) / 360) * 360;
    }
    const rem = stopAt.value - angle.value;
    if (rem <= 0.05) {
      angle.value = 0;
      speed.value = 0;
      stopAt.value = -1;
      runOnJS(deactivate)();
      return;
    }
    const vMax = Math.sqrt(2 * DECEL * rem);
    speed.value = Math.min(speed.value || vMax, vMax);
    angle.value += Math.min(rem, Math.max(speed.value, 0.004) * dt);
  }, false);
  frameRef.current = frame;

  useEffect(() => {
    target.value = SPEED[shown];
    if (reduceMotion) {
      frame.setActive(false);
      angle.value = 0;
      speed.value = 0;
      stopAt.value = -1;
      return;
    }
    if (SPEED[shown] > 0 || speed.value > 0) frame.setActive(true);
    // `frame` and the shared values are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, reduceMotion]);

  const arcScale = small ? 1.06 : 1;
  const arcStyle = useAnimatedStyle(() => ({
    transform: [{ scale: arcScale }, { rotate: `${angle.value % 360}deg` }],
  }));

  const arcSource = reduceMotion
    ? ARCS[shown === 'finishing' ? 'rest' : shown]
    : ARCS.rest;
  // AURA small: a hairline Ember outline around the arc (the prototype's four
  // 0-blur drop-shadows), ≈ 0.017 × size per side.
  const d = size * 0.017;
  const outline = small
    ? [
        { left: d, top: 0 },
        { left: -d, top: 0 },
        { left: 0, top: d },
        { left: 0, top: -d },
      ]
    : [];

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="ATHELETE INTELLIGENCE"
      accessibilityState={{ busy: shown === 'processing' }}
      style={[{ width: size, height: size }, offline && styles.offline, style]}
    >
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, arcStyle]}>
        {outline.map((offset, i) => (
          <Image
            key={i}
            source={arcSource}
            fadeDuration={0}
            style={[styles.layer, offset]}
          />
        ))}
        <Image source={arcSource} fadeDuration={0} style={styles.layer} />
      </Animated.View>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, small && styles.smallMark]}>
        <Image source={MARKS[markTone]} fadeDuration={0} style={styles.layer} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', width: '100%', height: '100%' },
  // Mark ×1.2 around its own centre (origin 50 % · 46.35 %).
  smallMark: { transform: [{ scale: 1.2 }], transformOrigin: '50% 46.35%' },
  offline: { opacity: 0.35 },
});
