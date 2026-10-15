import type {
  EllieGeneratedNutritionPlan,
  EllieGeneratedWorkout,
} from '@app/services/supabase/ellie-actions';
import { parseEllieTool, type EllieTool } from '@app/services/ellie/ellieService';
import type { EllieStoredMessage } from '@app/services/ellie/ellieHistory';
import { parseMealAnalysis } from '@app/services/vision/visionService';
import type { CardMessage, ChatMessage } from '@app/features/ellie/chatModel';

// Reading of the tool data of ellie-chat (docs/backend/ELLIE_SHAPES.md):
// defaults for whatever is missing. `exercise_id` is always a real exercise of
// the MoveKit catalog; the ones the model invented never arrive.
// A number, or a numeric string ("12"); anything else is missing.
function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

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
    droppedExercises: toNumber(data?.dropped_exercises) ?? 0,
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
          sets: toNumber(exercise?.sets),
          reps: toNumber(exercise?.reps),
          duration: toNumber(exercise?.duration),
          restTime: toNumber(exercise?.rest_time),
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
  card: CardMessage;
};

// A plan the server returned (`tool`) becomes a card. With a plan, the reply's
// content is the plan's intro_message.
export function parseTool(tool: EllieTool, id: string, content: string): ParsedTool | null {
  const intro =
    content || (typeof tool.data.intro_message === 'string' ? tool.data.intro_message : '');
  if (tool.type === 'meal_analysis') {
    const meal = parseMealAnalysis(tool.data);
    return meal ? { intro, card: { id, role: 'assistant', kind: 'meal', meal } } : null;
  }
  if (tool.type === 'generate_workout_plan') {
    return {
      intro,
      card: { id, role: 'assistant', kind: 'workout', workout: parseWorkout(tool.data), stage: 'proposed' },
    };
  }
  return {
    intro,
    card: { id, role: 'assistant', kind: 'nutrition', plan: parseNutrition(tool.data), stage: 'proposed' },
  };
}

// The stored conversation as chat messages: text, and the cards of the plans
// ELLIE generated (chat_messages.tool_type / tool_data).
export function historyToMessages(rows: EllieStoredMessage[]): ChatMessage[] {
  return rows.flatMap((row): ChatMessage[] => {
    if (row.role === 'user') {
      return [
        {
          id: row.id,
          role: 'user',
          kind: 'text',
          text: row.content,
          status: 'sent',
          clientMessageId: row.clientMessageId ?? row.id,
          imagePath: row.imagePath,
        },
      ];
    }
    const tool =
      row.toolType === 'generate_workout_plan' ||
      row.toolType === 'generate_nutrition_plan' ||
      row.toolType === 'meal_analysis'
        ? parseEllieTool({ type: row.toolType, data: row.toolData })
        : null;
    // An unknown or unreadable tool: only the text (content) is shown.
    const parsed = tool ? parseTool(tool, row.id, row.content) : null;
    if (!parsed) {
      return [{ id: row.id, role: 'assistant', kind: 'text', text: row.content }];
    }
    return [
      ...(parsed.intro
        ? [{ id: `${row.id}-intro`, role: 'assistant' as const, kind: 'text' as const, text: parsed.intro }]
        : []),
      parsed.card,
    ];
  });
}
