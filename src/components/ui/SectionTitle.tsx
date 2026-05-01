import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@app/hooks/useAppTheme';

type SectionTitleProps = {
  title: string;
  subtitle?: string;
};

export function SectionTitle({title, subtitle}: SectionTitleProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    container: {
      gap: theme.spacing.xs,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.titleSm,
      fontWeight: theme.typography.weights.bold,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      lineHeight: 23,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}
