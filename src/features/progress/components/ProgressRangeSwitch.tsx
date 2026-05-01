import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useAppTheme} from '@app/hooks/useAppTheme';

type ProgressRange = 'week' | 'month';

type ProgressRangeSwitchProps = {
  value: ProgressRange;
  onChange: (value: ProgressRange) => void;
};

export function ProgressRangeSwitch({
  value,
  onChange,
}: ProgressRangeSwitchProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    option: {
      minHeight: 32,
      borderRadius: theme.radii.pill,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
    },
    optionActive: {
      backgroundColor: theme.colors.accent,
    },
    label: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      fontWeight: theme.typography.weights.medium,
    },
    labelActive: {
      color: theme.colors.accentContrast,
      fontWeight: theme.typography.weights.semibold,
    },
  });

  return (
    <View style={styles.container}>
      {[
        {key: 'week' as const, label: 'Semana'},
        {key: 'month' as const, label: 'Mes'},
      ].map(option => {
        const active = option.key === value;

        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            style={({pressed}) => [
              styles.option,
              active ? styles.optionActive : null,
              pressed ? {opacity: 0.9} : null,
            ]}>
            <Text style={[styles.label, active ? styles.labelActive : null]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
