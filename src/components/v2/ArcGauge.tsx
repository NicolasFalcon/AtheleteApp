import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type ArcGaugeProps = {
  progress: number; // 0–1
  // No goal (Nutrición sin plan): the arc stays empty.
  empty?: boolean;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

const SIZE = 280;
const RADIUS = 118;
const STROKE = 18;
// 270° of a circle of r = 118.
const ARC = 556;
const FULL = 742;

// 270° indicator (Nutrición): a track and an Ember arc that fills clockwise
// from the lower left, with the content centred in the opening of the arc.
export function ArcGauge({
  progress,
  empty = false,
  children,
  style,
}: ArcGaugeProps) {
  const { colors, mode } = useThemeV2();
  const dash = useSharedValue(0);

  useEffect(() => {
    dash.value = withTiming(Math.min(1, Math.max(0, progress)) * ARC, {
      duration: 700,
    });
  }, [dash, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDasharray: [dash.value, FULL],
  }));

  return (
    <View style={[styles.box, style]}>
      <Svg width={SIZE} height={SIZE} style={styles.svg}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          // Dark keeps the light track of the prototype (ivory arc).
          stroke={mode === 'dark' ? '#EAE8E3' : colors.surface.track}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${ARC} ${FULL}`}
          rotation={135}
          origin={`${SIZE / 2}, ${SIZE / 2}`}
        />
        <AnimatedCircle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={colors.ember.base}
          strokeOpacity={empty || progress <= 0 ? 0 : 1}
          strokeWidth={STROKE}
          strokeLinecap="round"
          rotation={135}
          origin={`${SIZE / 2}, ${SIZE / 2}`}
          animatedProps={animatedProps}
        />
      </Svg>
      <View style={styles.center}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: SIZE, height: 250 },
  svg: { position: 'absolute', top: 0, left: 0 },
  center: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 78,
    alignItems: 'center',
    gap: 2,
  },
});
