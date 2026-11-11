import { useQuery, type QueryClient } from '@tanstack/react-query';
import { useAuth } from '@app/hooks/useAuth';
import { trainingPlanKeys } from '@app/features/trainingPlan/useTrainingPlanState';
import { fetchTrainingPlanDetail } from '@app/services/supabase/trainingPlan';
import {
  fetchPlanReport,
  fetchPlanReview,
  type PlanReport,
} from '@app/services/supabase/trainingPlanReview';

// The report of a finished plan never changes, so it lives outside
// trainingPlanKeys.all: ending a plan invalidates that whole tree, and the
// report that came inside end_training_plan must not be fetched again.
export const planReportKeys = {
  of: (userId: string | undefined, planId: string) => ['training-plan-report', userId ?? 'guest', planId] as const,
};

export const planReviewKeys = {
  review: (userId: string | undefined, weekIndex: number | null) =>
    [...trainingPlanKeys.all, 'review', userId ?? 'guest', weekIndex ?? 'last'] as const,
  detailOf: (userId: string | undefined, planId: string) =>
    [...trainingPlanKeys.all, 'detail-of', userId ?? 'guest', planId] as const,
};

// get_training_plan_review (31.9): the review of a week, the last closed one
// without it. `data === null` once loaded: there is no review yet.
export function usePlanReview(weekIndex: number | null) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: planReviewKeys.review(profile?.id, weekIndex),
    enabled: Boolean(profile?.id),
    staleTime: 60 * 1000,
    queryFn: () => fetchPlanReview(weekIndex),
  });
}

// get_training_plan of a given plan (the review's and the report's weeks,
// dates and 1RM by week), not only the active one.
export function usePlanDetailOf(planId: string | null | undefined) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: planReviewKeys.detailOf(profile?.id, planId ?? ''),
    enabled: Boolean(profile?.id) && Boolean(planId),
    staleTime: 60 * 1000,
    queryFn: () => fetchTrainingPlanDetail(planId),
  });
}

// get_training_plan_report (31.10), or the one that came inside
// end_training_plan (seedPlanReport).
export function usePlanReport(planId: string | null | undefined) {
  const { profile } = useAuth();
  return useQuery({
    queryKey: planReportKeys.of(profile?.id, planId ?? ''),
    enabled: Boolean(profile?.id) && Boolean(planId),
    staleTime: Infinity,
    queryFn: () => fetchPlanReport(planId as string),
  });
}

export function seedPlanReport(queryClient: QueryClient, userId: string | undefined, report: PlanReport) {
  if (report.planId) {
    queryClient.setQueryData(planReportKeys.of(userId, report.planId), report);
  }
}
