import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MoreHorizontal } from 'lucide-react-native';
import {
  BackButton,
  GlassHeader,
  IconButton,
  Segmented,
  StatusBarV2,
  useThemeV2,
  useToast,
} from '@app/components/v2';
import { APP_ROUTES, ROOT_ROUTES } from '@app/constants/routes';
import { deviceTimezone } from '@app/features/profile/timezoneSync';
import {
  monthKey,
  monthRange,
  planContext,
  planDayAction,
  planDayView,
  planWeekRange,
  type PlanDayState,
  type PlanDayView,
} from '@app/features/trainingPlan/planViewModel';
import { isPlanOn } from '@app/features/trainingPlan/trainingPlanModel';
import { useTrainingPlanText } from '@app/features/trainingPlan/trainingPlanCopy';
import { useTrainingPlanDetail } from '@app/features/trainingPlan/usePlanViews';
import { useTrainingPlanState } from '@app/features/trainingPlan/useTrainingPlanState';
import { PlanMonthView } from '@app/features/trainingPlan/v2/PlanMonthView';
import { PlanOverview } from '@app/features/trainingPlan/v2/PlanOverview';
import { PlanEmpty, PlanError, PlanLoading } from '@app/features/trainingPlan/v2/PlanStates';
import { PlanWeekView } from '@app/features/trainingPlan/v2/PlanWeekView';
import { useOpenPastDay } from '@app/features/week/useOpenPastDay';
import { weekStartOf } from '@app/features/week/weekModel';
import { useAuth } from '@app/hooks/useAuth';
import { weekKeys } from '@app/hooks/useWeekPlan';
import { getLocalDateKey } from '@app/lib/date';
import { safeGoBack } from '@app/navigation/safeGoBack';
import { weekPlanService } from '@app/services/routines/weekPlanService';
import type { AppScreenProps } from '@app/types/navigation';

type Props = AppScreenProps<'Week'>;
type Tab = 'week' | 'month' | 'plan';

const BACK_FALLBACKS = [ROOT_ROUTES.MainTabs];
const clamp = (value: string, first: string, last: string) => (value < first ? first : value > last ? last : value);

// Tu semana with a plan, active or paused (handoff v2.21 §31.4 – 31.6): the
// selector Semana · Mes · Plan under the header and the three views. "Ver
// semana" opens this screen when the plan is active or paused (WeekRoute);
// a day opens as in the current week: past → its summary; today or ahead →
// the routine's detail (the session with its recommended weight is part 3);
// a rest day opens nothing; a substituted session opens the routine that
// replaced it. The "···" menu is part 4: shown, disabled.
export function TrainingPlanScreen({ navigation, route }: Props) {
  const { colors, layout } = useThemeV2();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { t } = useTrainingPlanText();
  const today = getLocalDateKey();
  const state = useTrainingPlanState();
  const on = isPlanOn(state.data?.state);
  const detail = useTrainingPlanDetail(on);
  const pastDay = useOpenPastDay(today);
  const [tab, setTab] = useState<Tab>('week');
  const [weekStart, setWeekStart] = useState<string | null>(route.params?.weekStart ?? null);
  const [month, setMonth] = useState<string | null>(null);

  const startDate = state.data?.startDate ?? null;
  const endDate = state.data?.endDate ?? detail.data?.endDate ?? null;
  const range = useMemo(() => planWeekRange(startDate, endDate, today), [startDate, endDate, today]);
  const months = useMemo(() => monthRange(startDate, endDate, today), [startDate, endDate, today]);
  const shownWeek = clamp(weekStart ?? range.current, range.first, range.last);
  const shownMonth = clamp(month ?? monthKey(shownWeek), months.first, months.last);

  const openRoutine = (workoutId: string) => navigation.navigate(APP_ROUTES.WorkoutDetail, { workoutId });

  // A day of Semana.
  const openDay = (view: PlanDayView) => {
    const action = planDayAction(view, today);
    if (action.kind === 'planSession') {
      navigation.navigate(APP_ROUTES.PlanSession, { planSessionId: action.planSessionId });
    } else if (action.kind === 'routine') {
      openRoutine(action.routineId);
    } else if (action.kind === 'past') {
      pastDay.open(view.date, view.routineId).catch(() => undefined);
    }
  };

  // A day of Mes: the month carries no routine, so a day that opens one reads
  // its week (cached) and then does what Semana does.
  const openCell = async (date: string, cellState: PlanDayState) => {
    if (cellState === 'pause' || cellState === 'rest' || cellState === 'empty' || cellState === 'moved') {
      return;
    }
    if (date < today && cellState !== 'substituted') {
      pastDay.open(date, null).catch(() => undefined);
      return;
    }
    const start = weekStartOf(date);
    const tz = deviceTimezone();
    try {
      const week = await queryClient.fetchQuery({
        queryKey: weekKeys.of(profile?.id, start, tz ?? ''),
        staleTime: 5 * 60 * 1000,
        queryFn: () => weekPlanService.getWeekPlan({ tz, weekStart: start }),
      });
      const day = week.days.find(item => item.date === date);
      if (day) {
        openDay(planDayView(day, planContext(today, state.data, week.trainingPlan)));
      }
    } catch (error) {
      __DEV__ && console.warn('[training-plan] No se pudo abrir el día:', error);
      toast.show(t('err.title'), { tone: 'error' });
    }
  };

  const openWeekOf = (start: string) => {
    setWeekStart(start);
    setTab('week');
  };

  const retry = () => {
    state.refetch().catch(() => undefined);
    detail.refetch().catch(() => undefined);
  };

  const failed = state.isError || (on && detail.isError);
  const loading = !failed && (state.isLoading || (on && detail.isLoading) || (on && !detail.data));

  let body;
  if (failed) {
    body = <PlanError onRetry={retry} />;
  } else if (loading) {
    body = <PlanLoading />;
  } else if (!on || !state.data || !detail.data) {
    // No plan (or it ended while this was open): "Aún no tienes un plan".
    body = (
      <PlanEmpty
        onCreate={() => navigation.navigate(APP_ROUTES.TrainingPlanCreate)}
        onWeekOnly={() => navigation.setParams({ view: 'current' })}
      />
    );
  } else if (tab === 'week') {
    body = (
      <PlanWeekView
        weekStart={shownWeek}
        range={range}
        today={today}
        planState={state.data}
        detail={detail.data}
        onChangeWeek={setWeekStart}
        onBackToCurrent={() => setWeekStart(null)}
        onOpenDay={openDay}
      />
    );
  } else if (tab === 'month') {
    body = (
      <PlanMonthView
        month={shownMonth}
        range={months}
        today={today}
        onChangeMonth={setMonth}
        onOpenCell={(date, cellState) => {
          openCell(date, cellState).catch(() => undefined);
        }}
      />
    );
  } else {
    body = (
      <PlanOverview
        detail={detail.data}
        currentWeek={state.data.weekIndex ?? 0}
        onOpenWeek={openWeekOf}
      />
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <StatusBarV2 />
      <GlassHeader
        title={t('screen.title')}
        left={<BackButton onPress={() => safeGoBack(navigation, BACK_FALLBACKS)} />}
        right={
          // Gestionar el plan arrives in part 4: visible, disabled.
          <IconButton
            icon={MoreHorizontal}
            variant="muted"
            disabled
            accessibilityLabel={t('menu.soon')}
            onPress={() => undefined}
          />
        }
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: layout.gutter, paddingBottom: insets.bottom + 48 },
        ]}
      >
        <Segmented
          options={[
            { key: 'week', label: t('view.week') },
            { key: 'month', label: t('view.month') },
            { key: 'plan', label: t('view.plan') },
          ]}
          value={tab}
          onChange={setTab}
        />
        {body}
      </ScrollView>
      {pastDay.sheets}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingTop: 8, gap: 22 },
});
