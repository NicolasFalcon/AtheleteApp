import { Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@app/hooks/useAppTheme';

type WorkoutsHeaderProps = {
  onCreate: () => void;
};

export function WorkoutsHeader({ onCreate }: WorkoutsHeaderProps) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 20,
      fontWeight: theme.typography.weights.bold,
    },
    button: {
      minHeight: 40,
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.accent,
      paddingHorizontal: 15,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    buttonLabel: {
      color: theme.colors.accentContrast,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      fontWeight: theme.typography.weights.semibold,
    },
  });

  return (
    <View style={styles.row}>
      <Text style={styles.title}>Entrenos</Text>
      <Pressable
        onPress={onCreate}
        style={({ pressed }) => [
          styles.button,
          pressed ? { transform: [{ scale: 0.99 }] } : null,
        ]}
      >
        <Plus color={theme.colors.accentContrast} size={16} strokeWidth={2.4} />
        <Text style={styles.buttonLabel}>Crear</Text>
      </Pressable>
    </View>
  );
}
