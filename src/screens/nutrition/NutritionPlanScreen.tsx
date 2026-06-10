import {useEffect, useMemo, useRef, useState} from 'react';
import {useBottomTabBarHeight} from '@react-navigation/bottom-tabs';
import {useNavigation} from '@react-navigation/native';
import {useRoute} from '@react-navigation/native';
import {Alert, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Button, Loader} from '@app/components/ui';
import {TAB_ROUTES} from '@app/constants/routes';
import {NutritionEmptyState} from '@app/features/nutrition/components/NutritionEmptyState';
import {NutritionDailySummaryCard} from '@app/features/nutrition/components/NutritionDailySummaryCard';
import {NutritionGuidelinesCard} from '@app/features/nutrition/components/NutritionGuidelinesCard';
import {NutritionLogModal} from '@app/features/nutrition/components/NutritionLogModal';
import {NutritionMacroGrid} from '@app/features/nutrition/components/NutritionMacroGrid';
import {NutritionPlanActions} from '@app/features/nutrition/components/NutritionPlanActions';
import {NutritionPlanHeader} from '@app/features/nutrition/components/NutritionPlanHeader';
import {NutritionPlanSummaryCard} from '@app/features/nutrition/components/NutritionPlanSummaryCard';
import {NutritionStructureCard} from '@app/features/nutrition/components/NutritionStructureCard';
import {
  buildMealStructure,
  buildNutritionGuidelines,
  buildNutritionSummary,
} from '@app/features/nutrition/nutritionPlanContent';
import {useAuth} from '@app/hooks/useAuth';
import {useNutritionPlan} from '@app/hooks/useNutritionPlan';
import {useAppTheme} from '@app/hooks/useAppTheme';
import type {NutritionPlanRouteParams} from '@app/types/navigation';

const goalLabels: Record<string, string> = {
  lose_weight: 'Perder peso',
  gain_muscle: 'Ganar músculo',
  maintain: 'Mantenerme',
  improve_health: 'Mejorar salud',
};

export function NutritionPlanScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const {theme} = useAppTheme();
  const {profile} = useAuth();
  const tabBarHeight = useBottomTabBarHeight();
  const nutritionPlan = useNutritionPlan();
  const [logModalVisible, setLogModalVisible] = useState(false);
  const consumedOpenLogParam = useRef(false);

  const goalLabel = profile?.goal
    ? goalLabels[profile.goal] || 'Sin objetivo'
    : 'Sin objetivo';

  const content = useMemo(() => {
    if (!nutritionPlan.data?.plan) {
      return null;
    }

    const plan = nutritionPlan.data.plan;

    return {
      summary: buildNutritionSummary({
        plan,
        goalLabel,
        trainingDaysPerWeek: profile?.trainingDaysPerWeek,
      }),
      sourceLabel:
        plan.source === 'ellie' || plan.createdByAi
          ? 'PLAN ACTIVO DESDE ELLIE'
          : 'PLAN NUTRICIONAL ACTIVO',
      meals: buildMealStructure(plan.targetCalories, goalLabel),
      guidelines: buildNutritionGuidelines({
        plan,
        goalLabel,
        trainingDaysPerWeek: profile?.trainingDaysPerWeek,
        dailyWaterGoal: profile?.dailyWaterGoal,
      }),
    };
  }, [
    goalLabel,
    nutritionPlan.data?.plan,
    profile?.dailyWaterGoal,
    profile?.trainingDaysPerWeek,
  ]);

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: tabBarHeight + theme.spacing.md,
      gap: theme.spacing.md,
    },
    caloriesWrap: {
      gap: 2,
      marginTop: 2,
    },
    calories: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 34,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: -1,
    },
    caloriesUnit: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      fontWeight: theme.typography.weights.medium,
    },
    errorCard: {
      borderRadius: 26,
      padding: 20,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      gap: 14,
    },
    errorTitle: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 18,
      fontWeight: theme.typography.weights.bold,
    },
    errorText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 14,
      lineHeight: 21,
    },
  });

  const openEllie = () => {
    navigation.getParent()?.navigate(TAB_ROUTES.Ellie as never);
  };

  useEffect(() => {
    const params = route.params as NutritionPlanRouteParams | undefined;
    if (
      params?.openLog &&
      nutritionPlan.data?.plan &&
      !consumedOpenLogParam.current
    ) {
      consumedOpenLogParam.current = true;
      setLogModalVisible(true);
    }
  }, [nutritionPlan.data?.plan, route.params]);

  const handleDeactivate = async () => {
    try {
      await nutritionPlan.deactivatePlan();
      Alert.alert(
        'Plan cancelado',
        'Tu cuenta volvió al estado sin plan nutricional activo.',
      );
    } catch (error) {
      Alert.alert(
        'No pudimos cancelar el plan',
        error instanceof Error
          ? error.message
          : 'Inténtalo de nuevo en unos minutos.',
      );
    }
  };

  const handleSaveTodayLog = async (input: Parameters<typeof nutritionPlan.saveTodayLog>[0]) => {
    try {
      await nutritionPlan.saveTodayLog(input);
      setLogModalVisible(false);
      Alert.alert(
        'Nutrición registrada',
        'Tu registro de hoy ya está sincronizado con Inicio, Progreso y ELLIE.',
      );
    } catch (error) {
      Alert.alert(
        'No pudimos guardar tu nutrición',
        error instanceof Error
          ? error.message
          : 'Inténtalo de nuevo en unos minutos.',
      );
    }
  };

  if (!profile || nutritionPlan.isLoading) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <Loader label="Cargando plan nutricional..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <NutritionPlanHeader
          subtitle={`Objetivo: ${goalLabel}`}
          onBack={() => navigation.goBack()}
        />

        {nutritionPlan.error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>No pudimos cargar tu plan</Text>
            <Text style={styles.errorText}>
              Revisa la conexión con Supabase o vuelve a intentarlo en unos minutos.
            </Text>
            <Button label="Ir a ELLIE" onPress={openEllie} fullWidth={false} />
          </View>
        ) : !nutritionPlan.data?.plan || !content ? (
          <NutritionEmptyState onAskEllie={openEllie} />
        ) : (
          <>
            <View style={styles.caloriesWrap}>
              <Text style={styles.calories}>
                {nutritionPlan.data.plan.targetCalories.toLocaleString('es-CL')}{' '}
                <Text style={styles.caloriesUnit}>kcal / día</Text>
              </Text>
            </View>

            <NutritionMacroGrid
              calories={nutritionPlan.data.plan.targetCalories}
              protein={nutritionPlan.data.plan.targetProtein}
              carbs={nutritionPlan.data.plan.targetCarbs}
              fats={nutritionPlan.data.plan.targetFats}
            />

            <NutritionPlanSummaryCard
              summary={content.summary}
              sourceLabel={content.sourceLabel}
              todayLog={nutritionPlan.data.todayLog}
            />

            <NutritionDailySummaryCard
              plan={nutritionPlan.data.plan}
              todayLog={nutritionPlan.data.todayLog}
              onLogPress={() => setLogModalVisible(true)}
            />

            <NutritionStructureCard meals={content.meals} />

            <NutritionGuidelinesCard guidelines={content.guidelines} />

            <NutritionPlanActions
              onAskEllie={openEllie}
              onDeactivate={handleDeactivate}
              isDeactivating={nutritionPlan.isDeactivating}
            />
          </>
        )}
      </ScrollView>
      {nutritionPlan.data?.plan ? (
        <NutritionLogModal
          visible={logModalVisible}
          plan={nutritionPlan.data.plan}
          todayLog={nutritionPlan.data.todayLog}
          saving={nutritionPlan.isSavingTodayLog}
          onClose={() => setLogModalVisible(false)}
          onSave={handleSaveTodayLog}
        />
      ) : null}
    </SafeAreaView>
  );
}
