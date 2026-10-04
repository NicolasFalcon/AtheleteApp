import type {
  EllieGeneratedNutritionPlan,
  EllieGeneratedWorkout,
} from '@app/services/supabase/ellie-actions';
import type { EllieGenerationResult } from '@app/services/ellie/chat';
import type {
  CardMessage,
  ChatMessage,
} from '@app/features/ellie/chatModel';

// Same reading of the edge function's tool results as the v1 chat (the
// server contract does not change): defaults for whatever is missing.
export function parseWorkout(data: any): EllieGeneratedWorkout {
  const strings = (value: unknown) =>
    Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  return {
    title:
      typeof data?.title === 'string' ? data.title : 'Rutina generada por ELLIE',
    description:
      typeof data?.description === 'string' ? data.description : undefined,
    type:
      data?.type === 'cardio' ||
      data?.type === 'fullbody' ||
      data?.type === 'mobility' ||
      data?.type === 'hiit'
        ? data.type
        : 'strength',
    difficulty:
      data?.difficulty === 'beginner' || data?.difficulty === 'advanced'
        ? data.difficulty
        : 'intermediate',
    duration: typeof data?.duration === 'number' ? data.duration : 30,
    calories: typeof data?.calories === 'number' ? data.calories : 200,
    targetMuscles: Array.isArray(data?.targetMuscles)
      ? strings(data.targetMuscles)
      : strings(data?.target_muscles),
    imageUrl: typeof data?.image_url === 'string' ? data.image_url : undefined,
    exercises: Array.isArray(data?.exercises)
      ? data.exercises.map((exercise: any) => ({
          name:
            typeof exercise?.name === 'string'
              ? exercise.name
              : 'Ejercicio sugerido',
          exerciseId:
            typeof exercise?.exercise_id === 'string'
              ? exercise.exercise_id
              : undefined,
          sets: typeof exercise?.sets === 'number' ? exercise.sets : undefined,
          reps: typeof exercise?.reps === 'number' ? exercise.reps : undefined,
          duration:
            typeof exercise?.duration === 'number'
              ? exercise.duration
              : undefined,
          restTime:
            typeof exercise?.rest_time === 'number'
              ? exercise.rest_time
              : undefined,
          notes:
            typeof exercise?.notes === 'string' ? exercise.notes : undefined,
        }))
      : [],
  };
}

export function parseNutrition(data: any): EllieGeneratedNutritionPlan {
  const num = (a: unknown, b: unknown, fallback: number) =>
    typeof a === 'number' ? a : typeof b === 'number' ? b : fallback;
  return {
    targetCalories: num(data?.target_calories, data?.targetCalories, 2000),
    targetProtein: num(data?.target_protein, data?.targetProtein, 120),
    targetCarbs: num(data?.target_carbs, data?.targetCarbs, 250),
    targetFats: num(data?.target_fats, data?.targetFats, 65),
    notes: typeof data?.notes === 'string' ? data.notes : undefined,
  };
}

export type ParsedTool = {
  intro: string;
  // What is stored in chat_messages for the turn (same text as v1).
  summary: string;
  card: CardMessage;
};

// A tool result becomes a card; a plain text result is not a card (null).
export function parseToolResult(
  result: EllieGenerationResult,
  id: string,
  context: { role: 'user' | 'assistant'; content: string }[],
): ParsedTool | null {
  const intro =
    'data' in result && typeof result.data?.intro_message === 'string'
      ? result.data.intro_message
      : '';
  if (result.type === 'generate_workout_plan') {
    const workout = parseWorkout(result.data);
    return {
      intro,
      summary:
        intro ||
        `He generado la rutina "${workout.title}" con ${workout.exercises.length} ejercicios.`,
      card: { id, role: 'assistant', kind: 'workout', workout, stage: 'proposed', context },
    };
  }
  if (result.type === 'generate_nutrition_plan') {
    const plan = parseNutrition(result.data);
    return {
      intro,
      summary:
        intro ||
        `He generado tu plan nutricional de ${plan.targetCalories} kcal por día.`,
      card: { id, role: 'assistant', kind: 'nutrition', plan, stage: 'proposed', context },
    };
  }
  return null;
}

// The turns sent to the model: text of the conversation, no cards (their
// summary was stored as text) and no explanatory notices.
export function toClientMessages(
  messages: ChatMessage[],
  skipId?: string,
): { role: 'user' | 'assistant'; content: string }[] {
  return messages
    .filter(message => message.kind === 'text' && !('notice' in message && message.notice))
    .filter(message => message.id !== 'ellie-greeting' && message.id !== skipId)
    .map(message => ({
      role: message.role,
      content: (message as { text: string }).text,
    }));
}
