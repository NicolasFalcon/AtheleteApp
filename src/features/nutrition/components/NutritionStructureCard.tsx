import {StyleSheet, Text, View} from 'react-native';
import {Card} from '@app/components/ui';
import {useAppTheme} from '@app/hooks/useAppTheme';
import type {NutritionMealBlock} from '@app/features/nutrition/nutritionPlanContent';

type NutritionStructureCardProps = {
  meals: NutritionMealBlock[];
};

export function NutritionStructureCard({
  meals,
}: NutritionStructureCardProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    card: {
      padding: 18,
      borderRadius: 26,
      gap: 12,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 16,
      fontWeight: theme.typography.weights.bold,
    },
    rows: {
      gap: 0,
    },
    row: {
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      gap: 4,
    },
    rowLast: {
      paddingBottom: 0,
      borderBottomWidth: 0,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    mealName: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      fontWeight: theme.typography.weights.semibold,
    },
    mealRange: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
    },
    mealHint: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 18,
    },
  });

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Estructura diaria</Text>
      <View style={styles.rows}>
        {meals.map((meal, index) => (
          <View
            key={meal.name}
            style={[
              styles.row,
              index === meals.length - 1 ? styles.rowLast : null,
            ]}>
            <View style={styles.topRow}>
              <Text style={styles.mealName}>{meal.name}</Text>
              <Text style={styles.mealRange}>{meal.kcalRange}</Text>
            </View>
            <Text style={styles.mealHint}>{meal.guideline}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}
