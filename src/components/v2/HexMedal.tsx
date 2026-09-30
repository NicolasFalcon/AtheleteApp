import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Polygon } from 'react-native-svg';
import type { LucideIcon } from 'lucide-react-native';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type HexMedalProps = {
  icon: LucideIcon;
  state?: 'earned' | 'locked';
  size?: number; // 58 (summary) … 106 (achievement sheet)
  progress?: number; // 0–1, Ember ring around a locked medal
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
  const showRing = !earned && progress !== undefined;
  const ringStroke = Math.max(2, size * 0.04);
  const ringRadius = size / 2 - ringStroke / 2;
  const circumference = 2 * Math.PI * ringRadius;
  const hexInset = showRing ? ringStroke + size * 0.06 : size * 0.02;

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={[{ width: size, height: size }, style]}
    >
      <Svg width={size} height={size}>
        {showRing ? (
          <>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={ringRadius}
              fill="none"
              stroke={colors.surface.track}
              strokeWidth={ringStroke}
            />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={ringRadius}
              fill="none"
              stroke={colors.ember.base}
              strokeWidth={ringStroke}
              strokeLinecap="round"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={
                circumference * (1 - Math.min(1, Math.max(0, progress ?? 0)))
              }
              rotation={-90}
              origin={`${size / 2}, ${size / 2}`}
            />
          </>
        ) : null}
        <Polygon
          points={hexPoints(size, hexInset)}
          fill={earned ? scene.medal : colors.surface.muted}
          stroke={earned ? colors.ember.base : 'none'}
          strokeWidth={earned ? 1.5 : 0}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Icon
          color={earned ? scene.onDark.primary : colors.text.tertiary}
          size={Math.round(size * 0.34)}
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
