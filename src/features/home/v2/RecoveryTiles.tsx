import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { ArrowRight, Moon } from 'lucide-react-native';
import { PressableScale, TextV2 } from '@app/components/v2';
import {
  LOAD_WORDS,
  QUALITY_WORDS,
  hoursLabel,
  isRecent,
  type SleepOverview,
} from '@app/features/sleep/sleepModel';

// Inicio · Sueño + Respira (handoff v2.15 §25.5, HOME_19–20): two dark tiles
// in both themes, from the same reads as their screens (get_sleep_overview,
// get_breathing_week), so the figures always match. The quality dot is
// Recovery Blue (the prototype's green is out of the palette, 25.10.5).
const C = {
  plate: '#0D1015',
  plateDeep: '#080A0E',
  white: '#FFFFFF',
  soft: '#C9D3DE',
  recovery: '#6E8FB3',
  recoveryLight: '#9DB5CF',
};

export function sleepTileLine(overview: SleepOverview | null): { value: string; note: string } | null {
  const night = overview?.lastNight;
  if (!overview || !night || !isRecent(night.nightDate, overview.date)) {
    return null;
  }
  const value = hoursLabel(night.durationMin, true);
  if (night.source === 'apple_health') {
    return {
      value,
      note: overview.recovery ? `Recuperación ${LOAD_WORDS[overview.recovery.level].toLowerCase()}` : 'Anoche',
    };
  }
  return { value, note: night.quality ? `${QUALITY_WORDS[night.quality - 1]} calidad` : 'Anoche' };
}

export function RecoveryTiles({
  sleep,
  breathingCount,
  onSleep,
  onBreathe,
}: {
  sleep: SleepOverview | null;
  breathingCount: number | null;
  onSleep: () => void;
  onBreathe: () => void;
}) {
  const line = sleepTileLine(sleep);
  return (
    <View style={styles.grid}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={line ? `Sueño: ${line.value}, ${line.note}` : '¿Cómo dormiste?'}
        onPress={onSleep}
        style={[styles.tile, { backgroundColor: C.plate }]}
      >
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <RadialGradient id="sleepTile" cx="100%" cy="0%" rx="110%" ry="90%">
              <Stop offset="0" stopColor={C.recovery} stopOpacity={0.22} />
              <Stop offset="0.6" stopColor={C.recovery} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#sleepTile)" />
        </Svg>
        <View style={styles.inner}>
          <Moon size={13} color={C.white} strokeWidth={2} style={styles.dim} />
          <View style={styles.foot}>
            {line ? (
              <View style={styles.gap5}>
                <TextV2 color={C.white} style={styles.sleepValue}>
                  {line.value}
                </TextV2>
                <View style={styles.noteRow}>
                  <View style={styles.dot} />
                  <TextV2 variant="caption" color={C.soft} numberOfLines={1}>
                    {line.note}
                  </TextV2>
                </View>
              </View>
            ) : (
              <TextV2 color={C.white} style={styles.ask}>
                {'¿CÓMO\nDORMISTE?'}
              </TextV2>
            )}
            <Arrow />
          </View>
        </View>
      </PressableScale>

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={
          breathingCount ? `Respira: ${breathingCount} esta semana` : 'Respira. Un minuto para ti.'
        }
        onPress={onBreathe}
        style={[styles.tile, { backgroundColor: C.plateDeep }]}
      >
        <BreathingGlow />
        <View style={styles.inner}>
          <View style={styles.eyebrow}>
            <Svg width={12} height={8} viewBox="0 0 20 12">
              <Path d="M1 7c2-4 4-4 6 0s4 4 6 0 4-4 6 0" stroke={C.recoveryLight} strokeWidth={1.8} strokeLinecap="round" fill="none" />
            </Svg>
            <TextV2 color={C.recoveryLight} style={styles.eyebrowText}>
              RECUPERACIÓN · 1 MIN
            </TextV2>
          </View>
          <View style={styles.foot}>
            {breathingCount ? (
              <View style={styles.gap4}>
                <TextV2 color={C.white} style={styles.usedValue}>
                  {`${breathingCount} ${breathingCount === 1 ? 'sesión' : 'sesiones'}`}
                </TextV2>
                <TextV2 variant="caption" color={C.soft}>
                  esta semana
                </TextV2>
              </View>
            ) : (
              <View style={styles.gap4}>
                <TextV2 color={C.white} style={styles.breatheValue}>
                  Respira
                </TextV2>
                <TextV2 color={C.soft} style={styles.fs11}>
                  Un minuto para ti.
                </TextV2>
              </View>
            )}
            <Arrow />
          </View>
        </View>
      </PressableScale>
    </View>
  );
}

function Arrow() {
  return (
    <View style={styles.arrow}>
      <ArrowRight size={16} color={C.white} strokeWidth={2} />
    </View>
  );
}

// The glow that breathes (12 s), top right; still under "Reducir movimiento".
function BreathingGlow() {
  const reduceMotion = useReducedMotion();
  const breath = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) {
      return undefined;
    }
    breath.value = withRepeat(withTiming(1, { duration: 6000, easing: Easing.inOut(Easing.ease) }), -1, true);
    return () => cancelAnimation(breath);
  }, [breath, reduceMotion]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 0.92 + 0.16 * breath.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[styles.glow, style]}>
      <Svg width={170} height={170}>
        <Defs>
          <RadialGradient id="brGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={C.recovery} stopOpacity={0.34} />
            <Stop offset="0.42" stopColor={C.recovery} stopOpacity={0.08} />
            <Stop offset="0.68" stopColor={C.recovery} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="brCore" cx="46%" cy="44%" r="50%">
            <Stop offset="0" stopColor="#E8EEF5" stopOpacity={0.75} />
            <Stop offset="0.14" stopColor="#B7CADF" stopOpacity={0.75} />
            <Stop offset="0.34" stopColor="#8FAACA" stopOpacity={0.6} />
            <Stop offset="0.56" stopColor={C.recovery} stopOpacity={0.3} />
            <Stop offset="0.72" stopColor={C.recovery} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={85} cy={85} r={85} fill="url(#brGlow)" />
        <Circle cx={85} cy={85} r={41} fill="url(#brCore)" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 10 },
  tile: {
    flex: 1,
    height: 132,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.08)',
    boxShadow: '0 12px 28px rgba(0,0,0,.14)',
  },
  inner: { flex: 1, margin: 14, justifyContent: 'space-between' },
  dim: { opacity: 0.75 },
  foot: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
  gap4: { gap: 4, flexShrink: 1 },
  gap5: { gap: 5, flexShrink: 1 },
  sleepValue: { fontSize: 22, lineHeight: 22, fontWeight: '700', letterSpacing: -0.66 },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.recovery },
  ask: { fontSize: 18, lineHeight: 18, fontWeight: '800', letterSpacing: -0.36 },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  eyebrowText: { fontSize: 9.5, fontWeight: '600', letterSpacing: 0.38 },
  breatheValue: { fontSize: 20, lineHeight: 20, fontWeight: '700', letterSpacing: -0.4 },
  usedValue: { fontSize: 17, lineHeight: 17, fontWeight: '700', letterSpacing: -0.34 },
  fs11: { fontSize: 11 },
  arrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: { position: 'absolute', right: -72, top: -28 },
});
