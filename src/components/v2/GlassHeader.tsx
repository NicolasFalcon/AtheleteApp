import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassSurface } from '@app/components/v2/GlassSurface';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type GlassHeaderProps = {
  title?: string;
  left?: ReactNode;
  right?: ReactNode;
  // Transparent over a hero: only the floating glass buttons are visible.
  transparent?: boolean;
  // Adds the safe-area top inset (default). Disable inside modals/previews.
  safeArea?: boolean;
  style?: StyleProp<ViewStyle>;
};

// Navigation bar: back button · centred 17/600 title · optional action.
export function GlassHeader({
  title,
  left,
  right,
  transparent = false,
  safeArea = true,
  style,
}: GlassHeaderProps) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const bar = (
    <View
      style={[
        styles.bar,
        {
          paddingTop: safeArea ? insets.top : 0,
          paddingHorizontal: layout.floatingGutter,
        },
      ]}
    >
      <View style={styles.side}>{left}</View>
      <TextV2
        variant="cta"
        align="center"
        numberOfLines={1}
        style={styles.title}
      >
        {title}
      </TextV2>
      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );

  if (transparent) {
    return <View style={style}>{bar}</View>;
  }

  return (
    <GlassSurface
      kind="nav"
      style={[
        {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.divider,
        },
        style,
      ]}
    >
      {bar}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingBottom: 4,
  },
  side: {
    // Grows for a wide action ("Guardado ✓"); 88 otherwise.
    minWidth: 88,
    flexDirection: 'row',
    alignItems: 'center',
  },
  right: {
    justifyContent: 'flex-end',
  },
  title: {
    flex: 1,
  },
});
