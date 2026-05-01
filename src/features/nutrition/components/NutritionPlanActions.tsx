import {Alert, StyleSheet, Text, View} from 'react-native';
import {Sparkles} from 'lucide-react-native';
import {Button, Card} from '@app/components/ui';
import {useAppTheme} from '@app/hooks/useAppTheme';

type NutritionPlanActionsProps = {
  onAskEllie: () => void;
  onDeactivate: () => Promise<void>;
  isDeactivating?: boolean;
};

export function NutritionPlanActions({
  onAskEllie,
  onDeactivate,
  isDeactivating = false,
}: NutritionPlanActionsProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      padding: 18,
      borderRadius: 26,
      gap: 14,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 15,
      fontWeight: theme.typography.weights.bold,
    },
    text: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 18,
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
    },
    button: {
      flex: 1,
      minHeight: 44,
      borderRadius: theme.radii.pill,
    },
    buttonText: {
      fontSize: 13,
    },
    dangerText: {
      color: '#B14141',
    },
  });

  const confirmDeactivate = () => {
    Alert.alert(
      '¿Cancelar tu plan actual?',
      'Volverás al estado sin plan nutricional activo. Tus registros diarios se mantendrán guardados.',
      [
        {text: 'Mantener plan', style: 'cancel'},
        {
          text: 'Confirmar cancelación',
          style: 'destructive',
          onPress: () => {
            onDeactivate().catch(() => undefined);
          },
        },
      ],
    );
  };

  return (
    <Card style={styles.card}>
      <View>
        <Text style={styles.title}>Estado del plan</Text>
        <Text style={styles.text}>
          Si quieres ajustar macros o rehacer la estrategia, puedes pedirle una nueva versión a ELLIE o cancelar este plan actual.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          label="Pedir ajuste a ELLIE"
          onPress={onAskEllie}
          variant="outline"
          style={styles.button}
          textStyle={styles.buttonText}
          accessoryRight={
            <Sparkles color={theme.colors.textPrimary} size={15} strokeWidth={2.1} />
          }
        />
        <Button
          label={isDeactivating ? 'Cancelando...' : 'Cancelar plan'}
          onPress={confirmDeactivate}
          variant="secondary"
          disabled={isDeactivating}
          style={styles.button}
          textStyle={[styles.buttonText, styles.dangerText]}
        />
      </View>
    </Card>
  );
}
