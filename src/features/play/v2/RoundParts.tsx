import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { Check, Flame, X } from 'lucide-react-native';
import { ANSWER_GREEN, ANSWER_RED, Button, TextV2 } from '@app/components/v2';
import { isUrgent, secondsLeft, streakMultiplier } from '@app/features/play/playModel';

const EMBER = '#FF5B1F';

// "Pregunta N de 10" with the seconds on the right and the 4 pt bar under it;
// in the last 5 s the figure turns Ember and the bar glows (no glow once
// answered).
export function QuestionClock({
  label,
  remainingMs,
  durationMs,
  answered,
}: {
  label: string;
  remainingMs: number;
  durationMs: number;
  answered: boolean;
}) {
  const urgent = isUrgent(remainingMs);
  const seconds = secondsLeft(remainingMs);

  return (
    <View style={styles.clock}>
      <View style={styles.clockRow}>
        <TextV2 variant="label" color="#D8D6D1" style={styles.counter}>
          {label}
        </TextV2>
        <TextV2
          variant="bodyStrong"
          color={urgent ? EMBER : '#FFFFFF'}
          style={styles.seconds}
          accessibilityLabel={`Quedan ${seconds} segundos`}
        >
          {`${seconds} s`}
        </TextV2>
      </View>
      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: durationMs / 1000, now: seconds }}
      >
        <View
          style={[
            styles.fill,
            urgent && !answered ? styles.fillGlow : null,
            { width: `${(remainingMs / durationMs) * 100}%` },
          ]}
        />
      </View>
    </View>
  );
}

// Streak chip: the count while it builds, "×2" / "×3" in Ember once on.
export function StreakChip({ streak }: { streak: number }) {
  const hot = streak >= 3;
  const scale = useSharedValue(1);

  useEffect(() => {
    if (hot) {
      scale.value = withSequence(withTiming(1.12, { duration: 150 }), withTiming(1, { duration: 300 }));
    }
  }, [hot, scale, streak]);

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      accessible
      accessibilityLabel={hot ? `Racha de ${streak}, puntos por ${streakMultiplier(streak)}` : `Racha de ${streak}`}
      style={[styles.chip, { backgroundColor: hot ? EMBER : 'rgba(255,255,255,.08)' }, animated]}
    >
      <Flame size={15} color={hot ? '#111111' : '#FFFFFF'} strokeWidth={2.2} />
      <TextV2 variant="bodyStrong" color={hot ? '#111111' : '#FFFFFF'} style={styles.chipText}>
        {hot ? `×${streakMultiplier(streak)}` : String(streak)}
      </TextV2>
    </Animated.View>
  );
}

// "+30": rises and fades after a hit. `trigger` changes with every hit.
export function FloatingPoints({ points, trigger }: { points: number; trigger: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, { duration: 1100, easing: Easing.bezier(0.2, 0.8, 0.2, 1) });
  }, [progress, trigger]);

  const animated = useAnimatedStyle(() => ({
    opacity: progress.value < 0.15 ? progress.value / 0.15 : 1 - (progress.value - 0.15) / 0.85,
    transform: [{ translateY: -progress.value * 70 }],
  }));

  return (
    <View pointerEvents="none" style={styles.floatWrap}>
      <Animated.View style={animated}>
        <TextV2 variant="displayS" color={EMBER} style={styles.floatText} accessibilityElementsHidden>
          {`+${points}`}
        </TextV2>
      </Animated.View>
    </View>
  );
}

// Inline card under the options once answered (Quiz.dc.html · fb): green with
// the points (and ×N) on a hit; red with the right answer on a miss.
export function FeedbackCard({
  correct,
  title,
  points,
  multiplier,
  correctMark,
  correctText,
  explanation,
}: {
  correct: boolean;
  title: string;
  points: number;
  multiplier: number;
  correctMark: string;
  correctText: string;
  explanation: string | null;
}) {
  const tint = correct ? ANSWER_GREEN : ANSWER_RED;

  return (
    <Animated.View
      entering={FadeInDown.duration(320).delay(80)}
      accessibilityLiveRegion="polite"
      style={[
        styles.feedback,
        {
          backgroundColor: correct ? 'rgba(47,210,122,.08)' : 'rgba(255,77,79,.08)',
          boxShadow: `inset 0 0 0 1px ${correct ? 'rgba(47,210,122,.35)' : 'rgba(255,77,79,.35)'}`,
        },
      ]}
    >
      <View style={styles.feedbackHead}>
        <View style={styles.feedbackTitle}>
          <Animated.View entering={ZoomIn.duration(400)} style={[styles.dot, { backgroundColor: tint }]}>
            {correct ? (
              <Check size={17} color="#0B1A11" strokeWidth={3} />
            ) : (
              <X size={17} color="#FFFFFF" strokeWidth={3} />
            )}
          </Animated.View>
          <TextV2 variant="section" color="#FFFFFF" style={styles.bold}>
            {title}
          </TextV2>
        </View>
        {correct ? (
          <Animated.View entering={ZoomIn.duration(450).delay(100)} style={styles.points}>
            <TextV2 variant="sub" color={EMBER} style={styles.bold}>
              {`+${points} pts`}
            </TextV2>
            {multiplier > 1 ? (
              <View style={styles.mult}>
                <TextV2 variant="captionStrong" color="#111111" style={styles.bold}>
                  {`×${multiplier}`}
                </TextV2>
              </View>
            ) : null}
          </Animated.View>
        ) : null}
      </View>
      {!correct ? (
        <TextV2 variant="bodyStrong" color="#FF7A7C">
          {`Respuesta correcta: ${correctMark} · `}
          <TextV2 variant="bodyStrong" color="#FFFFFF">
            {correctText}
          </TextV2>
        </TextV2>
      ) : null}
      {explanation ? (
        <TextV2 variant="body" color="#C9C7C2">
          {explanation}
        </TextV2>
      ) : null}
    </Animated.View>
  );
}

// Loading, failed or dropped round on the dark scene.
export function RoundMessage({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.message}>
      <TextV2 variant="sub" color="#FFFFFF" align="center" accessibilityRole="header">
        {title}
      </TextV2>
      {message ? (
        <TextV2 variant="body" color="#A8A6A1" align="center">
          {message}
        </TextV2>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} variant="onScene" onPress={onAction} fullWidth />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  clock: { paddingHorizontal: 20, paddingTop: 18, gap: 10 },
  clockRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  counter: { fontWeight: '500' },
  seconds: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  track: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,.1)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2, backgroundColor: EMBER },
  fillGlow: { boxShadow: '0 0 12px rgba(255,91,31,.6)' },
  chip: {
    height: 38,
    minWidth: 58,
    paddingHorizontal: 11,
    borderRadius: 19,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  chipText: { fontWeight: '700' },
  floatWrap: { position: 'absolute', left: 0, right: 0, top: '44%', alignItems: 'center', zIndex: 4 },
  floatText: { fontSize: 46, fontWeight: '700', textShadowColor: 'rgba(255,91,31,.5)', textShadowRadius: 30 },
  feedback: { marginTop: 6, padding: 16, borderRadius: 20, gap: 10 },
  feedbackHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  feedbackTitle: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  dot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  bold: { fontWeight: '700' },
  points: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mult: { height: 22, paddingHorizontal: 7, borderRadius: 11, backgroundColor: EMBER, justifyContent: 'center' },
  message: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, gap: 14 },
});
