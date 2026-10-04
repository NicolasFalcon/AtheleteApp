import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Flame, X } from 'lucide-react-native';
import {
  Button,
  PressableScale,
  TextV2,
  useThemeV2,
} from '@app/components/v2';
import { streakMultiplier } from '@app/features/quiz/quizModel';

// Streak chip: the count while it builds, "×2" / "×3" in Ember once it is on.
export function StreakChip({ streak }: { streak: number }) {
  const { colors } = useThemeV2();
  const hot = streak >= 3;
  const ink = colors.ember.onText;
  const scale = useSharedValue(1);

  useEffect(() => {
    if (hot) {
      scale.value = withSequence(
        withTiming(1.12, { duration: 150 }),
        withTiming(1, { duration: 300 }),
      );
    }
  }, [hot, scale, streak]);

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View
      accessible
      accessibilityLabel={
        hot ? `Racha de ${streak}, puntos por ${streakMultiplier(streak)}` : `Racha de ${streak}`
      }
      style={[
        styles.chip,
        { backgroundColor: hot ? colors.ember.base : 'rgba(255,255,255,.08)' },
        animated,
      ]}
    >
      <Flame
        size={15}
        color={hot ? ink : 'rgba(255,255,255,.5)'}
        strokeWidth={2.2}
      />
      <TextV2 variant="label" color={hot ? ink : '#8C8A85'} style={styles.chipText}>
        {hot ? `×${streakMultiplier(streak)}` : String(streak)}
      </TextV2>
    </Animated.View>
  );
}

// "+30": rises and fades over the question after a hit (handoff · Quiz
// correct). `trigger` changes with every hit so it replays.
export function FloatingPoints({ points, trigger }: { points: number; trigger: number }) {
  const { colors } = useThemeV2();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: 1100,
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
    });
  }, [progress, trigger]);

  const animated = useAnimatedStyle(() => ({
    opacity: progress.value < 0.15 ? progress.value / 0.15 : 1 - (progress.value - 0.15) / 0.85,
    transform: [{ translateY: -progress.value * 70 }],
  }));

  return (
    <View pointerEvents="none" style={styles.floatWrap}>
      <Animated.View style={animated}>
        <TextV2
          variant="displayS"
          color={colors.ember.base}
          style={styles.floatText}
          accessibilityElementsHidden
        >
          {`+${points}`}
        </TextV2>
      </Animated.View>
    </View>
  );
}

export type FeedbackPanelProps = {
  isCorrect: boolean;
  title: string;
  points: number;
  multiplier: number;
  // Text of the right answer (shown when the player missed).
  correctText: string;
  explanation: string | null;
  buttonLabel: string;
  onNext: () => void;
};

// Sheet under the question once it is answered (QUIZ_04 / QUIZ_05): Ember
// with the points when right, dark with the right answer when wrong.
export function FeedbackPanel({
  isCorrect,
  title,
  points,
  multiplier,
  correctText,
  explanation,
  buttonLabel,
  onNext,
}: FeedbackPanelProps) {
  const { colors } = useThemeV2();
  const insets = useSafeAreaInsets();
  const ink = colors.ember.onText;

  return (
    <Animated.View
      entering={SlideInDown.duration(320)}
      accessibilityLiveRegion="polite"
      style={[
        styles.panel,
        {
          backgroundColor: isCorrect ? colors.ember.base : '#262422',
          paddingBottom: Math.max(insets.bottom + 8, 30),
        },
      ]}
    >
      <View style={styles.panelHead}>
        <View style={styles.panelTitle}>
          <Animated.View
            entering={ZoomIn.duration(400)}
            style={[
              styles.dot,
              { backgroundColor: isCorrect ? ink : 'rgba(255,255,255,.14)' },
            ]}
          >
            {isCorrect ? (
              <Check size={18} color="#FFFFFF" strokeWidth={3} />
            ) : (
              <X size={18} color="#FFFFFF" strokeWidth={3} />
            )}
          </Animated.View>
          <TextV2 variant="title22" color={isCorrect ? ink : '#FFFFFF'} style={styles.panelTitleText}>
            {title}
          </TextV2>
        </View>
        {isCorrect ? (
          <View style={styles.points}>
            <TextV2 variant="cta" color={ink}>
              {`+ ${points}`}
            </TextV2>
            {multiplier > 1 ? (
              <View style={[styles.mult, { backgroundColor: ink }]}>
                <TextV2 variant="captionStrong" color={colors.ember.base}>
                  {`×${multiplier}`}
                </TextV2>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
      {!isCorrect ? (
        <TextV2 variant="body" color="#FFFFFF">
          <TextV2 variant="body" color="#8C8A85">
            Respuesta:{' '}
          </TextV2>
          {correctText}
        </TextV2>
      ) : null}
      {explanation ? (
        <TextV2 variant="body" color={isCorrect ? '#2A1206' : '#A8A6A1'}>
          {explanation}
        </TextV2>
      ) : null}
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={buttonLabel}
        onPress={onNext}
        style={[
          styles.next,
          { backgroundColor: isCorrect ? ink : '#FFFFFF' },
        ]}
      >
        <TextV2 variant="cta" color={isCorrect ? '#FFFFFF' : ink}>
          {buttonLabel}
        </TextV2>
      </PressableScale>
    </Animated.View>
  );
}

// Loading, empty or failed round on the dark scene.
export function RoundMessage({
  title,
  message,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}: {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
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
      {secondaryLabel && onSecondary ? (
        <Button label={secondaryLabel} variant="secondary" onPress={onSecondary} fullWidth />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 36,
    minWidth: 58,
    paddingHorizontal: 10,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  chipText: { fontWeight: '700' },
  floatWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 280,
    alignItems: 'center',
    zIndex: 4,
  },
  floatText: { fontSize: 44, fontWeight: '700' },
  panel: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: 14,
    zIndex: 3,
  },
  panelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  panelTitle: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  panelTitleText: { fontWeight: '700' },
  dot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  points: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mult: { height: 24, paddingHorizontal: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  next: { height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  message: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, gap: 14 },
});
