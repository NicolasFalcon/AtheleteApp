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
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: theme.spacing.md,
    },
    copy: {
      flex: 1,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 25,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: -0.8,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 3,
    },
    button: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 2,
    },
  });

  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        {/* <Text style={styles.eyebrow}>Explorar</Text> */}
        <Text style={styles.title}>Entrenos</Text>
        <Text style={styles.subtitle}>
          Encuentra tu próxima sesión o crea una propia.
        </Text>
      </View>
      <Pressable
        accessibilityLabel="Crear rutina"
        accessibilityRole="button"
        onPress={onCreate}
        style={({ pressed }) => [
          styles.button,
          pressed ? { transform: [{ scale: 0.99 }] } : null,
        ]}
      >
        <Plus color={theme.colors.accentContrast} size={19} strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}
