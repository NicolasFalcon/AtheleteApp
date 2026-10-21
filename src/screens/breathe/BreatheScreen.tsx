import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type EasingFunction,
  type EasingFunctionFactory,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { X } from 'lucide-react-native';
import { PressableScale, StatusBarV2, TextV2 } from '@app/components/v2';
import { ROOT_ROUTES, TAB_ROUTES } from '@app/constants/routes';
import { startAmbient, stopAmbient } from '@app/features/sound/soundService';
import { sleepKeys } from '@app/hooks/useSleep';
import { useAuth } from '@app/hooks/useAuth';
import { getLocalDateKey } from '@app/lib/date';
import { useFeedbackPrefs } from '@app/lib/feedbackPrefs';
import { safeGoBack } from '@app/navigation/safeGoBack';
import { sleepService } from '@app/services/sleep/sleepService';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'Breathe'>;
type Stage = 'intro' | 'run' | 'done';
type Phase = 'in' | 'hold' | 'out';

// Respira (handoff v2.15 §25.3 · BREATHE_01–05): one minute, 5 cycles of
// inhale 4 s · hold 2 s · exhale 6 s, guided by a mass of Recovery Blue light.
// Only a session that reaches 60 s counts (log_breathing_session). Ambient
// sound (§25.8) with its fades, if Ajustes · Sonidos is on; the screen stays
// awake while it runs. A dark scene in both themes.
const TOTAL_S = 60;
const CYCLE: [Phase, number][] = [['in', 4], ['hold', 2], ['out', 6]];
const WORDS: Record<Phase, string> = { in: 'INHALA', hold: 'MANTÉN', out: 'EXHALA' };
const KEEP_AWAKE_TAG = 'athelete-breathe';
const C = {
  bg: '#06080B',
  white: '#FFFFFF',
  text: '#F2F0EC',
  soft: '#AEB8C4',
  timer: '#6F7C8B',
  recovery: '#6E8FB3',
  recoveryLight: '#9DB5CF',
  dust: '#C9D8E8',
};

// Orb target per state: scale, seconds, opacity, easing, ring, top (%).
const ORB: Record<Stage | Phase, { scale: number; dur: number; opacity: number; easing: EasingFunction | EasingFunctionFactory; ring: number; top: number }> = {
  intro: { scale: 0.42, dur: 3, opacity: 0.62, easing: Easing.inOut(Easing.ease), ring: 0, top: 44 },
  in: { scale: 1, dur: 4, opacity: 1, easing: Easing.bezier(0.45, 0, 0.35, 1), ring: 0, top: 40 },
  hold: { scale: 1.02, dur: 2, opacity: 1, easing: Easing.inOut(Easing.ease), ring: 1, top: 40 },
  out: { scale: 0.44, dur: 6, opacity: 0.55, easing: Easing.bezier(0.4, 0, 0.3, 1), ring: 0, top: 40 },
  done: { scale: 0.62, dur: 2.4, opacity: 0.7, easing: Easing.bezier(0.2, 0.8, 0.2, 1), ring: 0, top: 36 },
  run: { scale: 1, dur: 4, opacity: 1, easing: Easing.inOut(Easing.ease), ring: 0, top: 40 },
};

function phaseAt(elapsed: number): Phase {
  let t = elapsed % 12;
  for (const [phase, seconds] of CYCLE) {
    if (t < seconds) {
      return phase;
    }
    t -= seconds;
  }
  return 'out';
}

// The same 16 particles every time (the prototype's seeded values).
const DUST = Array.from({ length: 16 }, (_, i) => {
  const r = (n: number) => {
    const x = Math.sin(i * 91.7 + n * 13.3) * 43758.5;
    return x - Math.floor(x);
  };
  return { x: r(1) * 100, y: r(2) * 100, size: 1 + r(3) * 1.6, opacity: 0.12 + r(4) * 0.22, seconds: 16 + r(5) * 14 };
});

type KeepAwake = { activate?: (tag: string) => Promise<unknown>; deactivate?: (tag: string) => Promise<unknown> };
const keepAwake = requireOptionalNativeModule<KeepAwake>('ExpoKeepAwake');

export function BreatheScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const prefs = useFeedbackPrefs();
  const [stage, setStage] = useState<Stage>('intro');
  const [phase, setPhase] = useState<Phase | null>(null);
  const [left, setLeft] = useState(TOTAL_S);
  const [sound, setSound] = useState(true);
  const startedAt = useRef<number | null>(null);
  const logged = useRef(false);
  const soundOn = prefs.sound && sound;

  // ── Orb ─────────────────────────────────────────────────────────────────
  const scale = useSharedValue(ORB.intro.scale);
  const opacity = useSharedValue(ORB.intro.opacity);
  const ring = useSharedValue(0);
  const top = useSharedValue(ORB.intro.top);
  const spinA = useSharedValue(0);
  const spinB = useSharedValue(0);

  const target = ORB[phase ?? stage];
  useEffect(() => {
    const config = { duration: target.dur * 1000, easing: target.easing };
    scale.value = withTiming(target.scale, config);
    opacity.value = withTiming(target.opacity, { duration: target.dur * 1000 });
    ring.value = withTiming(target.ring, { duration: 800 });
    top.value = withTiming(target.top, { duration: 1200, easing: Easing.bezier(0.4, 0, 0.2, 1) });
  }, [opacity, ring, scale, target, top]);

  // Two lobes turning (19 s and 27 s, the second backwards); none under
  // "Reducir movimiento".
  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(spinA);
      cancelAnimation(spinB);
      return undefined;
    }
    spinA.value = withRepeat(withTiming(360, { duration: 19000, easing: Easing.linear }), -1, false);
    spinB.value = withRepeat(withTiming(-360, { duration: 27000, easing: Easing.linear }), -1, false);
    return () => {
      cancelAnimation(spinA);
      cancelAnimation(spinB);
    };
  }, [reduceMotion, spinA, spinB]);

  const mass = Math.max(width, 600);
  const orbStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: (top.value / 100) * height - mass / 2 }, { scale: scale.value }],
  }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: ring.value }));
  const lobeA = useAnimatedStyle(() => ({ transform: [{ rotate: `${spinA.value}deg` }] }));
  const lobeB = useAnimatedStyle(() => ({ transform: [{ rotate: `${spinB.value}deg` }] }));

  // ── Session clock ───────────────────────────────────────────────────────
  const finish = useCallback(() => {
    stopAmbient();
    keepAwake?.deactivate?.(KEEP_AWAKE_TAG)?.catch(() => undefined);
    setStage('done');
    setPhase(null);
    if (logged.current) {
      return;
    }
    logged.current = true;
    // Only a full minute counts.
    sleepService
      .logBreathingSession(TOTAL_S)
      .then(week => {
        queryClient.setQueryData(sleepKeys.breathing(profile?.id, getLocalDateKey()), {
          weekStart: week.weekStart,
          weekCount: week.weekCount,
        });
      })
      .catch(() => undefined)
      .finally(() => {
        queryClient.invalidateQueries({ queryKey: sleepKeys.all }).catch(() => undefined);
      });
  }, [profile?.id, queryClient]);

  useEffect(() => {
    if (stage !== 'run') {
      return undefined;
    }
    const id = setInterval(() => {
      const elapsed = (Date.now() - (startedAt.current ?? Date.now())) / 1000;
      if (elapsed >= TOTAL_S) {
        clearInterval(id);
        finish();
        return;
      }
      setPhase(current => {
        const next = phaseAt(elapsed);
        return current === next ? current : next;
      });
      setLeft(Math.max(0, Math.ceil(TOTAL_S - elapsed)));
    }, 200);
    return () => clearInterval(id);
  }, [finish, stage]);

  // Leaving at any moment: no record, sound and screen-awake off.
  useEffect(
    () => () => {
      stopAmbient();
      keepAwake?.deactivate?.(KEEP_AWAKE_TAG)?.catch(() => undefined);
    },
    [],
  );

  const start = () => {
    startedAt.current = Date.now();
    logged.current = false;
    setLeft(TOTAL_S);
    setPhase('in');
    setStage('run');
    keepAwake?.activate?.(KEEP_AWAKE_TAG)?.catch(() => undefined);
    if (soundOn) {
      startAmbient();
    }
  };

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    if (next && prefs.sound) {
      startAmbient();
    } else {
      stopAmbient();
    }
  };

  const close = () => {
    stopAmbient();
    safeGoBack(navigation, [ROOT_ROUTES.MainTabs]);
  };

  const timer = `00:${String(left).padStart(2, '0')}`;
  const dust = useMemo(() => DUST, []);

  return (
    <View style={styles.screen}>
      <StatusBarV2 style="light" />
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id="brBg" cx="50%" cy="40%" rx="120%" ry="70%">
            <Stop offset="0" stopColor="#0E1520" />
            <Stop offset="0.55" stopColor="#080B10" />
            <Stop offset="1" stopColor="#05070A" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#brBg)" />
      </Svg>

      {dust.map((particle, i) => (
        <Dust key={i} {...particle} still={reduceMotion} />
      ))}

      <Animated.View
        pointerEvents="none"
        style={[styles.mass, { width: mass, height: mass, left: (width - mass) / 2 }, orbStyle]}
      >
        <Svg width={mass} height={mass} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={C.recovery} stopOpacity={0.3} />
              <Stop offset="0.38" stopColor={C.recovery} stopOpacity={0.1} />
              <Stop offset="0.66" stopColor={C.recovery} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="core" cx="50%" cy="44%" r="50%">
              <Stop offset="0" stopColor="#F4F7FA" />
              <Stop offset="0.14" stopColor="#C6D6E6" />
              <Stop offset="0.34" stopColor="#8FAACA" />
              <Stop offset="0.56" stopColor={C.recovery} stopOpacity={0.55} />
              <Stop offset="0.72" stopColor={C.recovery} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={mass / 2} cy={mass / 2} r={mass / 2} fill="url(#glow)" />
          <Circle cx={mass / 2} cy={mass / 2} r={mass / 2 - mass * 0.297} fill="url(#core)" />
        </Svg>
        <Animated.View style={[StyleSheet.absoluteFill, lobeA]}>
          <Svg width={mass} height={mass}>
            <Defs>
              <RadialGradient id="lobeA" cx="40%" cy="40%" r="50%">
                <Stop offset="0" stopColor={C.recoveryLight} stopOpacity={0.55} />
                <Stop offset="0.7" stopColor={C.recovery} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Ellipse cx={mass / 2} cy={mass / 2} rx={mass * 0.25} ry={mass * 0.23} fill="url(#lobeA)" />
          </Svg>
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, lobeB]}>
          <Svg width={mass} height={mass}>
            <Defs>
              <RadialGradient id="lobeB" cx="60%" cy="58%" r="50%">
                <Stop offset="0" stopColor={C.recovery} stopOpacity={0.6} />
                <Stop offset="0.7" stopColor={C.recovery} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Ellipse cx={mass / 2} cy={mass / 2} rx={mass * 0.23} ry={mass * 0.25} fill="url(#lobeB)" />
          </Svg>
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, ringStyle]}>
          <Svg width={mass} height={mass}>
            <Circle
              cx={mass / 2}
              cy={mass / 2}
              r={mass / 2 - mass * 0.283}
              stroke="rgba(220,232,244,.5)"
              strokeWidth={1}
              fill="none"
            />
          </Svg>
        </Animated.View>
      </Animated.View>

      <View style={[styles.top, { top: insets.top + 14 }]}>
        <PressableScale accessibilityRole="button" accessibilityLabel="Cerrar" onPress={close} style={styles.round}>
          <X size={18} color={C.white} strokeWidth={2} style={styles.dim} />
        </PressableScale>
        {stage === 'run' && prefs.sound ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={sound ? 'Desactivar sonido ambiente' : 'Activar sonido ambiente'}
            onPress={toggleSound}
            style={styles.soundPill}
          >
            <View style={styles.soundBars}>
              {(sound ? [6, 11, 8] : [2, 2, 2]).map((h, i) => (
                <View key={i} style={[styles.soundBar, { height: h }]} />
              ))}
            </View>
            <TextV2 variant="captionStrong" color={C.recoveryLight} style={styles.soundText}>
              {sound ? 'SONIDO' : 'SILENCIO'}
            </TextV2>
          </PressableScale>
        ) : null}
      </View>

      {stage === 'intro' ? (
        <View style={[styles.bottom, { bottom: insets.bottom + 48 }]}>
          <View style={styles.eyebrowRow}>
            <View style={styles.eyebrowDot} />
            <TextV2 variant="eyebrow" color={C.recoveryLight}>
              Respira · 60 s
            </TextV2>
          </View>
          <TextV2 color={C.white} style={styles.introTitle}>
            {'UN MOMENTO\nPARA TI.'}
          </TextV2>
          <TextV2 color={C.soft} style={styles.lead}>
            Baja el ritmo. Respira.
          </TextV2>
          <PressableScale accessibilityRole="button" onPress={start} style={styles.whiteButton}>
            <TextV2 variant="cta" color="#0B0E12" style={styles.whiteLabel}>
              Comenzar
            </TextV2>
          </PressableScale>
        </View>
      ) : null}

      {stage === 'run' ? (
        <View style={[styles.runBottom, { bottom: insets.bottom + 84 }]} accessibilityLiveRegion="polite">
          <View style={styles.words}>
            {(['in', 'hold', 'out'] as const).map(key => (
              <PhaseWord key={key} word={WORDS[key]} on={phase === key} />
            ))}
          </View>
          <TextV2 color={C.timer} style={styles.timer}>
            {timer}
          </TextV2>
        </View>
      ) : null}

      {stage === 'done' ? (
        <View style={[styles.bottom, { bottom: insets.bottom + 48 }]}>
          <TextV2 color={C.white} style={styles.doneTitle}>
            LISTO.
          </TextV2>
          <TextV2 color={C.soft} style={styles.lead}>
            Lleva esa calma contigo.
          </TextV2>
          <PressableScale
            accessibilityRole="button"
            onPress={() => navigation.navigate(ROOT_ROUTES.MainTabs, { screen: TAB_ROUTES.Home })}
            style={styles.whiteButton}
          >
            <TextV2 variant="cta" color="#0B0E12" style={styles.whiteLabel}>
              Volver a Inicio
            </TextV2>
          </PressableScale>
        </View>
      ) : null}
    </View>
  );
}

// INHALA · MANTÉN · EXHALA: fade and an 8 pt rise in 0.7 s.
function PhaseWord({ word, on }: { word: string; on: boolean }) {
  const progress = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(on ? 1 : 0, { duration: 700, easing: Easing.bezier(0.2, 0.9, 0.25, 1) });
  }, [on, progress]);
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: 8 * (1 - progress.value) }],
  }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <TextV2 color={C.white} align="center" style={styles.word}>
        {word}
      </TextV2>
    </Animated.View>
  );
}

function Dust({ x, y, size, opacity, seconds, still }: (typeof DUST)[number] & { still: boolean }) {
  const drift = useSharedValue(0);
  useEffect(() => {
    if (still) {
      return undefined;
    }
    drift.value = withRepeat(withTiming(1, { duration: seconds * 1000, easing: Easing.linear }), -1, true);
    return () => cancelAnimation(drift);
  }, [drift, seconds, still]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -40 * drift.value }] }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.dust,
        { left: `${x}%`, top: `${y}%`, width: size, height: size, borderRadius: size / 2, opacity },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg, overflow: 'hidden' },
  dim: { opacity: 0.85 },
  dust: { position: 'absolute', backgroundColor: C.dust },
  mass: { position: 'absolute', top: 0 },
  top: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundPill: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  soundBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 12 },
  soundBar: { width: 2, borderRadius: 1, backgroundColor: C.recoveryLight },
  soundText: { fontSize: 12, letterSpacing: 0.72 },
  bottom: { position: 'absolute', left: 24, right: 24, gap: 14, zIndex: 2 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  eyebrowDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.recovery },
  introTitle: { fontSize: 56, lineHeight: 50, fontWeight: '800', letterSpacing: -3.08 },
  doneTitle: { fontSize: 96, lineHeight: 80, fontWeight: '800', letterSpacing: -6.24 },
  lead: { fontSize: 17, lineHeight: 24 },
  whiteButton: {
    marginTop: 14,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whiteLabel: { fontSize: 16, fontWeight: '700' },
  runBottom: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 14, zIndex: 2 },
  words: { height: 44, alignSelf: 'stretch' },
  word: { fontSize: 40, lineHeight: 44, fontWeight: '800', letterSpacing: -1.2 },
  timer: { fontSize: 15, fontWeight: '600', letterSpacing: 0.6 },
});
