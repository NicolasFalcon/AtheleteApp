import { ArrowLeft, Sparkles } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@app/hooks/useAppTheme';

type EllieHeaderProps = {
  onBack?: () => void;
};

export function EllieHeader({ onBack }: EllieHeaderProps) {
  const { theme } = useAppTheme();

  const styles = StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
    },
    brandWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 18,
      fontWeight: theme.typography.weights.bold,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      marginTop: 1,
    },
  });

  return (
    <View style={styles.row}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [
            styles.backButton,
            pressed ? { opacity: 0.85 } : null,
          ]}
        >
          <ArrowLeft
            color={theme.colors.textPrimary}
            size={21}
            strokeWidth={2}
          />
        </Pressable>
      ) : null}
      <View style={styles.brandWrap}>
        <View style={styles.avatar}>
          <Sparkles
            color={theme.colors.textPrimary}
            size={18}
            strokeWidth={2.1}
          />
        </View>
        <View>
          <Text style={styles.title}>ELLIE</Text>
          <Text style={styles.subtitle}>Tu coach IA de fitness</Text>
        </View>
      </View>
    </View>
  );
}
