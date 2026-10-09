import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { haptics } from '@app/components/v2/haptics';
import { LivingHalo } from '@app/components/v2/LivingHalo';
import { PressableScale } from '@app/components/v2/PressableScale';
import { TextV2 } from '@app/components/v2/TextV2';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

// Action powered by ELLIE (handoff v2.12 §22.2). Every action that calls the
// AI carries the mini Living Halo on the left instead of sparkles.
// - `primary`: Ember pill (`ember.strong`, white text 15–17/600), Halo 20–22,
//   10 pt gap, no extra glow.
// - `compact`: Halo + Ember-accent text, no fill.
export type EllieActionButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'compact';
  size?: 'lg' | 'md';
  loading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

const SIZES = {
  lg: { height: 56, paddingX: 24, halo: 22, text: 'cta' },
  md: { height: 48, paddingX: 20, halo: 20, text: 'bodyStrong' },
} as const;

export function EllieActionButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingLabel,
  disabled = false,
  fullWidth = false,
  style,
  accessibilityLabel,
}: EllieActionButtonProps) {
  const { colors, mode, radius } = useThemeV2();
  const sizing = SIZES[size];
  const compact = variant === 'compact';
  const inactive = disabled || loading;
  const fg = compact
    ? mode === 'dark'
      ? colors.ember.textOnDark
      : colors.ember.deep
    : '#FFFFFF';
  const shown = loading ? loadingLabel ?? `${label}…` : label;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      style={[
        styles.base,
        {
          height: compact ? 44 : sizing.height,
          paddingHorizontal: compact ? 0 : sizing.paddingX,
          borderRadius: radius.pill,
          backgroundColor: compact ? 'transparent' : colors.ember.strong,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          opacity: disabled ? 0.45 : loading ? 0.7 : 1,
        },
        style,
      ]}
    >
      <LivingHalo size={sizing.halo} state={loading ? 'thinking' : 'idle'} />
      <TextV2 variant={sizing.text} color={fg} numberOfLines={1}>
        {shown}
      </TextV2>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
});
