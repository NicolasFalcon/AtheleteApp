import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@app/hooks/useAppTheme';

type SegmentedOption<T extends string> = {
  key: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  highlighted?: boolean;
};

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  highlighted = false,
}: SegmentedControlProps<T>) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    container: {
      borderRadius: theme.radii.sm,
      backgroundColor: theme.colors.surfaceMuted,
      padding: 4,
      flexDirection: 'row',
      gap: 4,
    },
    option: {
      flex: 1,
      minHeight: 38,
      borderRadius: theme.radii.xs,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.sm,
    },
    optionActive: {
      backgroundColor: theme.colors.accent,
      borderWidth: highlighted ? 1 : 0,
      borderColor: highlighted ? theme.colors.border : 'transparent',
    },
    label: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      fontWeight: theme.typography.weights.medium,
    },
    labelActive: {
      color: theme.colors.accentContrast,
      fontWeight: theme.typography.weights.semibold,
    },
  });

  return (
    <View style={styles.container}>
      {options.map(option => {
        const active = option.key === value;

        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            style={({ pressed }) => [
              styles.option,
              active ? styles.optionActive : null,
              pressed ? { opacity: 0.9 } : null,
            ]}
          >
            <Text style={[styles.label, active ? styles.labelActive : null]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
