import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { RefreshCw, Trophy } from 'lucide-react-native';
import { PressableScale, TextV2, useThemeV2 } from '@app/components/v2';
import type { ResultTier } from '@app/features/quiz/quizModel';

// How much the celebration grows with the result (handoff · Resultado: low =
// a review of topics, mid = one ripple, perfect = glow and three ripples).
export const RESULT_FX: Record<ResultTier, { glow: number; bursts: number[] }> = {
  perfect: { glow: 0.34, bursts: [600, 900, 1200] },
  mid: { glow: 0.18, bursts: [900] },
  low: { glow: 0.06, bursts: [] },
};

function Burst({ delay }: { delay: number }) {
  const { colors } = useThemeV2();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration: 1500 }));
  }, [delay, progress]);

  const animated = useAnimatedStyle(() => ({
    opacity: progress.value === 0 ? 0 : 0.9 * (1 - progress.value),
    transform: [{ scale: 0.5 + progress.value * 1.9 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.burst, { borderColor: colors.ember.base }, animated]}
    />
  );
}

// Glow and ripples behind the score ring.
export function ResultFx({ tier }: { tier: ResultTier }) {
  const fx = RESULT_FX[tier];
  const halo = useSharedValue(1);

  useEffect(() => {
    halo.value = withSequence(withTiming(1.06, { duration: 1800 }), withTiming(1, { duration: 1800 }));
  }, [halo]);

  const haloStyle = useAnimatedStyle(() => ({ transform: [{ scale: halo.value }] }));

  return (
    <View pointerEvents="none" style={styles.fx}>
      <Animated.View
        style={[
          styles.halo,
          { backgroundColor: `rgba(255,91,31,${fx.glow * 0.45})`, boxShadow: `0 0 120px 60px rgba(255,91,31,${fx.glow * 0.5})` },
          haloStyle,
        ]}
      />
      {fx.bursts.map(delay => (
        <Burst key={delay} delay={delay} />
      ))}
    </View>
  );
}

// "NUEVO RÉCORD": pops in after the ring has filled.
export function RecordPill() {
  const { colors } = useThemeV2();
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(1200, withSpring(1, { damping: 7 }));
  }, [scale]);

  const animated = useAnimatedStyle(() => ({
    opacity: scale.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      accessible
      accessibilityLabel="Nuevo récord"
      style={[styles.record, { backgroundColor: colors.ember.base }, animated]}
    >
      <Trophy size={13} color={colors.ember.onText} strokeWidth={2.4} />
      <TextV2 variant="captionStrong" color={colors.ember.onText} style={styles.recordText}>
        NUEVO RÉCORD
      </TextV2>
    </Animated.View>
  );
}

// One figure of the trio (puntos · mejor racha · total).
export function ResultStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${value} ${label}`}>
      <TextV2 variant="title22" color="#FFFFFF">
        {value}
      </TextV2>
      <TextV2 variant="micro" color="#8C8A85" style={styles.statLabel}>
        {label}
      </TextV2>
    </View>
  );
}

// "Repasemos esto": the questions that were missed.
export function ReviewList({ items }: { items: string[] }) {
  return (
    <Animated.View entering={FadeInDown.delay(650).duration(400)} style={styles.review}>
      <TextV2 variant="eyebrow" color="#8C8A85">
        Repasemos esto
      </TextV2>
      {items.map((item, index) => (
        <View key={index} style={styles.reviewItem}>
          <TextV2 variant="body" color="#D8D6D1" numberOfLines={2}>
            {item}
          </TextV2>
        </View>
      ))}
    </Animated.View>
  );
}

// Saving / failed / reward-pending line above the buttons.
export function SaveStatus({
  kind,
  onRetry,
}: {
  kind: 'saving' | 'error' | 'reward';
  onRetry?: () => void;
}) {
  const { colors } = useThemeV2();
  const text =
    kind === 'saving'
      ? 'Guardando tu ronda…'
      : kind === 'error'
      ? 'No pudimos guardar tu ronda. Revisa tu conexión.'
      : 'Tu ronda se guardó, pero los puntos tardan en llegar.';

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.status,
        kind === 'error' && { backgroundColor: 'rgba(255,91,31,.14)' },
      ]}
    >
      <TextV2
        variant="meta"
        color={kind === 'error' ? colors.ember.textOnDark : '#A8A6A1'}
        style={styles.statusText}
      >
        {text}
      </TextV2>
      {kind !== 'saving' && onRetry ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Reintentar"
          hitSlop={10}
          onPress={onRetry}
          style={styles.retry}
        >
          <RefreshCw size={14} color="#FFFFFF" strokeWidth={2} />
          <TextV2 variant="metaStrong" color="#FFFFFF">
            Reintentar
          </TextV2>
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fx: { position: 'absolute', left: 0, right: 0, top: 250 - 105, alignItems: 'center' },
  halo: { position: 'absolute', top: 0, width: 210, height: 210, borderRadius: 105 },
  burst: {
    position: 'absolute',
    top: 0,
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 2,
  },
  record: {
    height: 28,
    paddingHorizontal: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recordText: { fontWeight: '700', letterSpacing: 0.72 },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 11, lineHeight: 14 },
  review: { alignSelf: 'stretch', gap: 6, marginTop: 6 },
  reviewItem: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,.06)',
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,.06)',
  },
  statusText: { flex: 1 },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
