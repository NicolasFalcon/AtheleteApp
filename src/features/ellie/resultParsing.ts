import type {
  EllieGeneratedNutritionPlan,
  EllieGeneratedWorkout,
} from '@app/services/supabase/ellie-actions';
import { parseEllieTool, type EllieTool } from '@app/services/ellie/ellieService';
import type { RoutineInput } from '@app/services/routines/routinesService';
import type { EllieStoredMessage } from '@app/services/ellie/ellieHistory';
import { parseMealAnalysis } from '@app/services/vision/visionService';
import {
  proposalMessageId,
  type CardMessage,
  type ChatMessage,
  type ProposalMessage,
} from '@app/features/ellie/chatModel';
import {
  isProposalCardType,
  parseDiscomfortCheck,
  parseRoutineLibrary,
  parseRoutineProposal,
  parseWeekPlanConflict,
  parseWeekPlanAdded,
  storedCards,
  type ProposalCard,
} from '@app/services/ellie/ellieProposals';
import { parseNutritionProposal } from '@app/services/ellie/nutritionProposals';
import { parseTrainingPlanProposal } from '@app/services/supabase/trainingPlan';
import {
  parseAdjustmentCard,
  parsePlanActionConfirm,
  parsePlanReviewCard,
} from '@app/features/ellie/planCardsModel';
import { DISCOMFORT_CHIPS, discomfortFromText } from '@app/features/ellie/discomfortModel';

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

// save_user_routine payload of an ELLIE plan: its exercises are the tool's
// (tool_data.exercises); the server names them from the catalog.
export function ellieRoutineInput(workout: EllieGeneratedWorkout): RoutineInput {
  return {
    title: workout.title,
    description: workout.description ?? null,
    type: workout.type,
    difficulty: workout.difficulty,
    duration: workout.duration,
    calories: workout.calories,
    targetMuscles: workout.targetMuscles,
    exercises: workout.exercises.flatMap(exercise =>
      exercise.exerciseId
        ? [
            {
              exerciseId: exercise.exerciseId,
              block: 'main' as const,
              sets: exercise.sets ?? null,
              reps: exercise.reps ?? null,
              duration: exercise.duration ?? null,
              restTime: exercise.restTime ?? null,
              notes: exercise.notes ?? null,
            },
          ]
        : [],
    ),
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
// content is the plan's intro_message. A tool with proposal_id, a v2 card type
// or a cards list is a v2 card (storedCards), never the old one.
export function parseTool(tool: EllieTool, id: string, content: string): ParsedTool | null {
  if (
    'proposal_id' in tool.data ||
    isProposalCardType(tool.data.type) ||
    Array.isArray(tool.data.cards)
  ) {
    return null;
  }
  const intro =
    content || (typeof tool.data.intro_message === 'string' ? tool.data.intro_message : '');
  if (tool.type === 'meal_analysis') {
    const meal = parseMealAnalysis(tool.data);
    return meal ? { intro, card: { id, role: 'assistant', kind: 'meal', meal } } : null;
  }
  if (tool.type === 'generate_workout_plan') {
    return {
      intro,
      card: {
        id,
        messageId: id,
        role: 'assistant',
        kind: 'workout',
        workout: parseWorkout(tool.data),
        stage: 'proposed',
      },
    };
  }
  return {
    intro,
    card: { id, role: 'assistant', kind: 'nutrition', plan: parseNutrition(tool.data), stage: 'proposed' },
  };
}

// A card of cards_v2 as a chat message. With its payload (stream / JSON) the
// routine is ready; from the history (proposal_id only) it is `loading` until
// get_proposal answers. A routine card without proposal_id is not shown.
export function proposalToMessage(card: ProposalCard, fallbackId: string): ProposalMessage | null {
  const id = card.proposalId ? proposalMessageId(card.proposalId) : `${fallbackId}-${card.type}`;
  if (card.type === 'discomfort_check') {
    const check = parseDiscomfortCheck(card.payload);
    return {
      id,
      role: 'assistant',
      kind: 'discomfortCheck',
      zones: check.zones,
      chips: check.chips.length > 0 ? check.chips : [...DISCOMFORT_CHIPS],
      answer: null,
    };
  }
  if (card.type === 'nutrition_prefs_request') {
    return { id, role: 'assistant', kind: 'nutritionPrefs', prefs: null, answered: false };
  }
  // Training-plan cards (no proposal_id; the payload is the card). Their ids
  // carry what tells two cards of one reply apart.
  if (card.type === 'plan_adjustment') {
    const adjustment = parseAdjustmentCard(card.payload);
    return adjustment
      ? {
          id: `${fallbackId}-${card.type}-${adjustment.id}`,
          role: 'assistant',
          kind: 'planAdjustment',
          adjustment,
          answered: null,
        }
      : null;
  }
  if (card.type === 'plan_review') {
    const review = parsePlanReviewCard(card.payload);
    return review
      ? { id: `${fallbackId}-${card.type}-${review.weekIndex}`, role: 'assistant', kind: 'planReview', review }
      : null;
  }
  if (card.type === 'plan_action_confirm') {
    const confirm = parsePlanActionConfirm(card.payload);
    return confirm
      ? {
          id: `${fallbackId}-${card.type}-${confirm.action}`,
          role: 'assistant',
          kind: 'planActionConfirm',
          confirm,
          status: 'open',
          pausedUntil: null,
        }
      : null;
  }
  // prop-2: these cards have no proposal_id; their payload is the card.
  if (card.type === 'routine_library') {
    const library = parseRoutineLibrary(card.payload);
    return library ? { id: `${fallbackId}-${card.type}-${library.routineId}`, role: 'assistant', kind: 'routineLibrary', library } : null;
  }
  if (card.type === 'week_plan_added') {
    const added = parseWeekPlanAdded(card.payload);
    return added
      ? { id: `${fallbackId}-${card.type}-${added.date}`, role: 'assistant', kind: 'weekPlanAdded', added, removed: false }
      : null;
  }
  if (card.type === 'week_plan_conflict') {
    const conflict = parseWeekPlanConflict(card.payload);
    return conflict
      ? {
          id: `${fallbackId}-${card.type}-${conflict.date}`,
          role: 'assistant',
          kind: 'weekPlanConflict',
          conflict,
        }
      : null;
  }
  if (!card.proposalId) {
    return null;
  }
  if (card.type === 'training_plan_proposal') {
    const plan = card.payload
      ? parseTrainingPlanProposal(card.proposalId, card.payload, {
          version: card.version,
          adjustLabel: card.adjustLabel,
        })
      : null;
    return {
      id,
      role: 'assistant',
      kind: 'trainingPlanProposal',
      proposalId: card.proposalId,
      version: card.version,
      adjustLabel: card.adjustLabel,
      proposal: plan,
      status: plan ? 'open' : 'loading',
      startDate: null,
    };
  }
  if (card.type === 'nutrition_plan_proposal') {
    const plan = card.payload
      ? parseNutritionProposal(card.proposalId, card.payload, {
          version: card.version,
          adjustLabel: card.adjustLabel,
        })
      : null;
    return {
      id,
      role: 'assistant',
      kind: 'nutritionProposal',
      proposalId: card.proposalId,
      version: card.version,
      adjustLabel: card.adjustLabel,
      proposal: plan,
      status: plan ? 'open' : 'loading',
    };
  }
  const proposal = card.payload
    ? parseRoutineProposal(card.proposalId, card.payload, {
        version: card.version,
        adjustLabel: card.adjustLabel,
      })
    : null;
  return {
    id,
    role: 'assistant',
    kind: 'routineProposal',
    proposalId: card.proposalId,
    version: card.version,
    adjustLabel: card.adjustLabel,
    proposal,
    status: proposal ? 'open' : 'loading',
  };
}

// The stored conversation as chat messages: text, and the cards of the plans
// ELLIE generated (chat_messages.tool_type / tool_data).
export function historyToMessages(rows: EllieStoredMessage[]): ChatMessage[] {
  return answeredPrefs(answeredDiscomforts(storedMessages(rows)));
}

// A questions card followed by a user message was answered: it shows "TUS
// PREFERENCIAS" (the values are read with get_food_preferences).
function answeredPrefs(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((message, index) =>
    message.kind === 'nutritionPrefs' && messages.slice(index + 1).some(item => item.role === 'user')
      ? { ...message, answered: true }
      : message,
  );
}

// A discomfort_check followed by the user's reply shows that reply.
function answeredDiscomforts(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((message, index) => {
    if (message.kind !== 'discomfortCheck') {
      return message;
    }
    const reply = messages.slice(index + 1).find(item => item.role === 'user');
    const answer = reply?.kind === 'text' ? discomfortFromText(reply.text, message.zones) : null;
    return answer ? { ...message, answer } : message;
  });
}

function storedMessages(rows: EllieStoredMessage[]): ChatMessage[] {
  return rows.flatMap((row): ChatMessage[] => {
    const cards = row.role === 'assistant' ? storedCards(row.toolType, row.toolData) : [];
    if (cards.length > 0) {
      return [
        ...(row.content ? [{ id: row.id, role: 'assistant' as const, kind: 'text' as const, text: row.content }] : []),
        ...cards
          .map(card => proposalToMessage(card, row.id))
          .filter((message): message is ProposalMessage => message !== null),
      ];
    }
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
