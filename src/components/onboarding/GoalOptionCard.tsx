import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@app/hooks/useAppTheme';

type GoalOptionCardProps = {
  emoji: string;
  label: string;
  selected: boolean;
  onPress: () => void;
};

export function GoalOptionCard({
  emoji,
  label,
  selected,
  onPress,
}: GoalOptionCardProps) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: selected ? theme.colors.textPrimary : theme.colors.border,
      backgroundColor: selected ? 'rgba(17, 17, 17, 0.04)' : theme.colors.surface,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.lg,
    },
    emoji: {
      fontSize: 24,
    },
    label: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      fontWeight: theme.typography.weights.semibold,
    },
  });

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <Text style={styles.emoji}>{emoji}</Text>
      <View>
        <Text style={styles.label}>{label}</Text>
      </View>
    </Pressable>
  );
}
