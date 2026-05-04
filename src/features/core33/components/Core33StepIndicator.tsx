import {StyleSheet, Text, View} from 'react-native';
import {useAppTheme} from '@app/hooks/useAppTheme';

type Core33StepIndicatorProps = {
  currentStep: number;
  totalSteps?: number;
};

export function Core33StepIndicator({
  currentStep,
  totalSteps = 3,
}: Core33StepIndicatorProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      alignSelf: 'center',
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 999,
      backgroundColor: theme.colors.border,
    },
    dotActive: {
      width: 24,
      backgroundColor: theme.colors.accent,
    },
    label: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginLeft: 2,
    },
  });

  return (
    <View style={styles.container}>
      {Array.from({length: totalSteps}, (_, index) => {
        const step = index + 1;
        const active = step === currentStep;
        return (
          <View
            key={step}
            style={[styles.dot, active ? styles.dotActive : null]}
          />
        );
      })}
      <Text style={styles.label}>
        Paso {Math.min(currentStep, totalSteps)} / {totalSteps}
      </Text>
    </View>
  );
}
