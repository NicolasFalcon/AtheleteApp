import { isPlanOn } from '@app/features/trainingPlan/trainingPlanModel';
import { useTrainingPlanState } from '@app/features/trainingPlan/useTrainingPlanState';
import { WeekScreen } from '@app/screens/week/WeekScreen';
import { TrainingPlanScreen } from '@app/screens/trainingPlan/TrainingPlanScreen';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'Week'>;

// The single "Ver semana" route (handoff v2.21 §31.4): every entry (Inicio,
// Progreso, ELLIE…) navigates to `Week`, and the plan's state decides the view
// here, never the caller:
//   active or paused    → the plan view (Semana · Mes · Plan)
//   none or completed   → the current week as always
// The state read now wins; `view` is only the caller's hint from its cached
// state (it lets the plan view open at once while the state loads, and shows
// "Aún no tienes un plan" if the plan is gone by then).
export function WeekRoute(props: Props) {
  const plan = useTrainingPlanState();
  const hint = props.route.params?.view;
  const showPlan = isPlanOn(plan.data?.state) || hint === 'plan';
  return showPlan ? <TrainingPlanScreen {...props} /> : <WeekScreen {...props} />;
}
