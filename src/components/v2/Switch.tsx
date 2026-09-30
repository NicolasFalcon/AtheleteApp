import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { haptics } from '@app/components/v2/haptics';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type SwitchV2Props = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
};

const TRACK_WIDTH = 51;
const TRACK_HEIGHT = 31;
const KNOB = 27;
const TRAVEL = TRACK_WIDTH - KNOB - 4;

// 51×31 switch from the prototype: filled with the primary ink when on
// (black / ivory / white in a scene), outline colour when off. No green in v2.
// When on, the knob takes the inverted content colour so it always contrasts
// with the filled track (white on black; ink on ivory or white) — D-33.
export function SwitchV2({
  value,
  onValueChange,
  accessibilityLabel,
  disabled = false,
}: SwitchV2Props) {
  const { colors } = useThemeV2();
  const progress = useSharedValue(value ? 1 : 0);
  const onColor = colors.cta.primary;
  const offColor = colors.outline.strong;
  const knobOn = colors.cta.primaryText;
  const knobOff = '#FFFFFF';

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, { duration: 200 });
  }, [progress, value]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [offColor, onColor],
    ),
  }));
  const knobStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [knobOff, knobOn],
    ),
    transform: [{ translateX: progress.value * TRAVEL }],
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => {
        haptics.selection();
        onValueChange(!value);
      }}
      style={{ opacity: disabled ? 0.35 : 1 }}
    >
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.knob, knobStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    padding: 2,
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    boxShadow: '0 2px 4px rgba(0,0,0,.2)',
  },
});
