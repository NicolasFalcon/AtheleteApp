import { Animated, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassSurface } from '@app/components/v2/GlassSurface';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type StatusBarShieldProps = {
  // Vertical offset of the screen's scroll view.
  scrollY: Animated.Value;
  // Offset at which the shield is fully visible.
  distance?: number;
};

// Status bar protection for root screens without a header bar: a glass strip
// the height of the status bar that fades in as soon as content scrolls
// under the time and battery. Render it after the scroll view.
export function StatusBarShield({ scrollY, distance = 12 }: StatusBarShieldProps) {
  const { colors } = useThemeV2();
  const insets = useSafeAreaInsets();
  const opacity = scrollY.interpolate({
    inputRange: [0, distance],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.shield, { height: insets.top, opacity }]}
    >
      <GlassSurface
        kind="statusbar"
        style={[
          StyleSheet.absoluteFill,
          {
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.divider,
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shield: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
