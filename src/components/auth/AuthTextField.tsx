import { cloneElement, useState, type ReactElement } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { EyeIcon, EyeOffIcon } from '@app/assets/icons';
import { useAppTheme } from '@app/hooks/useAppTheme';

type AuthTextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  icon: ReactElement<{ color?: string }>;
  passwordToggle?: boolean;
};

export function AuthTextField({
  label,
  error,
  icon,
  passwordToggle = false,
  secureTextEntry,
  onFocus,
  onBlur,
  ...props
}: AuthTextFieldProps) {
  const { theme } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isSecure = passwordToggle ? !passwordVisible : secureTextEntry;
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.field,
          focused ? styles.fieldFocused : null,
          error ? styles.fieldError : null,
        ]}
      >
        <View style={styles.icon}>
          {cloneElement(icon, { color: theme.colors.textSecondary })}
        </View>
        <TextInput
          autoCorrect={false}
          onBlur={event => {
            setFocused(false);
            onBlur?.(event);
          }}
          onFocus={event => {
            setFocused(true);
            onFocus?.(event);
          }}
          placeholderTextColor={theme.colors.textSecondary}
          secureTextEntry={isSecure}
          selectionColor={theme.colors.textPrimary}
          style={styles.input}
          {...props}
        />
        {passwordToggle ? (
          <Pressable
            accessibilityLabel={
              passwordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'
            }
            hitSlop={10}
            onPress={() => setPasswordVisible(current => !current)}
            style={styles.toggle}
          >
            {passwordVisible ? (
              <EyeOffIcon color={theme.colors.textSecondary} />
            ) : (
              <EyeIcon color={theme.colors.textSecondary} />
            )}
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

type Theme = ReturnType<typeof useAppTheme>['theme'];

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.xs,
    },
    label: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      fontWeight: theme.typography.weights.medium,
    },
    field: {
      minHeight: 56,
      borderRadius: theme.radii.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
    },
    fieldFocused: {
      borderColor: theme.colors.textPrimary,
      backgroundColor: theme.colors.surfaceMuted,
    },
    fieldError: {
      borderColor: theme.colors.danger,
    },
    icon: {
      width: 24,
      height: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.sm,
    },
    input: {
      flex: 1,
      minHeight: 54,
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      paddingVertical: 0,
    },
    toggle: {
      width: 36,
      height: 44,
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    error: {
      color: theme.colors.danger,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      lineHeight: 16,
    },
  });
}
