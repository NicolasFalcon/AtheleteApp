import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@app/hooks/useAppTheme';

type LoaderProps = {
  label?: string;
};

export function Loader({ label = 'Cargando...' }: LoaderProps) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      padding: theme.spacing.xl,
    },
    label: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
    },
  });

  return (
    <View style={styles.container}>
      <ActivityIndicator color={theme.colors.accent} size="large" />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}
