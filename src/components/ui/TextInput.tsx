import type { ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
} from 'react-native';
import { useAppTheme } from '@app/hooks/useAppTheme';

type AppTextInputProps = TextInputProps & {
  label: string;
  hint?: string;
  error?: string;
  rightAccessory?: ReactNode;
  inputStyle?: StyleProp<TextStyle>;
};

export function AppTextInput({
  label,
  hint,
  error,
  rightAccessory,
  inputStyle,
  ...props
}: AppTextInputProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    container: {
      gap: theme.spacing.xs,
    },
    label: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      fontWeight: theme.typography.weights.medium,
      textTransform: 'uppercase',
      letterSpacing: 0.7,
    },
    inputWrapper: {
      minHeight: 54,
      borderRadius: theme.radii.md,
      paddingHorizontal: theme.spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: error ? theme.colors.danger : theme.colors.border,
      backgroundColor: theme.colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    input: {
      flex: 1,
      minHeight: 54,
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
    },
    hint: {
      color: error ? theme.colors.danger : theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
    },
    rightAccessory: {
      paddingVertical: theme.spacing.xs,
      paddingLeft: theme.spacing.xs,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          placeholderTextColor={theme.colors.textSecondary}
          style={[styles.input, inputStyle]}
          {...props}
        />
        {rightAccessory ? <View style={styles.rightAccessory}>{rightAccessory}</View> : null}
      </View>
      {error || hint ? <Text style={styles.hint}>{error ?? hint}</Text> : null}
    </View>
  );
}
