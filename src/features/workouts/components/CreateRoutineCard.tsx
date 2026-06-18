import { ArrowRight, Plus } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@app/hooks/useAppTheme';

type CreateRoutineCardProps = {
  onPress: () => void;
};

export function CreateRoutineCard({ onPress }: CreateRoutineCardProps) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.accent,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 13,
    },
    icon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.18)',
    },
    copy: {
      flex: 1,
    },
    title: {
      color: theme.colors.accentContrast,
      fontFamily: theme.typography.fontFamily,
      fontSize: 16,
      fontWeight: theme.typography.weights.semibold,
    },
    subtitle: {
      color: theme.colors.accentContrast,
      opacity: 0.68,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 2,
    },
  });

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? { opacity: 0.92 } : null]}
    >
      <View style={styles.icon}>
        <Plus color={theme.colors.accentContrast} size={20} strokeWidth={2.3} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>Crea tu propia rutina</Text>
        <Text style={styles.subtitle}>
          Elige ejercicios, orden y objetivos a tu medida.
        </Text>
      </View>
      <ArrowRight
        color={theme.colors.accentContrast}
        size={18}
        strokeWidth={2.2}
      />
    </Pressable>
  );
}
