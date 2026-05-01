/**
 * useEllieContext — Hook that builds the full ELLIE context from app state.
 */
import { useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useWorkoutSession } from '@/contexts/WorkoutSessionContext';
import { useGamification } from '@/contexts/GamificationContext';
import { usePremium } from '@/hooks/usePremium';
import { useAllPersonalRecords } from '@/hooks/usePersonalRecords';
import { useExercises } from '@/hooks/useExercises';
import { useHydration } from '@/hooks/useHydration';
import { buildEllieContext, serializeEllieContext, EllieFullContext } from '@/lib/ellieContext';

export function useEllieContext() {
  const {
    user, workoutSessions, workouts, nutritionPlan,
    getTodayNutritionLog, dailyNutritionLogs,
    challenge, getChallengeDay, getCurrentStreak, getCompletedDays,
    habitLogs,
  } = useApp();
  const { todaySession } = useWorkoutSession();
  const { gamification } = useGamification();
  const { isPremium } = usePremium();
  const { records: prRecords } = useAllPersonalRecords();
  const { exercises } = useExercises();
  const { todayMl, goalMl, todayPercentage, daysMetGoal, weeklyAverageMl, hydrationStreak } = useHydration();

  const exerciseNames = useMemo(() => {
    const map: Record<string, string> = {};
    exercises.forEach(e => { map[e.id] = e.name; });
    return map;
  }, [exercises]);

  const context = useMemo((): EllieFullContext => {
    const todayLog = getTodayNutritionLog();
    const workoutTitles: Record<string, string> = {};
    workouts.forEach(w => { workoutTitles[w.id] = w.title; });

    return buildEllieContext({
      user: {
        id: user.id,
        name: user.name,
        birthDate: user.birthDate,
        weight: user.weight,
        height: user.height,
        goal: user.goal,
        trainingDaysPerWeek: user.trainingDaysPerWeek,
        trainingEnvironment: (user as any).trainingEnvironment,
        availableEquipment: (user as any).availableEquipment,
        restrictionsNotes: (user as any).restrictionsNotes,
        injuryNotes: (user as any).injuryNotes,
        exercisePreferences: (user as any).exercisePreferences,
        exerciseAvoidances: (user as any).exerciseAvoidances,
        dietPreferences: (user as any).dietPreferences,
        foodAvoidances: (user as any).foodAvoidances,
      },
      isPremium,
      workoutSessions,
      workoutTitles,
      workoutCount: workouts.length,
      nutritionPlan,
      todayNutritionLog: todayLog,
      dailyNutritionLogs,
      challenge,
      habitLogs,
      challengeDay: getChallengeDay(),
      currentStreak: getCurrentStreak(),
      completedDays: getCompletedDays(),
      gamification,
      personalRecords: {
        records: prRecords.map(r => ({
          exerciseId: r.exerciseId,
          prType: r.prType,
          valueWeight: r.valueWeight,
          valueReps: r.valueReps,
          valueDurationSec: r.valueDurationSec,
          valueDistanceM: r.valueDistanceM,
          recordedAt: r.recordedAt,
        })),
        exerciseNames,
      },
      hydration: {
        todayMl,
        goalMl,
        todayPercentage,
        daysMetGoalThisWeek: daysMetGoal,
        weeklyAverageMl,
        hydrationStreak,
      },
    });
  }, [user, workoutSessions, workouts, nutritionPlan, dailyNutritionLogs, challenge, habitLogs, gamification, isPremium, prRecords, exerciseNames, todayMl, goalMl, todayPercentage, daysMetGoal, weeklyAverageMl, hydrationStreak]);

  const serialized = useMemo(() => serializeEllieContext(context), [context]);

  return { context, serialized };
}
