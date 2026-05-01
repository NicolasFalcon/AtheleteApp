import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useAppTheme} from '@app/hooks/useAppTheme';

type Option<T extends string> = {
  key: T;
  label: string;
};

type WorkoutSegmentedControlProps<T extends string> = {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  highlighted?: boolean;
};

export function WorkoutSegmentedControl<T extends string>({
  value,
  options,
  onChange,
  highlighted = false,
}: WorkoutSegmentedControlProps<T>) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    shell: {
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.surfaceMuted,
      padding: 4,
      flexDirection: 'row',
      gap: 4,
    },
    option: {
      flex: 1,
      minHeight: 38,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.sm,
    },
    optionActive: {
      backgroundColor: theme.colors.accent,
      borderWidth: highlighted ? 1.5 : 0,
      borderColor: highlighted ? '#D89B1D' : 'transparent',
      shadowColor: highlighted ? '#D89B1D' : '#000000',
      shadowOpacity: highlighted ? 0.16 : 0,
      shadowRadius: highlighted ? 8 : 0,
      shadowOffset: {width: 0, height: 2},
    },
    label: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      fontWeight: theme.typography.weights.medium,
    },
    labelActive: {
      color: theme.colors.accentContrast,
      fontWeight: theme.typography.weights.semibold,
    },
  });

  return (
    <View style={styles.shell}>
      {options.map(option => {
        const active = option.key === value;

        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            style={({pressed}) => [
              styles.option,
              active ? styles.optionActive : null,
              pressed ? {opacity: 0.92} : null,
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
