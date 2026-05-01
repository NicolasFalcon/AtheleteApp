import {getLocalDateKey} from '@app/lib/date';
import type {
  DailyNutritionLog,
  HabitChallenge,
  WorkoutSession,
} from '@app/shared/domain/types';

export interface EllieWeeklySummary {
  workoutsCompleted: number;
  workoutsGoal: number;
  nutritionAdherence: number;
  challengeProgress: string | null;
  pointsEarned: number;
  suggestion: string;
}

function getWeekStartKey(today: Date = new Date()): string {
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay());
  return getLocalDateKey(start);
}

export function generateWeeklySummary(params: {
  workoutSessions: WorkoutSession[];
  trainingDaysPerWeek: number;
  dailyNutritionLogs: DailyNutritionLog[];
  challenge: HabitChallenge | null;
  challengeDay: number;
  completedDays: number;
  points: number;
}): EllieWeeklySummary {
  const weekStartKey = getWeekStartKey();
  const weekWorkouts = params.workoutSessions.filter(
    session => session.completed && session.date >= weekStartKey,
  );
  const weekLogs = params.dailyNutritionLogs.filter(
    log => log.date >= weekStartKey,
  );
  const nutritionAdherence =
    weekLogs.length > 0
      ? Math.round(
          (weekLogs.filter(log => (log.adherence ?? 0) >= 70).length /
            weekLogs.length) *
            100,
        )
      : 0;

  const challengeProgress =
    params.challenge && params.challengeDay > 0 && params.challengeDay <= 33
      ? `Día ${params.challengeDay}/33 · ${params.completedDays} días completados`
      : null;

  const remaining = Math.max(
    0,
    params.trainingDaysPerWeek - weekWorkouts.length,
  );
  const suggestion =
    remaining > 0
      ? `Intenta completar ${remaining} sesiones más esta semana.`
      : '¡Gran semana! Considera una sesión de recuperación o movilidad.';

  return {
    workoutsCompleted: weekWorkouts.length,
    workoutsGoal: params.trainingDaysPerWeek,
    nutritionAdherence,
    challengeProgress,
    pointsEarned: params.points,
    suggestion,
  };
}
