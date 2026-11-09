import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { APP_ROUTES } from '@app/constants/routes';
import { weekViewFor } from '@app/features/trainingPlan/trainingPlanModel';
import { useTrainingPlanState } from '@app/features/trainingPlan/useTrainingPlanState';
import type { AppStackParamList } from '@app/types/navigation';

// "Ver semana" (handoff v2.21 §31.4): the single route every entry uses
// (Inicio · Tu día and Ver semana, Progreso · Plan de la semana, ELLIE ·
// Agregada al {día} and Ver semana). It decides the view from the plan's
// state; no screen decides on its own.
//   none / completed → the current week as always
//   active / paused  → the plan view
// The plan view arrives in part 2: until then `view: 'plan'` opens the same
// current week.
export function useOpenWeek() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const plan = useTrainingPlanState();
  const state = plan.data?.state ?? null;
  return useCallback(
    (params?: { weekStart?: string; date?: string }) =>
      navigation.navigate(APP_ROUTES.Week, { ...params, view: weekViewFor(state) }),
    [navigation, state],
  );
}
