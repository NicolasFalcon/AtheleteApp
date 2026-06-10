import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@app/hooks/useAppTheme';

type ProgressChartTooltipProps = {
  title: string;
  lines: string[];
};

export function ProgressChartTooltip({
  title,
  lines,
}: ProgressChartTooltipProps) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    tooltip: {
      minWidth: 72,
      maxWidth: 120,
      borderRadius: theme.radii.sm,
      paddingHorizontal: 10,
      paddingVertical: 9,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      shadowColor: '#000000',
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
      gap: 2,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      fontWeight: theme.typography.weights.semibold,
      textAlign: 'center',
    },
    line: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      textAlign: 'center',
    },
  });

  return (
    <View style={styles.tooltip}>
      <Text style={styles.title}>{title}</Text>
      {lines.map(line => (
        <Text key={line} style={styles.line}>
          {line}
        </Text>
      ))}
    </View>
  );
}
