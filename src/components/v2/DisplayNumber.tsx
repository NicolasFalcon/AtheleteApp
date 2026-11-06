import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';
import { TextV2, type TextV2Props } from '@app/components/v2/TextV2';

// Big figures (recovery score, challenge progress, "7 h 42", records…).
// Below ~1.2× the font size iOS and Android clip the top of the digits (the
// "85" of Sueño lost its top), so the line box is never tighter than
// DISPLAY_NUMBER_RATIO × size. Android also drops its extra font padding and
// centres the glyphs vertically in that box.
export const DISPLAY_NUMBER_RATIO = 1.2;

// Negative tracking also trims the advance of the LAST glyph, so its right
// edge falls outside the Text box and gets clipped (the "5" of "85"). Pass
// the tracking and the box gets that room back as padding, with an equal
// negative margin so the layout does not move.
export function displayNumberStyle(size: number, tracking = 0): TextStyle {
  const overhang = tracking < 0 ? Math.ceil(-tracking) : 0;
  return {
    fontSize: size,
    letterSpacing: tracking,
    paddingRight: overhang,
    marginRight: -overhang,
    lineHeight: Math.ceil(size * DISPLAY_NUMBER_RATIO),
    includeFontPadding: false,
    textAlignVertical: 'center',
    // Variants may pull the box back with a negative margin; a display
    // figure keeps its whole box so nothing above it covers the digits.
    marginVertical: 0,
  };
}

export type DisplayNumberProps = Omit<TextV2Props, 'variant' | 'style'> & {
  size: number;
  weight?: TextStyle['fontWeight'];
  // Tracking in points (negative tightens the figure).
  tracking?: number;
  // Shrinks to fit the width on one line instead of wrapping (iPhone SE).
  fit?: boolean;
  // Extra styles; fontSize / lineHeight here are ignored.
  style?: StyleProp<TextStyle>;
};

export function DisplayNumber({
  size,
  weight = '700',
  tracking = 0,
  fit = false,
  style,
  ...props
}: DisplayNumberProps) {
  return (
    <TextV2
      numberOfLines={fit ? 1 : props.numberOfLines}
      adjustsFontSizeToFit={fit}
      {...props}
      style={[
        styles.base,
        style,
        { fontWeight: weight },
        displayNumberStyle(size, tracking),
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: { fontVariant: ['tabular-nums'] },
});
