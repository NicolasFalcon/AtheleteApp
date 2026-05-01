import { useMemo } from 'react';
import { Workout } from '@/lib/types';
import { useApp } from '@/contexts/AppContext';

/**
 * ELLIE recommendation engine.
 * Scores and ranks real workout templates from the DB
 * based on the current user's profile, goals, and recent history.
 */

interface UserContext {
  goal: string;
  trainingDaysPerWeek: number;
  trainingEnvironment: string;
  availableEquipment: string[];
  exercisePreferences: string[];
  exerciseAvoidances: string[];
  restrictionsNotes: string;
  injuryNotes: string;
}

/* ─── Equipment mapping ────────────────────────────────── */
const HOME_EQUIPMENT = ['bodyweight', 'dumbbells', 'resistance_band', 'kettlebell'];

function isHomeCompatible(workout: Workout): boolean {
  // If the workout type is mobility/cardio/core it's usually home-friendly
  if (['mobility', 'cardio', 'core', 'hiit', 'circuit'].includes(workout.type)) return true;
  // If targets don't require machines/cables/barbells
  return false;
}

/* ─── Goal → preferred types ───────────────────────────── */
const GOAL_TYPE_AFFINITY: Record<string, string[]> = {
  gain_muscle: ['strength', 'push', 'pull', 'upper', 'lower', 'legs', 'arms', 'full_body'],
  lose_weight: ['hiit', 'cardio', 'circuit', 'conditioning', 'full_body', 'core'],
  maintain: ['full_body', 'strength', 'conditioning', 'mobility', 'core'],
  improve_health: ['mobility', 'full_body', 'conditioning', 'core', 'cardio'],
};

/* ─── Goal → preferred difficulty ──────────────────────── */
const GOAL_DIFFICULTY_AFFINITY: Record<string, string[]> = {
  gain_muscle: ['intermediate', 'advanced'],
  lose_weight: ['beginner', 'intermediate'],
  maintain: ['intermediate', 'beginner'],
  improve_health: ['beginner', 'intermediate'],
};

/* ─── Scoring function ─────────────────────────────────── */
function scoreWorkout(workout: Workout, ctx: UserContext, recentWorkoutIds: Set<string>): number {
  let score = 0;

  // 1. Goal affinity (most important)
  const preferredTypes = GOAL_TYPE_AFFINITY[ctx.goal] || GOAL_TYPE_AFFINITY.maintain;
  if (preferredTypes.includes(workout.type)) {
    // Higher score the earlier in the affinity list
    const idx = preferredTypes.indexOf(workout.type);
    score += 30 - idx * 2;
  }

  // 2. Difficulty match
  const preferredDiffs = GOAL_DIFFICULTY_AFFINITY[ctx.goal] || ['intermediate'];
  if (preferredDiffs.includes(workout.difficulty)) {
    score += 15;
  }

  // 3. Environment compatibility
  if (ctx.trainingEnvironment === 'home') {
    if (isHomeCompatible(workout)) score += 20;
    else score -= 10;
  } else if (ctx.trainingEnvironment === 'gym') {
    // Gym users can do everything, but prefer gym-centric workouts
    if (!isHomeCompatible(workout)) score += 5;
  }

  // 4. Duration preference (based on training days — fewer days = prefer longer sessions)
  if (ctx.trainingDaysPerWeek <= 3 && workout.duration >= 40) score += 5;
  if (ctx.trainingDaysPerWeek >= 5 && workout.duration <= 45) score += 5;

  // 5. Injury/restriction awareness
  if (ctx.injuryNotes || ctx.restrictionsNotes) {
    // Prefer mobility and lower-impact workouts
    if (['mobility', 'core', 'conditioning'].includes(workout.type)) score += 10;
  }

  // 6. Exercise preferences
  const prefs = ctx.exercisePreferences.map(p => p.toLowerCase());
  const avoids = ctx.exerciseAvoidances.map(a => a.toLowerCase());
  const muscles = workout.targetMuscles.map(m => m.toLowerCase());
  const titleLower = workout.title.toLowerCase();

  for (const pref of prefs) {
    if (muscles.some(m => m.includes(pref)) || titleLower.includes(pref)) score += 8;
  }
  for (const avoid of avoids) {
    if (muscles.some(m => m.includes(avoid)) || titleLower.includes(avoid)) score -= 15;
  }

  // 7. Novelty — de-prioritize recently trained workouts
  if (recentWorkoutIds.has(workout.id)) score -= 12;

  // 8. Small random jitter for variety (deterministic per day + workout id)
  const dayKey = new Date().toISOString().slice(0, 10);
  const hash = simpleHash(dayKey + workout.id);
  score += (hash % 7); // 0-6 jitter

  return score;
}

function simpleHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/* ─── Hook ─────────────────────────────────────────────── */
export function useEllieRecommendations(maxResults = 8) {
  const { user, workouts, workoutSessions } = useApp();

  return useMemo(() => {
    if (!workouts.length) return [];

    const ctx: UserContext = {
      goal: user.goal,
      trainingDaysPerWeek: user.trainingDaysPerWeek,
      trainingEnvironment: user.trainingEnvironment,
      availableEquipment: user.availableEquipment,
      exercisePreferences: user.exercisePreferences,
      exerciseAvoidances: user.exerciseAvoidances,
      restrictionsNotes: user.restrictionsNotes,
      injuryNotes: user.injuryNotes,
    };

    // Recent workouts (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentIds = new Set(
      workoutSessions
        .filter(s => new Date(s.date) >= weekAgo)
        .map(s => s.workoutId)
    );

    // Score and sort
    const scored = workouts
      .map(w => ({ workout: w, score: scoreWorkout(w, ctx, recentIds) }))
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, maxResults).map(s => s.workout);
  }, [workouts, workoutSessions, user, maxResults]);
}
