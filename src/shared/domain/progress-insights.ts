import {getLocalDateKey} from '@app/lib/date';
import type {DailyNutritionLog, WorkoutSession} from '@app/shared/domain/types';
import type {PersonalRecord} from '@app/shared/domain/personal-records';

function getWorkoutSessionValue(session: WorkoutSession): number {
  return Math.max(0, session.duration || 0);
}

function getWorkoutStreak(workoutSessions: WorkoutSession[]): number {
  const completedDates = new Set(
    workoutSessions.filter(session => session.completed).map(session => session.date),
  );

  let streak = 0;

  for (let offset = 0; offset < 30; offset += 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    const key = getLocalDateKey(date);

    if (completedDates.has(key)) {
      streak += 1;
      continue;
    }

    if (offset > 0) {
      break;
    }
  }

  return streak;
}

function getWeekStartKey(date: Date = new Date()): string {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  return getLocalDateKey(start);
}

function getDaysAgoKey(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return getLocalDateKey(date);
}

export function generateProgressInsights(params: {
  workoutSessions: WorkoutSession[];
  trainingDaysPerWeek: number;
  dailyNutritionLogs: DailyNutritionLog[];
  personalRecords?: Array<PersonalRecord & {exerciseName: string}>;
}): string[] {
  const insights: string[] = [];
  const now = new Date();
  const thisWeekStartKey = getWeekStartKey(now);
  const lastWeekStart = new Date(now);
  lastWeekStart.setDate(lastWeekStart.getDate() - now.getDay() - 7);
  const lastWeekStartKey = getLocalDateKey(lastWeekStart);

  const thisWeekSessions = params.workoutSessions.filter(
    session => session.completed && session.date >= thisWeekStartKey,
  );
  const lastWeekSessions = params.workoutSessions.filter(
    session =>
      session.completed &&
      session.date >= lastWeekStartKey &&
      session.date < thisWeekStartKey,
  );

  const thisWeek = thisWeekSessions.length;
  const lastWeek = lastWeekSessions.length;
  const diff = thisWeek - lastWeek;

  if (diff > 0) {
    insights.push(
      `Entrenaste ${thisWeek} veces esta semana, +${diff} respecto a la semana pasada.`,
    );
  } else if (diff < 0) {
    insights.push(
      `Entrenaste ${thisWeek} veces esta semana, ${diff} respecto a la anterior. ¡A darle!`,
    );
  } else {
    insights.push(
      `Entrenaste ${thisWeek} veces esta semana, igual que la anterior.`,
    );
  }

  const currentStreak = getWorkoutStreak(params.workoutSessions);
  if (currentStreak > 0) {
    insights.push(`Tu racha actual es de ${currentStreak} días. ¡No la rompas!`);
  }

  const recentNutritionLogs = params.dailyNutritionLogs.filter(
    log => log.date >= getDaysAgoKey(29),
  );
  const underTrackedDays = recentNutritionLogs.filter(log => log.calories < 1500).length;
  if (underTrackedDays > 3) {
    insights.push(
      'Tiendes a sub-registrar algunos días. Intenta registrar cada comida al momento.',
    );
  }

  const weeklyMinutes = thisWeekSessions.reduce(
    (sum, session) => sum + getWorkoutSessionValue(session),
    0,
  );
  if (thisWeek >= params.trainingDaysPerWeek && weeklyMinutes >= 180) {
    insights.push(
      'Un día de movilidad o descanso podría ayudarte mañana según tu carga reciente.',
    );
  }

  const prs = params.personalRecords || [];
  if (prs.length > 0) {
    const thirtyDaysAgoKey = getDaysAgoKey(30);
    const recentPRs = prs.filter(record => record.recordedAt >= thirtyDaysAgoKey);

    if (recentPRs.length > 0) {
      const exerciseNames = [...new Set(recentPRs.map(record => record.exerciseName))];
      if (exerciseNames.length <= 2) {
        insights.push(`🏆 Nuevo(s) PR reciente en ${exerciseNames.join(' y ')}.`);
      } else {
        insights.push(
          `🏆 ${recentPRs.length} récords personales registrados en los últimos 30 días.`,
        );
      }
    }

    const groups = new Map<string, typeof prs>();
    prs.forEach(record => {
      const key = `${record.exerciseId}::${record.prType}`;
      const current = groups.get(key) || [];
      current.push(record);
      groups.set(key, current);
    });

    const improvements: Array<{name: string; pct: number}> = [];

    groups.forEach(group => {
      if (group.length < 2) {
        return;
      }

      const sorted = [...group].sort((left, right) =>
        left.recordedAt.localeCompare(right.recordedAt),
      );
      const oldest = sorted[0];
      const newest = sorted[sorted.length - 1];

      const oldValue =
        oldest.prType === 'max_reps'
          ? oldest.valueReps ?? 0
          : oldest.prType === 'duration'
            ? oldest.valueDurationSec ?? 0
            : oldest.prType === 'distance'
              ? oldest.valueDistanceM ?? 0
              : oldest.valueWeight ?? 0;

      const newValue =
        newest.prType === 'max_reps'
          ? newest.valueReps ?? 0
          : newest.prType === 'duration'
            ? newest.valueDurationSec ?? 0
            : newest.prType === 'distance'
              ? newest.valueDistanceM ?? 0
              : newest.valueWeight ?? 0;

      if (oldValue > 0 && newValue > oldValue) {
        improvements.push({
          name: newest.exerciseName,
          pct: Math.round(((newValue - oldValue) / oldValue) * 100),
        });
      }
    });

    if (improvements.length > 0) {
      const best = improvements.sort((left, right) => right.pct - left.pct)[0];
      insights.push(
        `Tu ${best.name} mejoró un ${best.pct}% — ¡la sobrecarga progresiva funciona!`,
      );
    }

    const latestTimestamp = Math.max(
      ...prs.map(record => new Date(record.recordedAt).getTime()),
    );
    const daysSinceLastPR = Math.round((Date.now() - latestTimestamp) / 86400000);

    if (daysSinceLastPR > 14) {
      insights.push(
        `Hace ${daysSinceLastPR} días no registras un nuevo PR. ¿Hora de intentar superar tu marca?`,
      );
    }
  }

  return insights.slice(0, 4);
}
