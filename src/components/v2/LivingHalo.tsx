import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  Ellipse,
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
// chat 24–28, bands 36–56, cover 168) and its three states: idle,
// thinking and offline (the voice states left with the voice mode, B-27).
// All motion is Reanimated on the UI thread (transform/opacity only); the
// SVG layers are static. "Reducir movimiento": no scale, deformation or
// drift — states read through light, Ember and halo only.
export type { LivingHaloState } from '@app/components/v2/livingHaloModel';

export type LivingHaloProps = {
  // pt, or a named size (mini 20, tab 24, chat 28, input 32, band 56,
  // cover 168).
  size?: number | LivingHaloSize;
  state?: LivingHaloState;
  // Tab bar icon: no loops. Inactive = still sphere, no glow; active = soft
  // Ember halo and contour, still.
  tab?: boolean;
  active?: boolean;
  // "Lit" finish (Inicio band): diffuse outer glow and a partial, asymmetric
  // Ember light inside, bottom-right. Static, no extra loops.
  lit?: boolean;
  // Soft diffuse shadow under the sphere (ELLIE cover).
  shadow?: boolean;
  style?: StyleProp<ViewStyle>;
};

const ARC_REST_DEG = 108; // bottom-right
const ARC_SWEEP = 0.3; // fraction of the contour the arc covers

export function LivingHalo({
  size: sizeProp = 64,
  state = 'idle',
  tab = false,
  active = false,
  lit = false,
  shadow = false,
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
    // `target` is a fresh object each render; its fields are listed instead.
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

  const wrapStyle = useAnimatedStyle(() => {
    if (reduceMotion || offline) {
      return { transform: [{ scaleX: 1 }, { scaleY: 1 }] };
    }
    const s = Math.min(1.035, scale.value + 0.012 * br.value * breathAmp.value);
    const d = key === 'thinking' ? 0.012 * Math.sin(phase.value * 2 * Math.PI) : 0;
    return { transform: [{ scaleX: s * (1 + d) }, { scaleY: s * (1 - d) }] };
  });

  const ringStyle = useAnimatedStyle(() => {
    const idleBreath = key === 'idle' && !reduceMotion && !tab ? 0.04 * br.value : 0;
    return { opacity: Math.min(1, ring.value + idleBreath) };
  });

  const arcStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, arc.value) * pulse.value,
    transform: [{ rotate: `${angle.value % 360}deg` }],
  }));
  const arcGlowStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, arc.value) * 0.9 * pulse.value,
    transform: [{ rotate: `${angle.value % 360}deg` }],
  }));

  const innerStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, inner.value),
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: Math.min(0.25, halo.value * 2.2),
  }));

  const h = colors.ellie.halo;
  // Large Halos (cover) keep a narrower outer glow.
  const haloSize = size * (size >= 120 ? 1.45 : 1.6);
  const stroke = Math.max(1.4, size * 0.03);
  const ringStroke = Math.max(1.2, size * 0.02);
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

      {shadow && !offline ? (
        <Svg
          pointerEvents="none"
          width={size * 1.3}
          height={size * 0.3}
          style={[styles.abs, { left: -size * 0.15, top: size * 0.92 }]}
        >
          <Defs>
            <RadialGradient id="llShadow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#000000" stopOpacity={0.26} />
              <Stop offset="1" stopColor="#000000" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx={size * 0.65} cy={size * 0.15} rx={size * 0.65} ry={size * 0.15} fill="url(#llShadow)" />
        </Svg>
      ) : null}

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
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={size >= 100 ? 0.2 : 0.1} />
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
