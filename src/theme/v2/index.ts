import {
  darkColorsV2,
  lightColorsV2,
  type ColorsV2,
} from '@app/theme/v2/colors';
import {
  sceneColorsV2,
  sceneTokens,
  type SceneTokens,
} from '@app/theme/v2/scene';

export type ThemeModeV2 = 'light' | 'dark';

export type ThemeV2 = {
  // 'scene' only inside a SceneScope (dark in both modes).
  mode: ThemeModeV2 | 'scene';
  colors: ColorsV2;
  scene: SceneTokens;
};

export function createThemeV2(mode: ThemeModeV2): ThemeV2 {
  return {
    mode,
    colors: mode === 'dark' ? darkColorsV2 : lightColorsV2,
    scene: sceneTokens,
  };
}

export function toSceneThemeV2(theme: ThemeV2): ThemeV2 {
  return {
    ...theme,
    mode: 'scene',
    colors: sceneColorsV2,
  };
}

export { darkColorsV2, lightColorsV2, sceneColorsV2, sceneTokens };
export type { ColorsV2, SceneTokens };
export { alpha, gradients, palette } from '@app/theme/v2/palette';
