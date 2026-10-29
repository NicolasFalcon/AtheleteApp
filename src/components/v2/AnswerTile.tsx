import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Check, X } from 'lucide-react-native';
import { PressableScale } from '@app/components/v2/PressableScale';
import { TextV2 } from '@app/components/v2/TextV2';

// idle = waiting for a touch · correct = the right answer (green) · wrong =
// the option the player chose (red) · dim = any other option once answered.
export type AnswerTileState = 'idle' | 'correct' | 'wrong' | 'dim';

// Athelete Play v2.18 (Quiz.dc.html): green hit, red miss on the dark scene.
export const ANSWER_GREEN = '#2FD27A';
export const ANSWER_RED = '#FF4D4F';

export type AnswerTileProps = {
  letter: string;
  text: string;
  state: AnswerTileState;
  // The player chose this one (pop when it is right, shake when it is wrong).
  chosen?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

// Answer option of a Play round (scene): a lettered mark, the text and, once
// answered, a check or a cross at the end. A single touch answers; there is
// no confirm step.
export function AnswerTile({
  letter,
  text,
  state,
  chosen = false,
  disabled = false,
  onPress,
}: AnswerTileProps) {
  const shake = useSharedValue(0);
  const pop = useSharedValue(1);

  useEffect(() => {
    if (!chosen) {
      return;
    }
    if (state === 'wrong') {
      shake.value = withSequence(
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 80 }),
        withTiming(-5, { duration: 80 }),
        withTiming(0, { duration: 60 }),
      );
    } else if (state === 'correct') {
      pop.value = withSequence(withTiming(1.03, { duration: 120 }), withSpring(1, { damping: 8 }));
    }
  }, [chosen, pop, shake, state]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }, { scale: pop.value }],
  }));

  const correct = state === 'correct';
  const wrong = state === 'wrong';
  const tint = correct ? ANSWER_GREEN : wrong ? ANSWER_RED : null;

  return (
    <Animated.View style={animated}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`${letter}. ${text}`}
        accessibilityState={{ disabled, selected: chosen }}
        disabled={disabled}
        onPress={onPress}
        style={[
          styles.tile,
          {
            backgroundColor: correct
              ? 'rgba(47,210,122,.12)'
              : wrong
              ? 'rgba(255,77,79,.12)'
              : 'rgba(255,255,255,.05)',
            boxShadow: tint ? `inset 0 0 0 1.5px ${tint}` : 'inset 0 0 0 1px rgba(255,255,255,.08)',
            opacity: state === 'dim' ? 0.4 : 1,
          },
        ]}
      >
        <View style={[styles.mark, { backgroundColor: tint ?? 'rgba(255,255,255,.1)' }]}>
          <TextV2 variant="bodyStrong" color={correct ? '#0B1A11' : '#FFFFFF'} style={styles.letter}>
            {letter}
          </TextV2>
        </View>
        <TextV2
          variant="bodyL"
          color={tint ? '#FFFFFF' : '#E8E6E1'}
          style={[styles.text, correct && styles.textStrong]}
        >
          {text}
        </TextV2>
        {tint ? (
          <Animated.View entering={ZoomIn.duration(400)} style={[styles.end, { backgroundColor: tint }]}>
            {correct ? (
              <Check size={14} color="#0B1A11" strokeWidth={3} />
            ) : (
              <X size={14} color="#FFFFFF" strokeWidth={3} />
            )}
          </Animated.View>
        ) : null}
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tile: {
    minHeight: 62,
    borderRadius: 18,
    paddingVertical: 11,
    paddingLeft: 12,
    paddingRight: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  mark: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: { fontSize: 16, fontWeight: '700' },
  text: { flex: 1, lineHeight: 22 },
  textStrong: { fontWeight: '600' },
  end: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
