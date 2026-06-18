import type { WorkoutSession } from '@app/shared';

export type HomePriorityKind = 'workout' | 'core33' | 'nutrition';

type ChallengeSummary = {
  status?: 'active' | 'completed' | 'abandoned';
  completedToday: number;
  totalHabits: number;
} | null;

type HomePriorityInput = {
  session: WorkoutSession | null;
  challenge: ChallengeSummary;
  hasNutritionPlan: boolean;
  hasNutritionLog: boolean;
};

export function getHomePriority({
  session,
  challenge,
  hasNutritionPlan,
  hasNutritionLog,
}: HomePriorityInput): HomePriorityKind {
  if (session?.status === 'in_progress' || session?.status === 'canceled') {
    return 'workout';
  }

  if (
    challenge?.status === 'active' &&
    challenge.completedToday < challenge.totalHabits
  ) {
    return 'core33';
  }

  if (!session || session.status !== 'completed') {
    return 'workout';
  }

  if (hasNutritionPlan && !hasNutritionLog) {
    return 'nutrition';
  }

  if (challenge?.status === 'active') {
    return 'core33';
  }

  return 'workout';
}
