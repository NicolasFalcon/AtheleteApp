import { darkColorsV2, type ColorsV2 } from '@app/theme/v2/colors';
import { alpha, palette } from '@app/theme/v2/palette';

// Scenes are the dark moments of the product (heroes, active session,
// Core 33, records, official challenges, celebrations, Scan). They are dark
// in both modes: nothing here depends on light/dark (handoff §4).
export const sceneTokens = {
  plate: palette.plate,
  deep: palette.deep,
  deeper: palette.deeper,
  celebration: palette.celebration,
  medal: palette.medal,
  medalAlt: palette.medalAlt,
  dotRing: palette.dotRing,
  onDark: {
    primary: palette.white,
    body: palette.onDarkBody,
    secondary: palette.onDarkSecondary,
    meta: palette.onDarkMeta,
    tertiary: palette.onDarkTertiary,
  },
  cta: {
    // On a scene or a photo the primary CTA is white in both modes.
    onScene: palette.white,
    onSceneText: palette.ink,
  },
  glass: {
    onPhoto: alpha.glassOnPhoto,
    onPhotoStrong: alpha.glassOnPhotoStrong,
  },
  scrim: [alpha.scrimTop, alpha.scrimBottom] as const,
} as const;

export type SceneTokens = typeof sceneTokens;

// Semantic colours for anything rendered inside a scene (see SceneScope).
export const sceneColorsV2: ColorsV2 = {
  ...darkColorsV2,
  bg: palette.plate,
  text: {
    primary: palette.white,
    secondary: palette.onDarkSecondary,
    tertiary: palette.onDarkMeta,
    bodySoft: palette.onDarkBody,
    disabled: palette.darkOutlineControl,
  },
  cta: {
    ...darkColorsV2.cta,
    primary: palette.white,
    primaryText: palette.ink,
  },
};
