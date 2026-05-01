import {ChevronRight, Sparkles, UtensilsCrossed} from 'lucide-react-native';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Button, Card, ProgressBar} from '@app/components/ui';
import {useAppTheme} from '@app/hooks/useAppTheme';
import type {DailyNutritionLog, NutritionPlan} from '@app/shared';

type NutritionOverviewCardProps = {
  plan: NutritionPlan | null;
  todayLog: DailyNutritionLog | null;
  onAskEllie: () => void;
  onOpenPlan?: () => void;
};

export function NutritionOverviewCard({
  plan,
  todayLog,
  onAskEllie,
  onOpenPlan,
}: NutritionOverviewCardProps) {
  const {theme} = useAppTheme();

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
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
      marginBottom: theme.spacing.xs,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      gap: theme.spacing.xs,
    },
    centeredButton: {
      minHeight: 42,
      borderRadius: theme.radii.pill,
      alignSelf: 'center',
      paddingHorizontal: 18,
    },
    outlineButton: {
      minHeight: 42,
      borderRadius: theme.radii.pill,
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
            <UtensilsCrossed color={theme.colors.textSecondary} size={22} />
          </View>
          <Text style={styles.subtitle}>Aún no tienes un plan de nutrición.</Text>
          <Text style={styles.hint}>
            ELLIE puede ayudarte a mantenerte constante con una guía sencilla.
          </Text>
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
        style={({pressed}) => [
          styles.headerRow,
          onOpenPlan && pressed ? {opacity: 0.88} : null,
        ]}>
        <View>
          <Text style={styles.title}>Nutrición de hoy</Text>
          <Text style={styles.hint}>
            Objetivo: {plan.targetCalories} kcal · {plan.targetProtein}g proteína
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
      <Button
        label="Pregúntale a ELLIE"
        onPress={onAskEllie}
        variant="outline"
        style={styles.outlineButton}
        accessoryRight={
          <Sparkles color={theme.colors.textPrimary} size={16} strokeWidth={2.2} />
        }
      />
    </Card>
  );
}
