import {
  ChevronRight,
  Edit3,
  Plus,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, ProgressBar } from '@app/components/ui';
import { useAppTheme } from '@app/hooks/useAppTheme';
import type { DailyNutritionLog, NutritionPlan } from '@app/shared';

type NutritionOverviewCardProps = {
  plan: NutritionPlan | null;
  todayLog: DailyNutritionLog | null;
  onAskEllie: () => void;
  onOpenPlan?: () => void;
  onLogNutrition?: () => void;
};

export function NutritionOverviewCard({
  plan,
  todayLog,
  onAskEllie,
  onOpenPlan,
  onLogNutrition,
}: NutritionOverviewCardProps) {
  const { theme } = useAppTheme();
  const hasLog = Boolean(
    todayLog &&
      ((todayLog.calories || 0) > 0 ||
        (todayLog.protein || 0) > 0 ||
        (todayLog.carbs || 0) > 0 ||
        (todayLog.fats || 0) > 0),
  );

  const styles = StyleSheet.create({
    card: {
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 16,
      fontWeight: theme.typography.weights.semibold,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      lineHeight: 18,
    },
    hint: {
      color: '#A19E95',
      fontFamily: theme.typography.fontFamily,
      fontSize: 12,
      lineHeight: 17,
    },
    emptyIcon: {
      width: 44,
      height: 44,
      borderRadius: theme.radii.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
    },
    emptyState: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.xs,
      gap: theme.spacing.sm,
    },
    emptyCopy: {
      flex: 1,
      gap: 3,
    },
    centeredButton: {
      minHeight: 40,
      borderRadius: theme.radii.pill,
      alignSelf: 'flex-start',
      paddingHorizontal: 16,
    },
    outlineButton: {
      minHeight: 42,
      borderRadius: theme.radii.pill,
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
    },
    actionButton: {
      flex: 1,
      minHeight: 42,
      borderRadius: theme.radii.pill,
    },
    actionText: {
      fontSize: 12,
    },
    macroRow: {
      gap: 6,
    },
    macroHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    macroName: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
      fontWeight: theme.typography.weights.medium,
    },
    macroValue: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
    },
  });

  if (!plan) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>Nutrición de hoy</Text>
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <UtensilsCrossed color={theme.colors.textSecondary} size={20} />
          </View>
          <View style={styles.emptyCopy}>
            <Text style={styles.subtitle}>
              Aún no tienes un plan de nutrición.
            </Text>
            <Text style={styles.hint}>
              ELLIE puede ayudarte a mantenerte constante con una guía sencilla.
            </Text>
          </View>
        </View>
        <Button
          label="Pregúntale a ELLIE"
          onPress={onAskEllie}
          fullWidth={false}
          style={styles.centeredButton}
          accessoryRight={
            <Sparkles
              color={theme.colors.accentContrast}
              size={16}
              strokeWidth={2.2}
            />
          }
        />
      </Card>
    );
  }

  const macros = [
    {
      label: 'Calorías',
      current: todayLog?.calories || 0,
      goal: plan.targetCalories,
    },
    {
      label: 'Proteína',
      current: todayLog?.protein || 0,
      goal: plan.targetProtein,
    },
    ...(plan.targetCarbs
      ? [
          {
            label: 'Carbohidratos',
            current: todayLog?.carbs || 0,
            goal: plan.targetCarbs,
          },
        ]
      : []),
    ...(plan.targetFats
      ? [
          {
            label: 'Grasas',
            current: todayLog?.fats || 0,
            goal: plan.targetFats,
          },
        ]
      : []),
  ];

  return (
    <Card style={styles.card}>
      <Pressable
        onPress={onOpenPlan}
        disabled={!onOpenPlan}
        style={({ pressed }) => [
          styles.headerRow,
          onOpenPlan && pressed ? { opacity: 0.88 } : null,
        ]}
      >
        <View>
          <Text style={styles.title}>Nutrición de hoy</Text>
          <Text style={styles.hint}>
            Objetivo: {plan.targetCalories} kcal · {plan.targetProtein}g
            proteína
          </Text>
          <Text style={styles.subtitle}>
            {hasLog
              ? 'Registro diario cargado.'
              : 'Aún no registras tu consumo de hoy.'}
          </Text>
        </View>
        <ChevronRight color={theme.colors.textSecondary} size={18} />
      </Pressable>
      {macros.map(macro => (
        <View key={macro.label} style={styles.macroRow}>
          <View style={styles.macroHeader}>
            <Text style={styles.macroName}>{macro.label}</Text>
            <Text style={styles.macroValue}>
              {macro.current} / {macro.goal}
            </Text>
          </View>
          <ProgressBar value={macro.current} max={macro.goal} />
        </View>
      ))}
      <View style={styles.actions}>
        <Button
          label="ELLIE"
          onPress={onAskEllie}
          variant="outline"
          style={styles.actionButton}
          textStyle={styles.actionText}
          accessoryRight={
            <Sparkles
              color={theme.colors.textPrimary}
              size={15}
              strokeWidth={2.1}
            />
          }
        />
        {onLogNutrition ? (
          <Button
            label={hasLog ? 'Editar' : 'Registrar'}
            onPress={onLogNutrition}
            style={styles.actionButton}
            textStyle={styles.actionText}
            accessoryRight={
              hasLog ? (
                <Edit3
                  color={theme.colors.accentContrast}
                  size={14}
                  strokeWidth={2.1}
                />
              ) : (
                <Plus
                  color={theme.colors.accentContrast}
                  size={15}
                  strokeWidth={2.2}
                />
              )
            }
          />
        ) : null}
      </View>
    </Card>
  );
}
