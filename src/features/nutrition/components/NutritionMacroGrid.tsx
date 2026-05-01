import {StyleSheet, Text, View} from 'react-native';
import {useAppTheme} from '@app/hooks/useAppTheme';

type NutritionMacroGridProps = {
  calories: number;
  protein: number;
  carbs?: number;
  fats?: number;
};

type MetricTileProps = {
  value: string;
  label: string;
};

function MetricTile({value, label}: MetricTileProps) {
  const {theme} = useAppTheme();

  const styles = StyleSheet.create({
    tile: {
      width: '48.5%',
      borderRadius: 18,
      backgroundColor: theme.colors.surfaceMuted,
      paddingHorizontal: 12,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    value: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 25,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: -0.7,
    },
    label: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
    },
  });

  return (
    <View style={styles.tile}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

export function NutritionMacroGrid({
  calories,
  protein,
  carbs,
  fats,
}: NutritionMacroGridProps) {
  const styles = StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      justifyContent: 'space-between',
    },
  });

  return (
    <View style={styles.grid}>
      <MetricTile value={String(calories)} label="kcal/día" />
      <MetricTile value={`${protein}g`} label="Proteína" />
      <MetricTile value={`${carbs || 0}g`} label="Carbohidratos" />
      <MetricTile value={`${fats || 0}g`} label="Grasas" />
    </View>
  );
}
