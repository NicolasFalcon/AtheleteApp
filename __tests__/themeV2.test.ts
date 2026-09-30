import { createTheme } from '../src/theme/theme';
import { createThemeV2, darkColorsV2, lightColorsV2 } from '../src/theme/v2';

function keyPaths(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [prefix];
  }

  return Object.entries(value).flatMap(([key, child]) =>
    keyPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map(i => {
    const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: string, background: string) {
  const [high, low] = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  );

  return (high + 0.05) / (low + 0.05);
}

describe('theme v2 · colors', () => {
  it('defines the same tokens in light and dark', () => {
    expect(keyPaths(darkColorsV2).sort()).toEqual(
      keyPaths(lightColorsV2).sort(),
    );
  });

  it('is exposed as theme.v2 without altering the legacy theme', () => {
    const light = createTheme('light');
    const dark = createTheme('dark');

    expect(light.v2).toEqual(createThemeV2('light'));
    expect(dark.v2).toEqual(createThemeV2('dark'));

    // Legacy values stay frozen until every screen is migrated.
    expect(light.colors).toEqual({
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
    });
    expect(dark.colors).toEqual({
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
    });
    expect(light.typography.fontFamily).toBe('Inter');
    expect(light.spacing.lg).toBe(20);
    expect(light.radii.md).toBe(16);
  });

  it.each([
    ['light', lightColorsV2],
    ['dark', darkColorsV2],
  ])('keeps readable text contrast in %s', (_mode, colors) => {
    for (const background of [colors.bg, colors.surface.raised]) {
      expect(contrast(colors.text.primary, background)).toBeGreaterThanOrEqual(
        7,
      );
      expect(
        contrast(colors.text.secondary, background),
      ).toBeGreaterThanOrEqual(4.5);
    }

    expect(
      contrast(colors.cta.primaryText, colors.cta.primary),
    ).toBeGreaterThanOrEqual(7);
    expect(
      contrast(colors.ember.onText, colors.ember.base),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps ELLIE secondary text readable on linen (D-17)', () => {
    for (const linen of lightColorsV2.ellie.linen) {
      expect(
        contrast(lightColorsV2.ellie.textSecondary, linen),
      ).toBeGreaterThanOrEqual(4.5);
    }
    for (const linen of darkColorsV2.ellie.linen) {
      expect(
        contrast(darkColorsV2.ellie.textSecondary, linen),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});
