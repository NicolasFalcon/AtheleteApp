import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type WordmarkProps = {
  tone?: 'onDark' | 'ink';
  size?: number; // circle diameter, 44 in the Auth heroes
  showName?: boolean;
  style?: StyleProp<ViewStyle>;
};

// Typographic ATHELETE mark from the prototype: "Λ" inside a ring + the name
// with wide tracking. PLACEHOLDER until the official logotype (handoff §15).
export function Wordmark({
  tone = 'onDark',
  size = 44,
  showName = true,
  style,
}: WordmarkProps) {
  const { colors, scene } = useThemeV2();
  const color = tone === 'onDark' ? scene.onDark.primary : colors.text.primary;
  const scale = size / 44;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Athelete"
      style={[styles.row, { gap: 12 * scale }, style]}
    >
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 3 * scale,
            borderColor: color,
          },
        ]}
      >
        <Text
          style={[
            styles.glyph,
            { color, fontSize: 21 * scale, lineHeight: 24 * scale },
          ]}
        >
          Λ
        </Text>
      </View>
      {showName ? (
        <Text
          style={[
            styles.name,
            {
              color,
              fontSize: 15 * scale,
              letterSpacing: 0.32 * 15 * scale,
            },
          ]}
        >
          ATHELETE
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 2,
  },
  glyph: {
    fontWeight: '500',
  },
  name: {
    fontWeight: '700',
  },
});
