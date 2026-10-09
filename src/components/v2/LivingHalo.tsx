import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import {
  HALO_SETTLE_MS,
  haloKey,
  haloLabel,
  haloMayAnimate,
  resolveHaloSize,
  resolveHaloTargets,
  type LivingHaloSize,
  type LivingHaloState,
} from '@app/components/v2/livingHaloModel';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

// ELLIE · Living Halo (handoff v2.12 §6): smoked-graphite core, living Ember
// contour. Ember is energy, never skin. One component for every size (tab 24,
// chat 24–28, bands 36–56, cover 128, voice mode 176) and every state.
// All motion is Reanimated on the UI thread (transform/opacity only); the
// SVG layers are static. "Reducir movimiento": no scale, deformation, ripples
// or drift — states read through light, Ember and halo only.
export type { LivingHaloState } from '@app/components/v2/livingHaloModel';

export type LivingHaloProps = {
  // pt, or a named size (mini 20, tab 24, chat 28, input 32, band 56,
  // cover 128, voice 176).
  size?: number | LivingHaloSize;
  state?: LivingHaloState;
  // Voice energy 0–1 (mic or speech). Drives listening/speaking reactivity
  // and the ripples; without it those states show a steady level.
  level?: SharedValue<number>;
  // Tab bar icon: no loops. Inactive = still sphere, no glow; active = soft
  // Ember halo and contour, still.
  tab?: boolean;
  active?: boolean;
  // "Lit" finish (Inicio band): diffuse outer glow and a partial, asymmetric
  // Ember light inside, bottom-right. Static, no extra loops.
  lit?: boolean;
  style?: StyleProp<ViewStyle>;
};

const ARC_REST_DEG = 108; // bottom-right
const ARC_SWEEP = 0.3; // fraction of the contour the arc covers

export function LivingHalo({
  size: sizeProp = 64,
  state = 'idle',
  level,
  tab = false,
  active = false,
  lit = false,
  style,
}: LivingHaloProps) {
  const size = resolveHaloSize(sizeProp);
  const { colors } = useThemeV2();
  const reduceMotion = useReducedMotion();
  const offline = state === 'offline';
  const key = haloKey(state);
  const target = resolveHaloTargets(state, { enabled: tab, active });
  const settle = HALO_SETTLE_MS[key];
  const mayAnimate = haloMayAnimate({ state, tab, reduceMotion });

  const scale = useSharedValue<number>(1);
  const breathAmp = useSharedValue<number>(1);
  const ring = useSharedValue<number>(target.ring);
  const arc = useSharedValue<number>(target.arc);
  const halo = useSharedValue<number>(0);
  const inner = useSharedValue<number>(0);
  const br = useSharedValue(0); // 0 → 1 → 0 every 3 s
  const phase = useSharedValue(0); // 0 → 1 every 2.2 s (thinking deformation)
  const angle = useSharedValue(ARC_REST_DEG);
  const pulse = useSharedValue(1); // arc pulse under reduced motion + thinking
  const rip0 = useSharedValue(0);
  const rip1 = useSharedValue(0);
  const lv = useSharedValue(0);

  // Smooth state targets (exponential-like: ease-out timing).
  useEffect(() => {
    const cfg = {
      duration: reduceMotion ? 0 : settle,
      easing: Easing.out(Easing.cubic),
    };
    scale.value = withTiming(target.scale, cfg);
    breathAmp.value = withTiming(target.breath, cfg);
    ring.value = withTiming(target.ring, cfg);
    arc.value = withTiming(target.arc, cfg);
    halo.value = withTiming(target.halo, cfg);
    inner.value = withTiming(target.inner, cfg);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `target` is a
    // fresh object each render; its fields are listed instead.
  }, [
    arc,
    breathAmp,
    halo,
    inner,
    reduceMotion,
    ring,
    scale,
    settle,
    target.arc,
    target.breath,
    target.halo,
    target.inner,
    target.ring,
    target.scale,
  ]);

  // Continuous breathing (idle and everywhere, scaled by breathAmp).
  useEffect(() => {
    if (!mayAnimate) {
      cancelAnimation(br);
      br.value = 0;
      return;
    }
    br.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(br);
  }, [br, mayAnimate]);

  // Thinking: the arc travels the contour (2.1 s / turn) with a ≤1.2 %
  // deformation. Elsewhere it settles back to the rest position.
  useEffect(() => {
    cancelAnimation(angle);
    cancelAnimation(phase);
    cancelAnimation(pulse);
    const thinking = key === 'thinking' && !offline;

    if (thinking && !reduceMotion) {
      angle.value = withRepeat(
        withTiming(angle.value + 360, { duration: 2100, easing: Easing.linear }),
        -1,
        false,
      );
      phase.value = withRepeat(
        withTiming(1, { duration: 2200, easing: Easing.linear }),
        -1,
        false,
      );
      pulse.value = 1;
    } else {
      angle.value = withTiming(ARC_REST_DEG, { duration: 400 });
      phase.value = withTiming(0, { duration: 300 });
      pulse.value =
        thinking && reduceMotion
          ? withRepeat(
              withSequence(
                withTiming(0.6, { duration: 1050 }),
                withTiming(1, { duration: 1050 }),
              ),
              -1,
              false,
            )
          : withTiming(1, { duration: 200 });
    }
    return () => {
      cancelAnimation(angle);
      cancelAnimation(phase);
      cancelAnimation(pulse);
    };
  }, [angle, key, offline, phase, pulse, reduceMotion]);

  // Voice energy: the given level, or a steady one in listening/speaking.
  useEffect(() => {
    if (level || offline || (key !== 'listening' && key !== 'speaking')) {
      lv.value = withTiming(0, { duration: 140 });
      return;
    }
    lv.value = withTiming(0.55, { duration: 300 });
  }, [key, level, lv, offline]);

  // Ripples: listening with voice only, max 2, never under reduced motion.
  useEffect(() => {
    const ripple = (v: SharedValue<number>, delay: number) => {
      v.value = withDelay(
        delay,
        withRepeat(
          withTiming(1, { duration: 1450, easing: Easing.out(Easing.quad) }),
          -1,
          false,
        ),
      );
    };
    if (key === 'listening' && !reduceMotion && !offline && level) {
      ripple(rip0, 0);
      ripple(rip1, 760);
    } else {
      cancelAnimation(rip0);
      cancelAnimation(rip1);
      rip0.value = 0;
      rip1.value = 0;
    }
    return () => {
      cancelAnimation(rip0);
      cancelAnimation(rip1);
    };
  }, [key, level, offline, reduceMotion, rip0, rip1]);

  const energy = () => {
    'worklet';
    return level ? level.value : lv.value;
  };

  const wrapStyle = useAnimatedStyle(() => {
    if (reduceMotion || offline) {
      return { transform: [{ scaleX: 1 }, { scaleY: 1 }] };
    }
    const e = energy();
    const react = key === 'speaking' ? 0.015 : key === 'listening' ? 0.02 : 0;
    const s = Math.min(
      1.035,
      scale.value + 0.012 * br.value * breathAmp.value + react * e,
    );
    let dx = 0;
    let dy = 0;
    if (key === 'thinking') {
      const d = 0.012 * Math.sin(phase.value * 2 * Math.PI);
      dx = d;
      dy = -d;
    } else if (key === 'speaking') {
      const d = Math.min(0.02, e * 0.02) * Math.sin(br.value * 2 * Math.PI);
      dx = d;
      dy = -d * 0.8;
    }
    return { transform: [{ scaleX: s * (1 + dx) }, { scaleY: s * (1 + dy) }] };
  });

  const ringStyle = useAnimatedStyle(() => {
    const e = energy();
    const react = key === 'speaking' ? 0.45 : key === 'listening' ? 0.18 : 0;
    const idleBreath = key === 'idle' && !reduceMotion && !tab ? 0.04 * br.value : 0;
    return { opacity: Math.min(1, ring.value + react * e + idleBreath) };
  });

  const arcStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, arc.value + (key === 'speaking' ? energy() * 0.3 : 0)) * pulse.value,
    transform: [{ rotate: `${angle.value % 360}deg` }],
  }));
  const arcGlowStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, arc.value) * 0.9 * pulse.value,
    transform: [{ rotate: `${angle.value % 360}deg` }],
  }));

  const innerStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, inner.value + energy() * (key === 'speaking' ? 0.5 : 0.3)),
  }));

  const haloStyle = useAnimatedStyle(() => {
    const e = energy();
    let h = halo.value + (key === 'listening' ? e * 0.12 : key === 'speaking' ? e * 0.11 : 0);
    if (key === 'speaking') {
      h = Math.min(h, 0.17);
    }
    return {
      opacity: Math.min(0.25, h * 2.2),
      transform: [{ scale: 1 + (reduceMotion ? 0 : e * 0.05) }],
    };
  });

  const rip0Style = useAnimatedStyle(() => ({
    opacity: rip0.value > 0 ? 0.12 * (1 - rip0.value) : 0,
    transform: [{ scale: 1.02 + 0.16 * rip0.value }],
  }));
  const rip1Style = useAnimatedStyle(() => ({
    opacity: rip1.value > 0 ? 0.12 * (1 - rip1.value) : 0,
    transform: [{ scale: 1.02 + 0.16 * rip1.value }],
  }));

  const h = colors.ellie.halo;
  // The voice-scene Halo keeps a narrower outer glow (reference ELLIE_05).
  const haloSize = size * (size >= 120 ? 1.45 : 1.6);
  const stroke = Math.max(1.4, size * 0.03);
  const ringStroke = Math.max(1.2, size * 0.015);
  const r = size / 2 - stroke / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={haloLabel(state)}
      style={[styles.box, { width: size, height: size }, style]}
    >
      {!offline ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.abs,
            {
              width: haloSize,
              height: haloSize,
              left: (size - haloSize) / 2,
              top: (size - haloSize) / 2,
            },
            haloStyle,
          ]}
        >
          <Svg width={haloSize} height={haloSize}>
            <Defs>
              <RadialGradient id="llGlow" cx="50%" cy="50%" r="50%">
                <Stop offset="0.5" stopColor={h.ember} stopOpacity={0} />
                <Stop offset="0.72" stopColor={h.ember} stopOpacity={0.7} />
                <Stop offset="0.84" stopColor={h.ember} stopOpacity={0.2} />
                <Stop offset="1" stopColor={h.ember} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle
              cx={haloSize / 2}
              cy={haloSize / 2}
              r={haloSize / 2}
              fill="url(#llGlow)"
            />
          </Svg>
        </Animated.View>
      ) : null}

      {[rip0Style, rip1Style].map((rs, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={[
            styles.abs,
            styles.fill,
            { borderRadius: size / 2, borderWidth: 1.25, borderColor: h.ember },
            rs,
          ]}
        />
      ))}

      {lit && !offline ? (
        <Svg
          pointerEvents="none"
          width={size * 1.6}
          height={size * 1.6}
          style={[styles.abs, { left: -size * 0.3, top: -size * 0.3 }]}
        >
          <Defs>
            <RadialGradient id="llLitGlow" cx="60%" cy="63%" r="50%">
              <Stop offset="0" stopColor={h.ember} stopOpacity={0.16} />
              <Stop offset="0.5" stopColor={h.ember} stopOpacity={0.07} />
              <Stop offset="1" stopColor={h.ember} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle
            cx={size * 0.8}
            cy={size * 0.8}
            r={size * 0.8}
            fill="url(#llLitGlow)"
          />
        </Svg>
      ) : null}

      <Animated.View style={[styles.fill, wrapStyle, offline && styles.offline]}>
        <Svg width={size} height={size} style={styles.abs}>
          <Defs>
            <RadialGradient id="llCore" cx="50%" cy="44%" r="60%">
              <Stop offset="0" stopColor={h.core[0]} />
              <Stop offset="0.46" stopColor={h.core[1]} />
              <Stop offset="1" stopColor={h.core[2]} />
            </RadialGradient>
            <RadialGradient id="llSheen" cx="34%" cy="26%" r="46%">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.1} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#llCore)" />
          <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#llSheen)" />
          {lit && !offline ? (
            <>
              <Defs>
                <RadialGradient id="llWarm" cx="76%" cy="84%" r="62%">
                  <Stop offset="0" stopColor={h.ember} stopOpacity={0.34} />
                  <Stop offset="0.46" stopColor="#FF6E32" stopOpacity={0.1} />
                  <Stop offset="1" stopColor={h.ember} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={size / 2}
                fill="url(#llWarm)"
              />
            </>
          ) : null}
        </Svg>

        {!offline ? (
          <>
            <Animated.View style={[styles.abs, styles.fill, innerStyle]}>
              <Svg width={size} height={size}>
                <Defs>
                  <RadialGradient id="llInner" cx="50%" cy="50%" r="50%">
                    <Stop offset="0.56" stopColor={h.ember} stopOpacity={0} />
                    <Stop offset="0.86" stopColor={h.ember} stopOpacity={0.32} />
                    <Stop offset="1" stopColor={h.ember} stopOpacity={0.55} />
                  </RadialGradient>
                </Defs>
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={size / 2}
                  fill="url(#llInner)"
                />
              </Svg>
            </Animated.View>

            <Animated.View style={[styles.abs, styles.fill, ringStyle]}>
              <Svg width={size} height={size}>
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  stroke={h.ember}
                  strokeWidth={ringStroke}
                  fill="none"
                />
              </Svg>
            </Animated.View>

            {[
              { s: arcGlowStyle, w: stroke * 4, o: 0.45 },
              { s: arcStyle, w: stroke * 1.4, o: 1 },
            ].map((layer, i) => (
              <Animated.View key={i} style={[styles.abs, styles.fill, layer.s]}>
                <Svg width={size} height={size}>
                  <Defs>
                    <LinearGradient id={`llArc${i}`} x1="0" y1="0" x2="1" y2="0">
                      <Stop offset="0" stopColor={h.ember} stopOpacity={0} />
                      <Stop offset="0.6" stopColor={h.arcHot} stopOpacity={layer.o} />
                      <Stop offset="1" stopColor={h.ember} stopOpacity={0} />
                    </LinearGradient>
                  </Defs>
                  <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    stroke={`url(#llArc${i})`}
                    strokeWidth={layer.w}
                    strokeLinecap="round"
                    strokeDasharray={`${circumference * ARC_SWEEP} ${circumference}`}
                    fill="none"
                  />
                </Svg>
              </Animated.View>
            ))}
          </>
        ) : null}

        <Svg width={size} height={size} style={styles.abs} pointerEvents="none">
          {/* Smoked-glass reflex: a pale crescent hugging the upper-left edge. */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - size * 0.045}
            stroke="#FFFFFF"
            strokeOpacity={0.2}
            strokeWidth={Math.max(1, size * 0.022)}
            strokeLinecap="round"
            strokeDasharray={`${(size - size * 0.09) * Math.PI * 0.2} ${size * Math.PI}`}
            rotation={195}
            origin={`${size / 2}, ${size / 2}`}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 0.5}
            stroke={h.rim}
            strokeWidth={1}
            fill="none"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  fill: { width: '100%', height: '100%' },
  abs: { position: 'absolute' },
  // Offline: no halo, desaturated.
  offline: { opacity: 0.55 },
});
