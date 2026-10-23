import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';
import type { DisplaySize, DisplayStyleV2 } from '@app/theme/v2';

// Anton's own line box (ascender 2409 + descender 674 over 2048 units =
// 1.505 em). iOS only centres the glyphs when lineHeight is at least that
// tall; below it they sit at the bottom and the tops (Á, É, Ó…) are cut. So
// every line gets a box a bit taller than the font, and a negative vertical
// margin brings the baseline-to-baseline pitch back to the token (0.94 em).
const FONT_BOX = 1.51;
// Capital accents rise 0.21 em above the 0.94 em slot: room above the first
// line so they never touch what sits on top (accent bar, eyebrow).
const ACCENT_ROOM = 0.12;

// Line box of one Anton line (see FONT_BOX), for any display token.
export function displayLineBox(token: DisplayStyleV2) {
  const box = Math.ceil((token.fontSize as number) * FONT_BOX);
  return {
    lineHeight: box,
    marginVertical: ((token.lineHeight as number) - box) / 3,
  };
}

export type DisplayTitleProps = {
  // Lines in the text colour, then `accent` lines in Ember. Always caps.
  lines: string[];
  accent?: string[];
  size: DisplaySize;
  // Each line shrinks to fit the width instead of wrapping (short phones).
  fit?: boolean;
  style?: StyleProp<ViewStyle>;
};

// Campaign headline (Login, Crear cuenta, Intro): Anton, caps, 0.94 line
// height, −0.005 em tracking, one Text per line.
export function DisplayTitle({
  lines,
  accent = [],
  size,
  fit = true,
  style,
}: DisplayTitleProps) {
  const { colors, display } = useThemeV2();
  const token = display[size];
  const lineBox = displayLineBox(token);

  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel={[...lines, ...accent].join(' ')}
      style={[{ paddingTop: Math.round(token.fontSize * ACCENT_ROOM) }, style]}
    >
      {[...lines, ...accent].map((line, index) => (
        <TextV2
          key={`${index}-${line}`}
          numberOfLines={fit ? 1 : undefined}
          adjustsFontSizeToFit={fit}
          color={index < lines.length ? colors.text.primary : colors.ember.base}
          style={[
            token,
            styles.line,
            lineBox,
          ]}
        >
          {line}
        </TextV2>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    // Android: no extra font padding on top of the line box.
    includeFontPadding: false,
    fontVariant: [],
  },
});
