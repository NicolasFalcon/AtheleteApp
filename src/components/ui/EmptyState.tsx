import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@app/hooks/useAppTheme';

type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({title, description}: EmptyStateProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    container: {
      paddingVertical: theme.spacing.xxl,
      paddingHorizontal: theme.spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      borderRadius: theme.radii.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.titleSm,
      fontWeight: theme.typography.weights.bold,
    },
    description: {
      color: theme.colors.textSecondary,
      textAlign: 'center',
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      lineHeight: 23,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}
