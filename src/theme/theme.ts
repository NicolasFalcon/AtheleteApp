import { elevations, radii, spacing, typography } from '@app/theme/tokens';
import { createThemeV2, type ThemeV2 } from '@app/theme/v2';

export type ThemeMode = 'light' | 'dark';

type ThemeColors = {
  background: string;
  surface: string;
  surfaceMuted: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  accent: string;
  accentContrast: string;
  danger: string;
  success: string;
};

export type AppTheme = {
  mode: ThemeMode;
  colors: ThemeColors;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  elevations: typeof elevations;
  // ATHELETE v2 · Alive Minimalism tokens. The keys above stay until every
  // screen is migrated (docs/migration/MIGRATION_PROGRESS.md).
  v2: ThemeV2;
};

const lightColors: ThemeColors = {
  background: '#FCFCFB',
  surface: '#FFFFFF',
  surfaceMuted: '#F7F7F5',
  textPrimary: '#111111',
  textSecondary: '#66635B',
  border: 'rgba(17,17,17,0.06)',
  accent: '#111111',
  accentContrast: '#FFFFFF',
  danger: '#A73A3A',
  success: '#2E6B4C',
};

const darkColors: ThemeColors = {
  background: '#080808',
  surface: '#121212',
  surfaceMuted: '#1A1A1A',
  textPrimary: '#F6F4EE',
  textSecondary: '#B1AEA6',
  border: '#2B2B2B',
  accent: '#F6F4EE',
  accentContrast: '#121212',
  danger: '#D86B6B',
  success: '#74C198',
};

export function createTheme(mode: ThemeMode): AppTheme {
  return {
    mode,
    colors: mode === 'dark' ? darkColors : lightColors,
    spacing,
    radii,
    typography,
    elevations,
    v2: createThemeV2(mode),
  };
}
