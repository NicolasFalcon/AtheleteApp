import {Edit3, Plus} from 'lucide-react-native';
import {StyleSheet, Text, View} from 'react-native';
import {Button, Card, ProgressBar} from '@app/components/ui';
import {useAppTheme} from '@app/hooks/useAppTheme';
import type {DailyNutritionLog, NutritionPlan} from '@app/shared';

type NutritionDailySummaryCardProps = {
  plan: NutritionPlan;
  todayLog: DailyNutritionLog | null;
  onLogPress: () => void;
};

function formatValue(value: number | undefined, unit: string) {
  return `${Math.round(value || 0).toLocaleString('es-CL')} ${unit}`;
}

export function NutritionDailySummaryCard({
  plan,
  todayLog,
  onLogPress,
}: NutritionDailySummaryCardProps) {
  const {theme} = useAppTheme();
  const hasLog = Boolean(
    todayLog &&
      ((todayLog.calories || 0) > 0 ||
        (todayLog.protein || 0) > 0 ||
        (todayLog.carbs || 0) > 0 ||
        (todayLog.fats || 0) > 0),
  );
  const macros = [
    {
      label: 'Calorías',
      current: todayLog?.calories || 0,
      goal: plan.targetCalories,
      unit: 'kcal',
    },
    {
      label: 'Proteína',
      current: todayLog?.protein || 0,
      goal: plan.targetProtein,
      unit: 'g',
    },
    ...(plan.targetCarbs != null
      ? [
          {
            label: 'Carbos',
            current: todayLog?.carbs || 0,
            goal: plan.targetCarbs,
            unit: 'g',
          },
        ]
      : []),
    ...(plan.targetFats != null
      ? [
          {
            label: 'Grasas',
            current: todayLog?.fats || 0,
            goal: plan.targetFats,
            unit: 'g',
          },
        ]
      : []),
  ];

  const styles = StyleSheet.create({
    card: {
      padding: 18,
      borderRadius: 26,
      gap: 14,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    headerCopy: {
      flex: 1,
    },
    eyebrow: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 10,
      fontWeight: theme.typography.weights.semibold,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 17,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: -0.3,
      marginTop: 3,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 4,
    },
    status: {
      alignSelf: 'flex-start',
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.surfaceMuted,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    statusText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      fontWeight: theme.typography.weights.semibold,
    },
    macroList: {
      gap: 10,
    },
    macroHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    macroName: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      fontWeight: theme.typography.weights.semibold,
    },
    macroValue: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
    },
    button: {
      minHeight: 46,
      borderRadius: theme.radii.pill,
    },
    buttonText: {
      fontSize: 13,
    },
  });

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Registro diario</Text>
          <Text style={styles.title}>
            {hasLog ? 'Nutrición registrada' : 'Aún no registras hoy'}
          </Text>
          <Text style={styles.subtitle}>
            {hasLog
              ? 'Tus datos de hoy ya alimentan Inicio, Progreso y ELLIE.'
              : 'Registra calorías y macros para cerrar el ciclo de tu plan.'}
          </Text>
        </View>
        <View style={styles.status}>
          <Text style={styles.statusText}>
            {hasLog ? `${Math.round(todayLog?.adherence || 0)}%` : 'Pendiente'}
          </Text>
        </View>
      </View>

      <View style={styles.macroList}>
        {macros.map(macro => (
          <View key={macro.label}>
            <View style={styles.macroHeader}>
              <Text style={styles.macroName}>{macro.label}</Text>
              <Text style={styles.macroValue}>
                {formatValue(macro.current, macro.unit)} /{' '}
                {formatValue(macro.goal, macro.unit)}
              </Text>
            </View>
            <ProgressBar value={macro.current} max={macro.goal} />
          </View>
        ))}
      </View>

      <Button
        label={hasLog ? 'Editar registro de hoy' : 'Registrar nutrición de hoy'}
        onPress={onLogPress}
        style={styles.button}
        textStyle={styles.buttonText}
        accessoryRight={
          hasLog ? (
            <Edit3 color={theme.colors.accentContrast} size={15} strokeWidth={2.1} />
          ) : (
            <Plus color={theme.colors.accentContrast} size={16} strokeWidth={2.2} />
          )
        }
      />
    </Card>
  );
}
