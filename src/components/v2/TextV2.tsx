import { Text, type TextProps } from 'react-native';
import { useThemeV2 } from '@app/components/v2/useThemeV2';
import type { ThemeV2 } from '@app/theme/v2';

export type TextVariant = keyof ThemeV2['type'];
export type TextTone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'bodySoft'
  | 'disabled'
  | 'ember'
  | 'recovery'
  | 'inverse';

export function resolveTextTone(theme: ThemeV2, tone: TextTone): string {
  const { colors, mode } = theme;

  switch (tone) {
    case 'ember':
      // Ember as text: deep on light surfaces, light on dark ones (D-23).
      return mode === 'light' ? colors.ember.deep : colors.ember.textOnDark;
    case 'recovery':
      return mode === 'light'
        ? colors.recovery.tintText
        : colors.recovery.light;
    case 'inverse':
      return colors.cta.primaryText;
    default:
      return colors.text[tone];
  }
}

export type TextV2Props = TextProps & {
  variant?: TextVariant;
  tone?: TextTone;
  color?: string;
  align?: 'left' | 'center' | 'right';
};

// Base text of the v2 system: system font, tabular figures, v2 scale.
export function TextV2({
  variant = 'body',
  tone = 'primary',
  color,
  align,
  style,
  ...props
}: TextV2Props) {
  const theme = useThemeV2();

  return (
    <Text
      {...props}
      style={[
        theme.type[variant],
        { color: color ?? resolveTextTone(theme, tone) },
        align ? { textAlign: align } : null,
        style,
      ]}
    />
  );
}

export function Eyebrow({
  tone = 'secondary',
  ...props
}: Omit<TextV2Props, 'variant'>) {
  return <TextV2 {...props} variant="eyebrow" tone={tone} />;
}
