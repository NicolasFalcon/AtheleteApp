import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Check, X } from 'lucide-react-native';
import { PressableScale } from '@app/components/v2/PressableScale';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

// idle = waiting for a touch · correct = the right answer (Ember) · wrong =
// the option the player chose · dim = any other option once answered.
export type AnswerTileState = 'idle' | 'correct' | 'wrong' | 'dim';

export type AnswerTileProps = {
  letter: string;
  text: string;
  state: AnswerTileState;
  // The player chose this one (pop when it is right, shake when it is wrong).
  chosen?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

// Answer option of a Quiz round (scene): a lettered mark and the text. The
// answer is a single touch, there is no confirm step (handoff · Ronda).
export function AnswerTile({
  letter,
  text,
  state,
  chosen = false,
  disabled = false,
  onPress,
}: AnswerTileProps) {
  const { colors } = useThemeV2();
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
      pop.value = withSequence(
        withTiming(1.04, { duration: 120 }),
        withSpring(1, { damping: 8 }),
      );
    }
  }, [chosen, pop, shake, state]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }, { scale: pop.value }],
  }));

  const correct = state === 'correct';
  const wrong = state === 'wrong';
  const ink = colors.ember.onText;

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
              ? colors.ember.base
              : wrong
              ? 'rgba(255,255,255,.04)'
              : 'rgba(255,255,255,.06)',
            boxShadow: correct
              ? '0 10px 30px rgba(255,91,31,.35)'
              : wrong
              ? 'inset 0 0 0 2px rgba(255,255,255,.3)'
              : 'inset 0 0 0 1px rgba(255,255,255,.08)',
            opacity: state === 'dim' ? 0.35 : 1,
          },
        ]}
      >
        <View
          style={[
            styles.mark,
            {
              backgroundColor: correct
                ? ink
                : wrong
                ? 'rgba(255,255,255,.2)'
                : 'rgba(255,255,255,.1)',
            },
          ]}
        >
          {correct ? (
            <Check size={18} color={colors.ember.base} strokeWidth={3} />
          ) : wrong ? (
            <X size={18} color="#FFFFFF" strokeWidth={3} />
          ) : (
            <TextV2 variant="bodyStrong" color="#FFFFFF">
              {letter}
            </TextV2>
          )}
        </View>
        <TextV2
          variant="voice"
          color={correct ? ink : wrong ? '#8C8A85' : '#E8E6E1'}
          style={[styles.text, correct && styles.textStrong]}
        >
          {text}
        </TextV2>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tile: {
    minHeight: 64,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  mark: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
  textStrong: { fontWeight: '600' },
});
