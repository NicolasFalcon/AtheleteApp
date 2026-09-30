import type { ViewStyle } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { useAppTheme } from '../src/hooks/useAppTheme';
import { SceneScope, ThemeProvider } from '../src/providers/ThemeProvider';
import { createTheme } from '../src/theme/theme';
import {
  createThemeV2,
  darkColorsV2,
  darkShadowsV2,
  em,
  lightColorsV2,
  lightShadowsV2,
  ringV2,
  sceneColorsV2,
  sceneTokens,
  toSceneThemeV2,
  typeV2,
  type ThemeV2,
} from '../src/theme/v2';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

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

describe('theme v2 · typography, spacing and radii', () => {
  it('uses the system font with tabular figures in every text style', () => {
    for (const textStyle of Object.values(typeV2)) {
      expect(textStyle).not.toHaveProperty('fontFamily');
      expect(textStyle.fontVariant).toEqual(['tabular-nums']);
      expect(textStyle.lineHeight).toBeGreaterThan(0);
    }
  });

  it('converts em tracking from the prototype to points', () => {
    expect(em(0.08, 11)).toBe(0.88);
    expect(typeV2.eyebrow.letterSpacing).toBe(0.88);
    expect(typeV2.eyebrow.textTransform).toBe('uppercase');
    expect(typeV2.displayL.letterSpacing).toBe(-6.16);
  });

  it('keeps the key layout constants of the handoff', () => {
    const { layout, radius, space } = createThemeV2('light');

    expect(layout.gutter).toBe(20);
    expect(layout.sectionGap).toBe(32);
    expect(layout.tabBarHeight).toBe(68);
    expect(radius.tabBar).toBe(34);
    expect(radius.card).toBe(24);
    expect(space.s14).toBe(14);
  });
});

describe('theme v2 · shadows, blur and motion', () => {
  it('defines every shadow in both modes as a valid boxShadow value', () => {
    expect(Object.keys(darkShadowsV2).sort()).toEqual(
      Object.keys(lightShadowsV2).sort(),
    );

    const style: ViewStyle = { boxShadow: lightShadowsV2.subtle };
    expect(style.boxShadow).toContain('rgba');
    expect(ringV2('#FF5B1F')).toBe('0 0 0 2px #FF5B1F');
  });

  it('uses dark elevation inside scenes', () => {
    expect(toSceneThemeV2(createThemeV2('light')).shadow).toBe(darkShadowsV2);
  });

  it('keeps the prototype motion values', () => {
    const { blur, motion, easing } = createThemeV2('light');

    expect(motion.pressScale).toBe(0.97);
    expect(motion.navigation.duration).toBe(360);
    expect(motion.skeleton.duration).toBe(1400);
    expect(easing.navigation).toEqual([0.2, 0.8, 0.2, 1]);
    expect(blur.glass).toBe(20);
    expect(blur.tabBar).toBe(24);
  });
});

describe('theme v2 · scenes', () => {
  it('uses the same scene tokens in light and dark', () => {
    expect(createThemeV2('light').scene).toBe(createThemeV2('dark').scene);
    expect(toSceneThemeV2(createThemeV2('light')).colors).toBe(
      toSceneThemeV2(createThemeV2('dark')).colors,
    );
  });

  it('keeps text on scenes readable and the primary CTA white', () => {
    for (const text of Object.values(sceneTokens.onDark)) {
      expect(contrast(text, sceneTokens.plate)).toBeGreaterThanOrEqual(4.5);
    }
    expect(sceneColorsV2.cta.primary).toBe('#FFFFFF');
    expect(sceneColorsV2.cta.primaryText).toBe('#121212');
  });

  it('switches useAppTheme to scene colours only inside SceneScope', async () => {
    const seen: Record<string, ThemeV2> = {};

    function Probe({ id }: { id: string }) {
      seen[id] = useAppTheme().theme.v2;
      return null;
    }

    await ReactTestRenderer.act(async () => {
      ReactTestRenderer.create(
        <ThemeProvider>
          <Probe id="outside" />
          <SceneScope>
            <Probe id="inside" />
          </SceneScope>
        </ThemeProvider>,
      );
    });

    expect(seen.outside.mode).toBe('light');
    expect(seen.outside.colors).toBe(lightColorsV2);
    expect(seen.inside.mode).toBe('scene');
    expect(seen.inside.colors).toBe(sceneColorsV2);
  });
});
