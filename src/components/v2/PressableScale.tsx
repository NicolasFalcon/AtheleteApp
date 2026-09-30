import type { PropsWithChildren } from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PressableScaleProps = PropsWithChildren<
  Omit<PressableProps, 'style' | 'children'> & {
    style?: StyleProp<ViewStyle>;
  }
>;

// Every tappable v2 element scales to .97 while pressed (handoff §13).
export function PressableScale({
  style,
  onPressIn,
  onPressOut,
  disabled,
  children,
  ...props
}: PressableScaleProps) {
  const { motion } = useThemeV2();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (event: GestureResponderEvent) => {
    scale.value = withTiming(motion.pressScale, { duration: 90 });
    onPressIn?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    scale.value = withTiming(1, { duration: 140 });
    onPressOut?.(event);
  };

  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
