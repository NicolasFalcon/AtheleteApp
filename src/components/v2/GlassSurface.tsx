import type { PropsWithChildren } from 'react';
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type GlassKind = 'nav' | 'tab' | 'statusbar';

// Replaces the alpha of an `rgba(r,g,b,a)` token.
export function withAlpha(rgba: string, nextAlpha: number): string {
  const match = rgba.match(/rgba?\(([^)]+)\)/);

  if (!match) {
    return rgba;
  }

  const [r, g, b] = match[1].split(',').map(part => part.trim());
  return `rgba(${r},${g},${b},${nextAlpha})`;
}

export type GlassSurfaceProps = PropsWithChildren<{
  kind?: GlassKind;
  style?: StyleProp<ViewStyle>;
}>;

// Frosted glass used by headers, footers and the tab bar. Real blur on iOS;
// on Android a near-opaque fill of the same tint (D-28).
export function GlassSurface({
  kind = 'nav',
  style,
  children,
}: GlassSurfaceProps) {
  const { colors, mode, blur } = useThemeV2();
  const tint = colors.glass[kind];
  const isLight = mode === 'light';

  if (Platform.OS !== 'ios') {
    return (
      <View
        style={[
          { backgroundColor: withAlpha(tint, blur.androidFallbackAlpha) },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.clip, style]}>
      <BlurView
        style={StyleSheet.absoluteFill}
        blurType={isLight ? 'light' : 'dark'}
        blurAmount={kind === 'tab' ? blur.tabBar : blur.glass}
        reducedTransparencyFallbackColor={withAlpha(tint, 1)}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
});
