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
import { routineKeepsPhoto } from '@app/lib/workoutThumbnails';
import type { EllieLanguage } from '@app/features/ellie/ellieCopy';
import { useAuth } from '@app/hooks/useAuth';
import { useProfileLanguage } from '@app/hooks/useProfileLanguage';
import type { RoutineFocus } from '@app/shared/domain/types';
import type { ProfileGender } from '@app/types/auth';

// Routine cover (handoff §28.16): one background without text and an overlay
// drawn by the app (Ember line + the focus word in Anton, localized). It
// replaces every generated or stock routine picture; only an official or
// editorial routine with a photo of its own keeps it (routineKeepsPhoto).
// Formats: the 3:4 header of the routine detail, the 7:3 crop of ELLIE's
// card, wide heroes (the word in the free band above the hero's own texts)
// and list thumbnails.

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

// Only an official or editorial routine with a photo of its own keeps it
// (the rule lives in lib/workoutThumbnails, shared with the raster helpers).
export { routineKeepsPhoto };

// Language and sex for the covers of a screen.
export function useRoutineCoverContext(): {
  language: EllieLanguage;
  gender: ProfileGender | null;
} {
  const language = useProfileLanguage();
  const { profile } = useAuth();
  return { language, gender: profile?.gender ?? null };
}

export type RoutineCoverFormat = 'detail' | 'card' | 'wide' | 'thumb';

// What a cover needs: the word (focus → category → none), the focus and the
// sex for the future background photos.
export type RoutineCoverInfo = {
  word: string | null;
  focus: RoutineFocus | null;
  gender: ProfileGender | null;
};

// Wide heroes: the free band between the top of the hero (or its top bar)
// and its own texts. The line sits at `top`; the word fits above `bottom`.
export type RoutineCoverBand = { top: number; bottom: number };

type Metrics = {
  left: number;
  available: number;
  lineWidth: number;
  lineHeight: number;
  lineTop: number;
  maxSize: number;
  minSize: number;
  capTop: number;
};

// Anton (per em): cap height 0.859.
const CAP_HEIGHT = 0.859;

// Overlay metrics in pt for a cover `width` pt wide; null: no overlay fits.
function metrics(format: RoutineCoverFormat, width: number, band?: RoutineCoverBand): Metrics | null {
  if (format === 'wide') {
    // The card's measures (24 × 3 line, 25 pt to the capitals, 64–44 pt),
    // aligned with the hero's 20 pt text margin. The word shrinks to the
    // band and is left out when not even the minimum fits.
    if (!band || band.bottom - band.top < 3) {
      return null;
    }
    const capTop = band.top + 25;
    return {
      left: 20,
      available: width - 40,
      lineWidth: 24,
      lineHeight: 3,
      lineTop: band.top,
      maxSize: Math.min(64, (band.bottom - capTop) / CAP_HEIGHT),
      minSize: 44,
      capTop,
    };
  }
  if (format === 'detail' || format === 'thumb') {
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
  // card
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

// Anton (per em): ascender 1.177, cap height 0.859. The word keeps the
// font's own line height: with lineHeight = size (the CSS model of §28.16)
// iOS clips everything above the box, the top of the capitals included. In
// the natural box the cap height starts 1.177 − 0.859 = 0.318 × size below
// its top, so the capitals still start at capTop.
const CAP_OFFSET = 0.318;

// Size of the word: measured at the maximum; if it does not fit the useful
// width, maximum × useful ÷ measured, never below the minimum.
export function coverWordSize(measured: number, maxSize: number, minSize: number, available: number): number {
  if (measured <= available) {
    return maxSize;
  }
  return Math.max(minSize, (maxSize * available) / measured);
}

// Thumbnails narrower than this (44 pt pickers) show the line only: the
// word would be a few points tall.
const THUMB_WORD_MIN_WIDTH = 64;

export function RoutineCoverOverlay({
  format,
  width,
  word,
  band,
}: {
  format: RoutineCoverFormat;
  width: number;
  word: string | null;
  // Wide heroes only.
  band?: RoutineCoverBand;
}) {
  // Width of the word at the maximum size, keyed by word and size.
  const [measured, setMeasured] = useState<{ key: string; width: number } | null>(null);
  const m = width ? metrics(format, width, band) : null;
  if (!m) {
    return null;
  }
  const shown =
    m.maxSize < m.minSize || (format === 'thumb' && width < THUMB_WORD_MIN_WIDTH) ? null : word;
  const key = `${shown}|${Math.round(m.maxSize)}`;
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
      {shown ? (
        <>
          {/* Measure at the maximum, off screen and without wrapping. */}
          <View style={styles.measure}>
            <Text
              allowFontScaling={false}
              style={[styles.word, { fontSize: m.maxSize }]}
              onTextLayout={onMeasure}
            >
              {shown}
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
                opacity: known === null ? 0 : 1,
              },
            ]}
          >
            {shown}
          </Text>
        </>
      ) : null}
    </View>
  );
}

// The whole cover at its aspect (detail 3:4, card 7:3) or filling its parent
// (thumb), with `children` on top (the card's badge). Wide heroes draw the
// background and RoutineCoverOverlay themselves, with their band.
export function RoutineCover({
  format,
  word,
  focus,
  gender,
  style,
  children,
}: {
  format: Exclude<RoutineCoverFormat, 'wide'>;
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
      style={[
        styles.cover,
        format === 'thumb'
          ? StyleSheet.absoluteFill
          : { aspectRatio: format === 'detail' ? 3 / 4 : 7 / 3 },
        style,
      ]}
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
