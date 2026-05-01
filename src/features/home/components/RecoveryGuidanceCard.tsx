import {Heart, Sparkles} from 'lucide-react-native';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useAppTheme} from '@app/hooks/useAppTheme';

type RecoveryGuidanceCardProps = {
  onPress: () => void;
};

export function RecoveryGuidanceCard({onPress}: RecoveryGuidanceCardProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      shadowColor: '#000000',
      ...theme.elevations.card,
    },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      flex: 1,
      gap: 4,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      fontWeight: theme.typography.weights.bold,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 17,
    },
    actionBox: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [
        styles.card,
        pressed ? {transform: [{scale: 0.99}]} : null,
      ]}>
      <View style={styles.iconBox}>
        <Heart color={theme.colors.textPrimary} size={20} strokeWidth={2.1} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>Guía de recuperación</Text>
        <Text numberOfLines={2} style={styles.subtitle}>
          ELLIE puede guiarte con recomendaciones orientadas a la recuperación.
        </Text>
      </View>
      <View style={styles.actionBox}>
        <Sparkles color={theme.colors.textPrimary} size={15} strokeWidth={2.2} />
      </View>
    </Pressable>
  );
}
