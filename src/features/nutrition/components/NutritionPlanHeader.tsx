import {ArrowLeft, UtensilsCrossed} from 'lucide-react-native';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useAppTheme} from '@app/hooks/useAppTheme';

type NutritionPlanHeaderProps = {
  subtitle: string;
  onBack: () => void;
};

export function NutritionPlanHeader({
  subtitle,
  onBack,
}: NutritionPlanHeaderProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    iconWrap: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textWrap: {
      flex: 1,
      gap: 2,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 30,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: -0.9,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 13,
      lineHeight: 18,
    },
  });

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onBack}
        style={({pressed}) => [
          styles.backButton,
          pressed ? {opacity: 0.88} : null,
        ]}>
        <ArrowLeft color={theme.colors.textPrimary} size={20} strokeWidth={2} />
      </Pressable>
      <View style={styles.iconWrap}>
        <UtensilsCrossed
          color={theme.colors.textPrimary}
          size={18}
          strokeWidth={2.1}
        />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>Plan de nutrición</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}
