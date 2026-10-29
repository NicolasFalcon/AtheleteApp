import { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type Ring = {
  progress: number; // 0–1
  color: string;
  opacity?: number;
};

export type RingsProps = {
  rings: Ring[]; // outer → inner, 2–4
  // Defaults to the natural size for the number of rings.
  size?: number;
  stroke?: number;
  trackColor?: string;
  style?: StyleProp<ViewStyle>;
};

// Geometry of Tu día (v2.18 §28.14, Home.dc.html): the inner ring has radius
// 34 and each one outside adds 15; the instrument is 2 × outer radius + 20
// (118 pt with 2 rings, 148 with 3, 178 with 4).
const INNER = 34;
const STEP = 15;
const MAX_RINGS = 4;

export function ringsSize(count: number): number {
  const n = Math.min(MAX_RINGS, Math.max(1, count));
  return 2 * (INNER + (n - 1) * STEP) + 20;
}

function RingArc({
  ring,
  radius,
  stroke,
  center,
}: {
  ring: Ring;
  radius: number;
  stroke: number;
  center: number;
}) {
  const circumference = 2 * Math.PI * radius;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(Math.min(1, Math.max(0, ring.progress)), {
      duration: 600,
    });
  }, [progress, ring.progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <AnimatedCircle
      cx={center}
      cy={center}
      r={radius}
      fill="none"
      stroke={ring.color}
      strokeOpacity={ring.progress > 0 ? ring.opacity ?? 1 : 0}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeDasharray={`${circumference} ${circumference}`}
      animatedProps={animatedProps}
    />
  );
}

// Concentric day rings ("Tu día"), outside in, starting at the top and
// running clockwise.
export function Rings({
  rings,
  size: sizeProp,
  stroke = 12,
  trackColor,
  style,
}: RingsProps) {
  const { colors } = useThemeV2();
  const shown = rings.slice(0, MAX_RINGS);
  const natural = ringsSize(shown.length);
  const size = sizeProp ?? natural;
  const scale = size / natural;
  const center = size / 2;
  const track = trackColor ?? colors.surface.track;

  return (
    <Svg width={size} height={size} style={style}>
      <G rotation={-90} origin={`${center}, ${center}`}>
        {shown.map((ring, index) => {
          const radius = (INNER + (shown.length - 1 - index) * STEP) * scale;

          return (
            <G key={index}>
              <Circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={track}
                strokeWidth={stroke}
              />
              <RingArc
                ring={ring}
                radius={radius}
                stroke={stroke}
                center={center}
              />
            </G>
          );
        })}
      </G>
    </Svg>
  );
}
