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
  rings: Ring[]; // outer → inner, up to 3
  size?: number;
  stroke?: number;
  trackColor?: string;
  style?: StyleProp<ViewStyle>;
};

// Geometry of the prototype at 156 pt: radii 64 / 49 / 34, stroke 12.
const BASE = { size: 156, outer: 64, step: 15 };

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

// Concentric day rings ("Tu día"): Entreno/Core 33, Nutrición, Hidratación.
export function Rings({
  rings,
  size = 156,
  stroke = 12,
  trackColor,
  style,
}: RingsProps) {
  const { colors } = useThemeV2();
  const scale = size / BASE.size;
  const center = size / 2;
  const track = trackColor ?? colors.surface.track;

  return (
    <Svg width={size} height={size} style={style}>
      <G rotation={-90} origin={`${center}, ${center}`}>
        {rings.slice(0, 3).map((ring, index) => {
          const radius = (BASE.outer - index * BASE.step) * scale;

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
