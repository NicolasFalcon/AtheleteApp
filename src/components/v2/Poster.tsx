import type { ReactNode } from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { DisplayTitle } from '@app/components/v2/DisplayTitle';
import { Isologo } from '@app/components/v2/Isologo';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';
import { em, type DisplaySize } from '@app/theme/v2/typography';

// Poster pieces of Auth v2 and the Intro: brand lockup, black-and-white
// photo and the caps headline with the Ember accent.

// Isologo + "ATHELETE" with wide tracking.
export function BrandLockup() {
  const { colors, type } = useThemeV2();

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Athelete"
      style={styles.brand}
    >
      <Isologo size={36} color={colors.text.primary} />
      <TextV2
        color={colors.text.primary}
        style={{
          fontSize: type.bodyStrong.fontSize,
          fontWeight: '500',
          letterSpacing: em(0.32, type.bodyStrong.fontSize),
        }}
      >
        ATHELETE
      </TextV2>
    </View>
  );
}

// The photo in black and white: a zero-saturation layer in saturation mode
// over it (isolated, so only the photo is affected). `children` go on top
// (scrims).
export function MonoPhoto({
  source,
  style,
  children,
}: {
  source: ImageSourcePropType;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  return (
    <View pointerEvents="none" style={[styles.photo, style]}>
      <Image
        source={source}
        resizeMode="cover"
        style={styles.image}
        accessibilityIgnoresInvertColors
      />
      <View style={styles.grayscale} />
      {children}
    </View>
  );
}

export type PosterTitleProps = {
  // Small Ember caps next to the accent line (Intro).
  eyebrow?: string;
  // Lines in the text colour, then lines in Ember.
  headline: string[];
  accent: string[];
  // Spaced caps under the headline.
  subtitle?: string[];
  // Anton size: Login displayXL (62), Intro displayL (60), Crear cuenta
  // displayM (58).
  display: DisplaySize;
  // 'compact': one step down for short phones (XL → L → M).
  size?: 'regular' | 'compact';
};

const STEP_DOWN: Record<DisplaySize, DisplaySize> = {
  displayXL: 'displayL',
  displayL: 'displayM',
  displayM: 'displayM',
  displayS: 'displayS',
};

export function PosterTitle({
  eyebrow,
  headline,
  accent,
  subtitle,
  display,
  size = 'regular',
}: PosterTitleProps) {
  const { colors, type } = useThemeV2();
  const bar = (
    <View style={[styles.accentBar, { backgroundColor: colors.ember.base }]} />
  );

  return (
    <View>
      {eyebrow ? (
        <View style={styles.eyebrowRow}>
          {bar}
          <TextV2
            variant="micro"
            color={colors.ember.base}
            style={[
              styles.eyebrow,
              { letterSpacing: em(0.2, type.micro.fontSize) },
            ]}
          >
            {eyebrow}
          </TextV2>
        </View>
      ) : (
        <View style={styles.barOnly}>{bar}</View>
      )}
      <DisplayTitle
        lines={headline}
        accent={accent}
        size={size === 'compact' ? STEP_DOWN[display] : display}
      />
      {subtitle ? (
        <View style={styles.subtitle}>
          {subtitle.map(line => (
            <TextV2
              key={line}
              variant="eyebrow"
              color={colors.text.primary}
              style={{ letterSpacing: em(0.2, type.eyebrow.fontSize) }}
            >
              {line}
            </TextV2>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  photo: {
    overflow: 'hidden',
    isolation: 'isolate',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  grayscale: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#000000',
    mixBlendMode: 'saturation',
  },
  accentBar: {
    width: 28,
    height: 4,
  },
  barOnly: {
    marginBottom: 14,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  eyebrow: {
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 14,
    gap: 4,
  },
});
