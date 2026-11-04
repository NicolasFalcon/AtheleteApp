import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import LinearGradient from 'react-native-linear-gradient';
import {
  PressableScale,
  TextV2,
  displayLineBox,
  useThemeV2,
} from '@app/components/v2';
import {
  CATEGORY_COVER_FALLBACK,
  type CategoryCover,
} from '@app/features/workouts/workoutAssets';
import type { DisplayStyleV2 } from '@app/theme/v2';

// Card of Entrenos · Por tipo (v2.19 §29.2–29.3): category photo with the
// series treatment, a dark gradient from the bottom and the text drawn by the
// app (Ember bar, name in Anton, routine count). A scene in both modes; Dark
// only adds the 1 pt inner border.
export const CATEGORY_CARD_WIDTH = 164;
const CARD_HEIGHT = 208;
const WIDE_HEIGHT = 150;
// Name box of the vertical card: 164 − 2 × 14 margin.
const NAME_WIDTH = 136;

export function CategoryCard({
  cover,
  name,
  meta,
  wide = false,
  accessibilityLabel,
  onPress,
}: {
  cover?: CategoryCover;
  name: string;
  meta: string;
  // "Tus rutinas": full content width, 150 pt, name at 40.
  wide?: boolean;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const { colors, fonts, mode } = useThemeV2();
  const [broken, setBroken] = useState(false);
  const shown = cover && !broken ? cover : CATEGORY_COVER_FALLBACK;
  const focus = (wide && shown.focusWide) || shown.focus;
  const nameToken = anton(fonts.display, wide ? 40 : 26);
  // Two words → two lines on the vertical card; each line shrinks to fit.
  const lines = wide ? [name] : name.trim().split(/\s+/);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[
        wide ? styles.wide : styles.card,
        mode === 'dark' && styles.darkBorder,
      ]}
    >
      <View style={styles.clip}>
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.treatment]}>
          <Image
            source={shown.image}
            contentFit="cover"
            contentPosition={focus}
            accessibilityIgnoresInvertColors
            onError={() => setBroken(true)}
            style={StyleSheet.absoluteFill}
          />
        </View>
        <LinearGradient
          colors={['rgba(14,13,12,0.92)', 'rgba(14,13,12,0.6)', 'rgba(14,13,12,0)']}
          locations={[0, 0.34, 0.66]}
          start={{ x: 0, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <View style={styles.labels}>
        <View style={[styles.bar, { backgroundColor: colors.ember.base }]} />
        <View style={wide ? null : styles.nameBox}>
          {lines.map((line, index) => (
            <TextV2
              key={`${index}-${line}`}
              color="#F2F0EC"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
              style={[nameToken, displayLineBox(nameToken), styles.name]}
            >
              {line}
            </TextV2>
          ))}
        </View>
        <TextV2 variant="captionStrong" color="#C9C6C0" numberOfLines={1}>
          {meta}
        </TextV2>
      </View>
    </PressableScale>
  );
}

// Anton, caps, line height .98 (§29.3).
function anton(fontFamily: string, fontSize: number): DisplayStyleV2 {
  return {
    fontFamily,
    fontSize,
    fontWeight: Platform.OS === 'ios' ? '700' : '400',
    lineHeight: Math.round(fontSize * 0.98),
    letterSpacing: 0,
    textTransform: 'uppercase',
  };
}

const styles = StyleSheet.create({
  card: {
    width: CATEGORY_CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    backgroundColor: '#141312',
  },
  wide: {
    alignSelf: 'stretch',
    height: WIDE_HEIGHT,
    borderRadius: 20,
    backgroundColor: '#141312',
  },
  darkBorder: {
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07)',
  },
  clip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    overflow: 'hidden',
  },
  // v4 treatment, applied in the app (the files are in colour).
  treatment: {
    filter: [{ grayscale: 0.55 }, { contrast: 1.12 }, { brightness: 0.86 }],
  },
  labels: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    gap: 6,
  },
  bar: {
    width: 22,
    height: 3,
  },
  nameBox: {
    width: NAME_WIDTH,
  },
  name: {
    includeFontPadding: false,
    fontVariant: [],
  },
});
