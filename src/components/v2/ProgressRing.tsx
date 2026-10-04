import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type ProgressRingProps = {
  progress: number; // 0–1
  size: number;
  strokeWidth: number;
  // Colour of the empty ring; defaults to a faint line on dark scenes.
  trackColor?: string;
  // Fill of the disc inside the ring (the badge over a photo).
  fillColor?: string;
  // Duration of the arc growing from 0; 0 draws it at once.
  duration?: number;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

// Full Ember ring that fills clockwise from the top (Quiz: the record of a
// category over its photo, the score of a round). At 0 the arc is hidden
// instead of leaving the round cap as a dot.
export function ProgressRing({
  progress,
  size,
  strokeWidth,
  trackColor = 'rgba(255,255,255,.18)',
  fillColor,
  duration = 0,
  children,
  style,
}: ProgressRingProps) {
  const { colors } = useThemeV2();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const target = Math.min(1, Math.max(0, progress)) * circumference;
  const dash = useSharedValue(duration > 0 ? 0 : target);

  useEffect(() => {
    dash.value =
      duration > 0
        ? withTiming(target, {
            duration,
            easing: Easing.bezier(0.2, 0.8, 0.2, 1),
          })
        : target;
  }, [dash, duration, target]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDasharray: [dash.value, circumference],
  }));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      style={[{ width: size, height: size }, style]}
    >
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill={fillColor ?? 'none'}
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {target > 0 ? (
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colors.ember.base}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            animatedProps={animatedProps}
            rotation={-90}
            origin={`${size / 2}, ${size / 2}`}
          />
        ) : null}
      </Svg>
      <View style={styles.center}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
