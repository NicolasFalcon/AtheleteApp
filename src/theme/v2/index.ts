import {
  darkColorsV2,
  lightColorsV2,
  type ColorsV2,
} from '@app/theme/v2/colors';

export type ThemeModeV2 = 'light' | 'dark';

export type ThemeV2 = {
  mode: ThemeModeV2;
  colors: ColorsV2;
};

export function createThemeV2(mode: ThemeModeV2): ThemeV2 {
  return {
    mode,
    colors: mode === 'dark' ? darkColorsV2 : lightColorsV2,
  };
}

export { darkColorsV2, lightColorsV2 };
export type { ColorsV2 };
export { alpha, gradients, palette } from '@app/theme/v2/palette';
