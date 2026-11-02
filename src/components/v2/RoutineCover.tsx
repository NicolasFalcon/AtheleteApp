import { useState, type ReactNode } from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type LayoutChangeEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextLayoutEventData,
  type ViewStyle,
} from 'react-native';
import { fontsV2 } from '@app/theme/v2/typography';
import type { RoutineFocus } from '@app/shared/domain/types';
import type { ProfileGender } from '@app/types/auth';

// Routine cover (handoff §28.16): one background without text and an overlay
// drawn by the app (Ember line + the focus word in Anton, localized).
// Two formats: the 3:4 header of the routine detail and the 7:3 crop of
// ELLIE's card.

const COVER_BG: ImageSourcePropType = require('../../assets/covers/cover-bg.jpg');

// Future: a photo per focus and sex (cover-<focus>-<m|h>.jpg, 1536 × 2048,
// same overlay). Add each file here as it arrives, e.g.
//   empuje: { m: require('../../assets/covers/cover-empuje-m.jpg') },
// Without a photo for the focus or the sex (Otro, not stated): cover-bg.jpg.
const COVER_PHOTOS: Partial<Record<RoutineFocus, Partial<Record<'m' | 'h', ImageSourcePropType>>>> = {};

export function routineCoverSource(
  focus: RoutineFocus | null | undefined,
  gender: ProfileGender | null | undefined,
): ImageSourcePropType {
  const sex = gender === 'female' ? 'm' : gender === 'male' ? 'h' : null;
  return (focus && sex && COVER_PHOTOS[focus]?.[sex]) || COVER_BG;
}

export type RoutineCoverFormat = 'detail' | 'card';

// Overlay metrics in pt for a cover `width` pt wide.
function metrics(format: RoutineCoverFormat, width: number) {
  if (format === 'detail') {
    // Relative to the cover width W (W = 393 → 33 · 31 × 3 at 218 · 77–47 · 248).
    return {
      left: width * 0.0833,
      available: width * 0.8333,
      lineWidth: width * 0.0781,
      lineHeight: width * 0.0078,
      lineTop: width * 0.5547,
      maxSize: width * 0.1953,
      minSize: width * 0.12,
      capTop: width * 0.6302,
    };
  }
  return {
    left: 16,
    available: width - 32,
    lineWidth: 24,
    lineHeight: 3,
    lineTop: 30,
    maxSize: 64,
    minSize: 44,
    capTop: 55,
  };
}

// Anton: with line height 1.0 the cap height starts 0.064 × size below the
// top of the text box.
const CAP_OFFSET = 0.064;

// Size of the word: measured at the maximum; if it does not fit the useful
// width, maximum × useful ÷ measured, never below the minimum.
export function coverWordSize(measured: number, maxSize: number, minSize: number, available: number): number {
  if (measured <= available) {
    return maxSize;
  }
  return Math.max(minSize, (maxSize * available) / measured);
}

export function RoutineCoverOverlay({
  format,
  width,
  word,
}: {
  format: RoutineCoverFormat;
  width: number;
  word: string | null;
}) {
  // Width of the word at the maximum size, keyed by word and size.
  const [measured, setMeasured] = useState<{ key: string; width: number } | null>(null);
  if (!width) {
    return null;
  }
  const m = metrics(format, width);
  const key = `${word}|${Math.round(m.maxSize)}`;
  const known = measured?.key === key ? measured.width : null;
  const size = known === null ? m.maxSize : coverWordSize(known, m.maxSize, m.minSize, m.available);

  const onMeasure = (event: NativeSyntheticEvent<TextLayoutEventData>) => {
    const line = event.nativeEvent.lines[0];
    if (line) {
      setMeasured({ key, width: line.width });
    }
  };

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.line,
          { left: m.left, top: m.lineTop, width: m.lineWidth, height: m.lineHeight },
        ]}
      />
      {word ? (
        <>
          {/* Measure at the maximum, off screen and without wrapping. */}
          <View style={styles.measure}>
            <Text
              allowFontScaling={false}
              style={[styles.word, { fontSize: m.maxSize, lineHeight: m.maxSize }]}
              onTextLayout={onMeasure}
            >
              {word}
            </Text>
          </View>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={m.minSize / size}
            allowFontScaling={false}
            style={[
              styles.word,
              {
                left: m.left,
                width: m.available,
                top: m.capTop - CAP_OFFSET * size,
                fontSize: size,
                lineHeight: size,
                opacity: known === null ? 0 : 1,
              },
            ]}
          >
            {word}
          </Text>
        </>
      ) : null}
    </View>
  );
}

// The whole cover at its aspect (detail 3:4, card 7:3), with `children` on
// top (the card's badge).
export function RoutineCover({
  format,
  word,
  focus,
  gender,
  style,
  children,
}: {
  format: RoutineCoverFormat;
  word: string | null;
  focus?: RoutineFocus | null;
  gender?: ProfileGender | null;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const [width, setWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  return (
    <View
      onLayout={onLayout}
      style={[styles.cover, { aspectRatio: format === 'detail' ? 3 / 4 : 7 / 3 }, style]}
    >
      <Image source={routineCoverSource(focus, gender)} resizeMode="cover" style={StyleSheet.absoluteFill} />
      <RoutineCoverOverlay format={format} width={width} word={word} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    backgroundColor: '#141312',
    overflow: 'hidden',
  },
  line: {
    position: 'absolute',
    backgroundColor: '#FF5B1F',
  },
  measure: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 4000,
    opacity: 0,
    flexDirection: 'row',
  },
  word: {
    position: 'absolute',
    fontFamily: fontsV2.display,
    // Anton has one weight: '700' on iOS only matters without the font.
    fontWeight: Platform.OS === 'ios' ? '700' : '400',
    color: '#F2F0EC',
    letterSpacing: 0,
    includeFontPadding: false,
  },
});
