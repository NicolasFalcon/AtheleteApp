import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Check, type LucideIcon } from 'lucide-react-native';
import { haptics } from '@app/components/v2/haptics';
import { PressableScale } from '@app/components/v2/PressableScale';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';
import type { ThemeV2 } from '@app/theme/v2';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'text'
  | 'commit'
  | 'onScene';
export type ButtonSize = 'lg' | 'md' | 'sm';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconPosition?: 'start' | 'end';
  loading?: boolean;
  loadingLabel?: string;
  success?: boolean;
  successLabel?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

const SIZES = {
  lg: { height: 56, paddingX: 24, icon: 17, text: 'cta' },
  md: { height: 48, paddingX: 20, icon: 15, text: 'bodyStrong' },
  sm: { height: 32, paddingX: 12, icon: 14, text: 'metaStrong' },
} as const;

function palette(theme: ThemeV2, variant: ButtonVariant) {
  const { colors, mode, scene } = theme;
  const inScene = mode === 'scene';

  switch (variant) {
    case 'secondary':
      return {
        bg: inScene ? scene.glass.onPhoto : colors.surface.muted,
        fg: colors.text.primary,
        border: undefined,
      };
    case 'outline':
      return {
        bg: 'transparent',
        fg: colors.text.primary,
        border: inScene ? colors.border.onDarkStrong : colors.outline.strong,
      };
    case 'text':
      return { bg: 'transparent', fg: colors.text.primary, border: undefined };
    case 'commit':
      return {
        bg: colors.cta.commit,
        fg: colors.cta.commitText,
        border: undefined,
      };
    case 'onScene':
      return {
        bg: scene.cta.onScene,
        fg: scene.cta.onSceneText,
        border: undefined,
      };
    default:
      return {
        bg: colors.cta.primary,
        fg: colors.cta.primaryText,
        border: undefined,
      };
  }
}

// Primary (56), secondary (44–48) and small outline (32) CTAs, handoff §5.
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = variant === 'primary' || variant === 'commit' ? 'lg' : 'md',
  icon: Icon,
  iconPosition = 'end',
  loading = false,
  loadingLabel,
  success = false,
  successLabel,
  disabled = false,
  fullWidth = size === 'lg',
  haptic = false,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const theme = useThemeV2();
  const sizing = SIZES[size];
  const inactive = disabled || loading;
  const colors = disabled
    ? {
        bg: variant === 'text' ? 'transparent' : theme.colors.surface.muted,
        fg: theme.colors.text.disabled,
        border: undefined,
      }
    : palette(theme, variant);
  const shownLabel = success
    ? successLabel ?? label
    : loading
    ? loadingLabel ?? `${label}…`
    : label;

  const handlePress = () => {
    if (haptic) {
      haptics.light();
    }
    onPress();
  };

  const iconNode = success ? (
    <View
      style={[styles.successDot, { backgroundColor: theme.colors.ember.base }]}
    >
      <Check
        color={theme.colors.ember.onText}
        size={sizing.icon - 3}
        strokeWidth={2.5}
      />
    </View>
  ) : Icon ? (
    <Icon color={colors.fg} size={sizing.icon} strokeWidth={2} />
  ) : null;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={handlePress}
      style={[
        styles.base,
        {
          height: sizing.height,
          paddingHorizontal: variant === 'text' ? 0 : sizing.paddingX,
          backgroundColor: colors.bg,
          borderRadius: theme.radius.pill,
          borderWidth: colors.border ? 1 : 0,
          borderColor: colors.border,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          opacity: loading ? 0.7 : 1,
          boxShadow:
            variant === 'commit' && !disabled ? theme.shadow.commit : undefined,
        },
        style,
      ]}
    >
      {iconPosition === 'start' || success ? iconNode : null}
      <TextV2 variant={sizing.text} color={colors.fg} numberOfLines={1}>
        {shownLabel}
      </TextV2>
      {iconPosition === 'end' && !success ? iconNode : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  successDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
