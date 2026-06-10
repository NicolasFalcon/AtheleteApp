import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useAppTheme } from '@app/hooks/useAppTheme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessoryRight?: ReactNode;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
  textStyle,
  accessoryRight,
}: ButtonProps) {
  const { theme } = useAppTheme();

  const backgroundColor =
    variant === 'primary'
      ? theme.colors.accent
      : variant === 'secondary' || variant === 'outline'
      ? theme.colors.surface
      : 'transparent';

  const borderColor = variant === 'ghost' ? 'transparent' : theme.colors.border;

  const textColor =
    variant === 'primary'
      ? theme.colors.accentContrast
      : theme.colors.textPrimary;

  const styles = StyleSheet.create({
    button: {
      minHeight: 48,
      borderRadius: theme.radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.lg,
      backgroundColor,
      borderWidth: variant === 'ghost' ? 0 : StyleSheet.hairlineWidth,
      borderColor,
      opacity: disabled ? 0.5 : 1,
      width: fullWidth ? '100%' : undefined,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs,
    },
    label: {
      color: textColor,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      fontWeight: theme.typography.weights.semibold,
    },
  });

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        style,
        pressed && !disabled && !loading ? { opacity: 0.88 } : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.content}>
          <Text style={[styles.label, textStyle]}>{label}</Text>
          {accessoryRight}
        </View>
      )}
    </Pressable>
  );
}
