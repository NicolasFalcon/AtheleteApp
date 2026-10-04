import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Polygon,
  Stop,
} from 'react-native-svg';
import type { LucideIcon } from 'lucide-react-native';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type HexMedalProps = {
  icon: LucideIcon;
  state?: 'earned' | 'locked';
  size?: number; // 58 (summary) … 106 (achievement sheet)
  // 0–1: Ember arc of the ring around the icon of a locked medal. Without it
  // a locked medal shows only the empty ring.
  progress?: number;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

// Same hexagon as the prototype clip-path: 50% 0, 95% 25%, 95% 75%, 50% 100%,
// 5% 75%, 5% 25%.
function hexPoints(size: number, inset: number) {
  const s = size - inset * 2;
  const p = (x: number, y: number) => `${inset + x * s},${inset + y * s}`;
  return [
    p(0.5, 0),
    p(0.95, 0.25),
    p(0.95, 0.75),
    p(0.5, 1),
    p(0.05, 0.75),
    p(0.05, 0.25),
  ].join(' ');
}

// Medal (handoff · Badge / Medal): earned = dark hexagon with an Ember ring
// around the icon; locked = light (Dark: dark) hexagon with a hairline and
// the ring as the progress towards it.
export function HexMedal({
  icon: Icon,
  state = 'earned',
  size = 58,
  progress,
  accessibilityLabel,
  style,
}: HexMedalProps) {
  const { colors, scene } = useThemeV2();
  const earned = state === 'earned';
  const center = size / 2;
  const radius = size * 0.265;
  const stroke = Math.max(1.6, size * 0.028);
  const circumference = 2 * Math.PI * radius;
  const ratio = Math.min(1, Math.max(0, progress ?? 0));

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={[{ width: size, height: size }, style]}
    >
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="medalFill" x1="0.25" y1="0" x2="0.75" y2="1">
            <Stop offset="0" stopColor="#2E2B28" />
            <Stop offset="0.7" stopColor="#121212" />
          </LinearGradient>
        </Defs>
        <Polygon
          points={hexPoints(size, size * 0.02)}
          fill={earned ? 'url(#medalFill)' : colors.surface.raised}
          stroke={earned ? 'none' : colors.outline.strong}
          strokeWidth={earned ? 0 : 1}
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={earned ? colors.ember.base : colors.surface.track}
          strokeWidth={stroke}
        />
        {!earned && ratio > 0 ? (
          <Circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={colors.ember.base}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - ratio)}
            rotation={-90}
            origin={`${center}, ${center}`}
          />
        ) : null}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Icon
          color={earned ? scene.onDark.primary : colors.text.tertiary}
          size={Math.round(size * 0.27)}
          strokeWidth={2}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
