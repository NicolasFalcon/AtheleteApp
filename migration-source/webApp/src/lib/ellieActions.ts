/**
 * EllieActions — Persistence layer for ELLIE-generated content.
 * Handles saving AI-generated workout plans and nutrition plans to the database.
 */

import { supabase } from '@/integrations/supabase/client';
import { getWorkoutThumbnail } from '@/lib/workoutThumbnails';

export interface EllieGeneratedExercise {
  name: string;
  exercise_id?: string;
  sets?: number;
  reps?: number;
  duration?: number;
  rest_time?: number;
  notes?: string;
}

export interface EllieGeneratedWorkout {
  title: string;
  description?: string;
  type: 'strength' | 'cardio' | 'fullbody' | 'mobility' | 'hiit';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  calories: number;
  targetMuscles: string[];
  exercises: EllieGeneratedExercise[];
}

export interface EllieGeneratedNutritionPlan {
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFats: number;
  notes?: string;
}

/** Save an ELLIE-generated workout to the database */
export async function saveEllieWorkout(
  userId: string,
  workout: EllieGeneratedWorkout
): Promise<{ success: boolean; workoutId?: string; error?: string }> {
  try {
    const thumbnailUrl = getWorkoutThumbnail(workout.type, workout.targetMuscles, workout.title);

    const { data: tpl, error: tplError } = await supabase
      .from('workout_templates')
      .insert({
        title: workout.title,
        description: workout.description || null,
        type: workout.type,
        difficulty: workout.difficulty,
        duration: workout.duration,
        calories: workout.calories,
        target_muscles: workout.targetMuscles,
        image_url: thumbnailUrl,
        created_by: userId,
        is_public: false,
        is_premium: false,
        created_by_ai: true,
        source: 'ellie',
      } as any)
      .select()
      .single();

    if (tplError || !tpl) {
      return { success: false, error: tplError?.message || 'Error al crear la rutina' };
    }

    if (workout.exercises.length > 0) {
      const { error: exError } = await supabase
        .from('template_exercises')
        .insert(
          workout.exercises.map((ex, i) => ({
            template_id: tpl.id,
            name: ex.name,
            exercise_id: ex.exercise_id || null,
            sets: ex.sets || null,
            reps: ex.reps || null,
            duration: ex.duration || null,
            rest_time: ex.rest_time || 60,
            notes: ex.notes || null,
            sort_order: i,
          }))
        );

      if (exError) {
        await supabase.from('workout_templates').delete().eq('id', tpl.id);
        return { success: false, error: exError.message };
      }
    }

    return { success: true, workoutId: tpl.id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

/** Delete an ELLIE-generated workout from the database */
export async function deleteEllieWorkout(
  workoutId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete template_exercises first (child rows)
    await supabase.from('template_exercises').delete().eq('template_id', workoutId);
    
    // Delete the template itself
    const { error } = await supabase.from('workout_templates').delete().eq('id', workoutId);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}

/** Save an ELLIE-generated nutrition plan to the database */
export async function saveEllieNutritionPlan(
  userId: string,
  plan: EllieGeneratedNutritionPlan
): Promise<{ success: boolean; planId?: string; error?: string }> {
  try {
    await supabase
      .from('nutrition_plans')
      .update({ is_active: false } as any)
      .eq('user_id', userId)
      .eq('is_active', true);

    const { data, error } = await supabase
      .from('nutrition_plans')
      .insert({
        user_id: userId,
        target_calories: plan.targetCalories,
        target_protein: plan.targetProtein,
        target_carbs: plan.targetCarbs,
        target_fats: plan.targetFats,
        notes: plan.notes || null,
        is_active: true,
        created_by_ai: true,
        source: 'ellie',
      } as any)
      .select()
      .single();

    if (error || !data) {
      return { success: false, error: error?.message || 'Error al crear el plan' };
    }

    return { success: true, planId: data.id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Error desconocido' };
  }
}
