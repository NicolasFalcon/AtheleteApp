import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@app/hooks/useAppTheme';

type FormMessageTone = 'error' | 'success' | 'neutral';

type FormMessageProps = {
  message: string;
  tone?: FormMessageTone;
};

export function FormMessage({
  message,
  tone = 'neutral',
}: FormMessageProps) {
  const { theme } = useAppTheme();

  const backgroundColor =
    tone === 'error'
      ? 'rgba(167, 58, 58, 0.08)'
      : tone === 'success'
        ? 'rgba(46, 107, 76, 0.08)'
        : theme.colors.surface;

  const borderColor =
    tone === 'error'
      ? 'rgba(167, 58, 58, 0.22)'
      : tone === 'success'
        ? 'rgba(46, 107, 76, 0.24)'
        : theme.colors.border;

  const textColor =
    tone === 'error'
      ? theme.colors.danger
      : tone === 'success'
        ? theme.colors.success
        : theme.colors.textSecondary;

  const styles = StyleSheet.create({
    container: {
      borderRadius: theme.radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor,
      backgroundColor,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
    },
    text: {
      color: textColor,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      lineHeight: 20,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}
