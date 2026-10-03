import type { TextStyle } from 'react-native';

// v2 text styles. No fontFamily on purpose: React Native then uses the
// system font (SF Pro on iOS, Roboto on Android). Tabular figures everywhere,
// as in the prototype (font-variant-numeric: tabular-nums on the whole app).
// Letter spacing comes from the prototype in em and is converted to points.

export type TextStyleV2 = Required<
  Pick<TextStyle, 'fontSize' | 'fontWeight' | 'lineHeight' | 'letterSpacing'>
> &
  Pick<TextStyle, 'textTransform' | 'marginVertical'> & {
    fontVariant: ['tabular-nums'];
  };

// Below ~1.2× the font size iOS (and Android) clip the glyphs of a Text:
// tops of digits disappear (a 5 reads as a 3). Tight display lines keep a
// safe line height and pull the box back with a negative vertical margin,
// so the layout matches the prototype's tight line box without clipping.
const SAFE_LINE_RATIO = 1.2;

export function tightLine(
  fontSize: number,
  lineHeightRatio: number,
): Pick<TextStyle, 'lineHeight' | 'marginVertical'> {
  const target = Math.round(fontSize * lineHeightRatio);
  const safe = Math.ceil(fontSize * SAFE_LINE_RATIO);

  if (target >= safe) {
    return { lineHeight: target };
  }

  return { lineHeight: safe, marginVertical: (target - safe) / 2 };
}

type Weight = '400' | '500' | '600' | '700';

export function em(value: number, fontSize: number): number {
  return Math.round(value * fontSize * 100) / 100;
}

function style(
  fontSize: number,
  fontWeight: Weight,
  lineHeightRatio: number,
  trackingEm = 0,
  textTransform?: TextStyle['textTransform'],
): TextStyleV2 {
  const line = tightLine(fontSize, lineHeightRatio);

  return {
    fontSize,
    fontWeight,
    lineHeight: line.lineHeight as number,
    ...(line.marginVertical !== undefined
      ? { marginVertical: line.marginVertical }
      : {}),
    letterSpacing: em(trackingEm, fontSize),
    fontVariant: ['tabular-nums'],
    ...(textTransform ? { textTransform } : {}),
  };
}

export const typeV2 = {
  micro: style(10, '600', 1.2, 0.01),
  eyebrow: style(11, '600', 1.2, 0.08, 'uppercase'),
  caption: style(12, '400', 1.3),
  captionStrong: style(12, '600', 1.3),
  meta: style(13, '400', 1.4),
  metaStrong: style(13, '600', 1.4),
  label: style(14, '600', 1.4),
  body: style(15, '400', 1.45),
  bodyStrong: style(15, '600', 1.45),
  bodyL: style(16, '400', 1.45),
  cta: style(17, '600', 1.4),
  voice: style(17, '400', 1.45),
  sub: style(18, '600', 1.3),
  section: style(20, '600', 1.2),
  title22: style(22, '600', 1.1, -0.015),
  title24: style(24, '600', 1.1, -0.015),
  title26: style(26, '600', 1.1, -0.015),
  title28: style(28, '700', 1.1, -0.015),
  question: style(32, '600', 1.1, -0.02),
  displayS: style(40, '600', 1, -0.03),
  displayM: style(68, '600', 0.88, -0.045),
  displayL: style(112, '600', 0.84, -0.055),
  displayXL: style(220, '600', 0.8, -0.07),
  wordmark: style(11, '700', 1.2, 0.22, 'uppercase'),
} as const;

export type TypeV2 = typeof typeV2;
