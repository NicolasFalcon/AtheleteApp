import { StyleSheet, View } from 'react-native';
import { useAppTheme } from '@app/hooks/useAppTheme';

type OnboardingProgressProps = {
  step: number;
  total?: number;
};

export function OnboardingProgress({
  step,
  total = 4,
}: OnboardingProgressProps) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
    },
    segment: {
      flex: 1,
      height: 6,
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.surfaceMuted,
    },
    segmentActive: {
      backgroundColor: theme.colors.textPrimary,
    },
  });

  return (
    <View style={styles.row}>
      {Array.from({ length: total }, (_, index) => (
        <View
          key={index}
          style={[
            styles.segment,
            index <= step ? styles.segmentActive : null,
          ]}
        />
      ))}
    </View>
  );
}
