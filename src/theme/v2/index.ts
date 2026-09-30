import {
  darkColorsV2,
  lightColorsV2,
  type ColorsV2,
} from '@app/theme/v2/colors';
import { blurV2, type BlurV2 } from '@app/theme/v2/blur';
import {
  easingV2,
  motionV2,
  type EasingV2,
  type MotionV2,
} from '@app/theme/v2/motion';
import { radiusV2, type RadiusV2 } from '@app/theme/v2/radii';
import {
  sceneColorsV2,
  sceneTokens,
  type SceneTokens,
} from '@app/theme/v2/scene';
import {
  darkShadowsV2,
  lightShadowsV2,
  type ShadowsV2,
} from '@app/theme/v2/shadows';
import {
  layoutV2,
  spaceV2,
  type LayoutV2,
  type SpaceV2,
} from '@app/theme/v2/spacing';
import { typeV2, type TypeV2 } from '@app/theme/v2/typography';

export type ThemeModeV2 = 'light' | 'dark';

export type ThemeV2 = {
  // 'scene' only inside a SceneScope (dark in both modes).
  mode: ThemeModeV2 | 'scene';
  colors: ColorsV2;
  scene: SceneTokens;
  type: TypeV2;
  space: SpaceV2;
  layout: LayoutV2;
  radius: RadiusV2;
  shadow: ShadowsV2;
  blur: BlurV2;
  motion: MotionV2;
  easing: EasingV2;
};

export function createThemeV2(mode: ThemeModeV2): ThemeV2 {
  return {
    mode,
    colors: mode === 'dark' ? darkColorsV2 : lightColorsV2,
    scene: sceneTokens,
    type: typeV2,
    space: spaceV2,
    layout: layoutV2,
    radius: radiusV2,
    shadow: mode === 'dark' ? darkShadowsV2 : lightShadowsV2,
    blur: blurV2,
    motion: motionV2,
    easing: easingV2,
  };
}

export function toSceneThemeV2(theme: ThemeV2): ThemeV2 {
  return {
    ...theme,
    mode: 'scene',
    colors: sceneColorsV2,
    shadow: darkShadowsV2,
  };
}

export { darkColorsV2, lightColorsV2, sceneColorsV2, sceneTokens };
export { layoutV2, radiusV2, spaceV2, typeV2 };
export { blurV2, darkShadowsV2, easingV2, lightShadowsV2, motionV2 };
export { ringV2 } from '@app/theme/v2/shadows';
export type { ColorsV2, SceneTokens, ShadowsV2 };
export type { TextStyleV2 } from '@app/theme/v2/typography';
export { em } from '@app/theme/v2/typography';
export { alpha, gradients, palette } from '@app/theme/v2/palette';
