import type { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

// ELLIE's own material (handoff §ELLIE): a warm linen that fades into the
// page colour. Light: #EDE4D8 → #F3EDE5 (42 %) → page; Dark: the toasted
// dark tones. The gradient is only an absolute background (on Fabric a padded
// LinearGradient used as a container shifts its children).
export function EllieLinen({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const { colors, mode } = useThemeV2();
  const linen =
    mode === 'dark'
      ? [colors.ellie.linen[0], colors.ellie.linen[1], colors.bg]
      : ['#EDE4D8', '#F3EDE5', colors.bg];

  return (
    <View style={[styles.fill, { backgroundColor: colors.bg }, style]}>
      <LinearGradient
        pointerEvents="none"
        colors={linen}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
