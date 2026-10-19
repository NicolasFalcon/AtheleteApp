import { getSupabaseClient } from '@app/services/supabase/client';
import { awardGamificationEvent } from '@app/services/supabase/gamification';

export type EllieGeneratedExercise = {
  name: string;
  exerciseId?: string;
  sets?: number;
  reps?: number;
  duration?: number;
  restTime?: number;
  notes?: string;
};

export type EllieGeneratedWorkout = {
  title: string;
  description?: string;
  type: 'strength' | 'cardio' | 'fullbody' | 'mobility' | 'hiit';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  calories: number;
  targetMuscles: string[];
  exercises: EllieGeneratedExercise[];
  imageUrl?: string | null;
  // Exercises the model proposed that are not in the catalog (the server
  // already left them out).
  droppedExercises?: number;
};

export type EllieGeneratedNutritionPlan = {
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFats: number;
  notes?: string;
};

function getClient() {
  const client = getSupabaseClient();

  if (!client) {
    throw new Error('Supabase no está configurado.');
  }

  return client;
}

export async function saveEllieNutritionPlan(
  userId: string,
  plan: EllieGeneratedNutritionPlan,
): Promise<{ success: boolean; planId?: string; error?: string }> {
  try {
    const client = getClient();

    await (client.from('nutrition_plans') as any)
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true);

    const { data, error } = await (client.from('nutrition_plans') as any)
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
      })
      .select()
      .single();

    if (error || !data) {
      return {
        success: false,
        error: error?.message || 'No pudimos activar el plan.',
      };
    }

    await awardEllieNutritionPlanActivation(String(data.id));

    return {
      success: true,
      planId: String(data.id),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'No pudimos activar el plan nutricional.',
    };
  }
}

export async function awardEllieNutritionPlanActivation(planId: string) {
  await awardGamificationEvent({
    eventType: 'nutrition_activated',
    referenceId: planId,
    points: 40,
    badgeIds: ['nutrition_started'],
    metadata: {
      planId,
      source: 'ellie',
    },
  });
}
