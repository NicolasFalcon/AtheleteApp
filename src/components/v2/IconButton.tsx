import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { ArrowLeft, type LucideIcon } from 'lucide-react-native';
import { PressableScale } from '@app/components/v2/PressableScale';
import { useThemeV2 } from '@app/components/v2/useThemeV2';

export type IconButtonVariant = 'muted' | 'glass' | 'solid';

export type IconButtonProps = {
  icon: LucideIcon;
  accessibilityLabel: string;
  onPress: () => void;
  variant?: IconButtonVariant;
  size?: 44 | 36;
  badge?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

// Circular 44 pt button (36 inside sheets), handoff §5 "Icon Button".
export function IconButton({
  icon: Icon,
  accessibilityLabel,
  onPress,
  variant = 'muted',
  size = 44,
  badge = false,
  disabled = false,
  style,
}: IconButtonProps) {
  const theme = useThemeV2();
  const { colors, scene } = theme;
  const background =
    variant === 'glass'
      ? scene.glass.onPhoto
      : variant === 'solid'
      ? colors.cta.primary
      : colors.surface.muted;
  const iconColor =
    variant === 'glass'
      ? scene.onDark.primary
      : variant === 'solid'
      ? colors.cta.primaryText
      : colors.text.primary;
  const radius = size / 2;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={size < 44 ? (44 - size) / 2 : undefined}
      onPress={onPress}
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor:
            variant === 'glass' && Platform.OS === 'ios'
              ? 'transparent'
              : background,
          opacity: disabled ? 0.35 : 1,
        },
        style,
      ]}
    >
      {variant === 'glass' && Platform.OS === 'ios' ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: radius, overflow: 'hidden' },
          ]}
        >
          <BlurView
            style={StyleSheet.absoluteFill}
            blurType="light"
            blurAmount={theme.blur.glass}
            reducedTransparencyFallbackColor={background}
          />
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: background }]}
          />
        </View>
      ) : null}
      <Icon color={iconColor} size={size === 44 ? 20 : 18} strokeWidth={2} />
      {badge ? (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: colors.ember.base,
              borderColor: variant === 'glass' ? scene.dotRing : background,
            },
          ]}
        />
      ) : null}
    </PressableScale>
  );
}

export type BackButtonProps = {
  onPress: () => void;
  variant?: 'muted' | 'glass';
  accessibilityLabel?: string;
};

export function BackButton({
  onPress,
  variant = 'muted',
  accessibilityLabel = 'Volver',
}: BackButtonProps) {
  return (
    <IconButton
      icon={ArrowLeft}
      variant={variant}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    // 8 pt dot + 2 pt ring, as in the prototype.
    top: 6,
    right: 7,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
});
