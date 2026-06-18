import type { ReactElement } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useAppTheme } from '@app/hooks/useAppTheme';

type ProfileSetupValueInputProps = TextInputProps & {
  icon: ReactElement;
  unit: string;
  error?: string;
};

export function ProfileSetupValueInput({
  icon,
  unit,
  error,
  ...props
}: ProfileSetupValueInputProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme, Boolean(error));

  return (
    <View style={styles.container}>
      <View style={styles.field}>
        <View style={styles.icon}>{icon}</View>
        <TextInput
          keyboardType="decimal-pad"
          placeholderTextColor={theme.colors.textSecondary}
          selectionColor={theme.colors.textPrimary}
          style={styles.input}
          {...props}
        />
        <Text style={styles.unit}>{unit}</Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

type Theme = ReturnType<typeof useAppTheme>['theme'];

function createStyles(theme: Theme, error: boolean) {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.xs,
    },
    field: {
      minHeight: 76,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: error ? theme.colors.danger : theme.colors.border,
      backgroundColor: theme.colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
    },
    icon: {
      width: 30,
      alignItems: 'flex-start',
    },
    input: {
      flex: 1,
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 32,
      fontWeight: theme.typography.weights.semibold,
      textAlign: 'center',
    },
    unit: {
      width: 38,
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      fontWeight: theme.typography.weights.semibold,
      textAlign: 'right',
    },
    error: {
      color: theme.colors.danger,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      textAlign: 'center',
    },
  });
}
