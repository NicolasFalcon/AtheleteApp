import {Sparkles, UtensilsCrossed} from 'lucide-react-native';
import {StyleSheet, Text, View} from 'react-native';
import {Button, Card} from '@app/components/ui';
import {useAppTheme} from '@app/hooks/useAppTheme';

type NutritionEmptyStateProps = {
  onAskEllie: () => void;
};

export function NutritionEmptyState({
  onAskEllie,
}: NutritionEmptyStateProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      padding: 20,
      borderRadius: 28,
      gap: 14,
      alignItems: 'center',
    },
    iconWrap: {
      width: 58,
      height: 58,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 20,
      fontWeight: theme.typography.weights.bold,
      textAlign: 'center',
    },
    description: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
    },
    hint: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 18,
      textAlign: 'center',
      marginTop: -4,
    },
    button: {
      minHeight: 46,
      borderRadius: theme.radii.pill,
      paddingHorizontal: 18,
      marginTop: 4,
    },
  });

  return (
    <Card style={styles.card}>
      <View style={styles.iconWrap}>
        <UtensilsCrossed color={theme.colors.textSecondary} size={24} />
      </View>
      <Text style={styles.title}>Aún no tienes un plan activo</Text>
      <Text style={styles.description}>
        ELLIE puede prepararte un plan nutricional claro, accionable y ajustado a tu objetivo actual.
      </Text>
      <Text style={styles.hint}>
        Cuando lo actives desde ELLIE, aparecerá aquí con tus macros y guías diarias.
      </Text>
      <Button
        label="Crear plan con ELLIE"
        onPress={onAskEllie}
        fullWidth={false}
        style={styles.button}
        accessoryRight={
          <Sparkles
            color={theme.colors.accentContrast}
            size={15}
            strokeWidth={2.2}
          />
        }
      />
    </Card>
  );
}
