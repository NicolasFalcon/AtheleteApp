import { failureEffect, type EllieFailure } from '@app/features/ellie/ellieCopy';
import type { MealAnalysis } from '@app/services/vision/visionService';
import type {
  EllieGeneratedNutritionPlan,
  EllieGeneratedWorkout,
} from '@app/services/supabase/ellie-actions';
import { plainMarkdown } from '@app/features/ellie/markdown';

// ELLIE · conversación v2: pure state of the chat (messages, send states,
// generative cards, errors) so the screen and the hook only wire it.
//
// The backend keeps ONE conversation per user (`chat_messages`), the edge
// function answers with text or a generated routine / nutrition plan.

// ── Errors ──────────────────────────────────────────────────────────────────
// What keeps the composer inactive: the day's quota, or no connection. The
// wording of every failure lives in ellieCopy.ts (es / en).
export type EllieBlock = 'offline' | 'limit';

// ── Messages ────────────────────────────────────────────────────────────────
export type SendStatus = 'sending' | 'sent' | 'failed';

export type UserMessage = {
  id: string;
  role: 'user';
  kind: 'text';
  text: string;
  status: SendStatus;
  // The id sent as client_message_id: the SAME one on every retry, so the
  // server never answers (or charges) the same message twice.
  clientMessageId: string;
  // Why it failed, when it did (retry is offered only if it can work).
  failure?: EllieFailure;
  // A photo sent with the message: the local file (just picked) and/or where
  // it is in storage (stored messages, and the retry of a failed one).
  imageUri?: string | null;
  imagePath?: string | null;
};

export type EllieTextMessage = {
  id: string;
  role: 'assistant';
  kind: 'text';
  text: string;
  // ELLIE's explanation of an error (not part of the conversation).
  notice?: boolean;
};

export type NutritionStage = 'proposed' | 'activating' | 'active' | 'error';
export type WorkoutStage = 'proposed' | 'saving' | 'saved' | 'error';

export type NutritionCardMessage = {
  id: string;
  role: 'assistant';
  kind: 'nutrition';
  plan: EllieGeneratedNutritionPlan;
  stage: NutritionStage;
};

export type WorkoutCardMessage = {
  id: string;
  role: 'assistant';
  kind: 'workout';
  workout: EllieGeneratedWorkout;
  stage: WorkoutStage;
  workoutId?: string;
  // chat_messages.id of the message that carries this plan (tool
  // generate_workout_plan): what save_user_routine receives. "Otra versión"
  // keeps the card id but the plan comes from a new message.
  messageId?: string;
};

// The analysis of a photo of a meal (tool meal_analysis). Whether it was
// already registered in Calorías is not part of the thread: it is read from
// nutrition_meals by chat_message_id (useRegisteredMeal).
export type MealCardMessage = {
  id: string;
  role: 'assistant';
  kind: 'meal';
  meal: MealAnalysis;
};

export type CardMessage = NutritionCardMessage | WorkoutCardMessage | MealCardMessage;
export type ChatMessage =
  | UserMessage
  | EllieTextMessage
  | NutritionCardMessage
  | WorkoutCardMessage
  | MealCardMessage;

export type ChatState = {
  messages: ChatMessage[];
  thinking: boolean;
  // The composer is inactive: limit reached, or no connection.
  blocked: EllieBlock | null;
};

export type ChatAction =
  // The stored conversation, already turned into messages (historyToMessages).
  | { type: 'load'; messages: ChatMessage[]; greeting: string }
  | { type: 'send'; id: string; text: string; image?: { uri: string; path: string } | null }
  | { type: 'delta'; id: string; delta: string }
  | { type: 'done' }
  | { type: 'tool'; id: string; intro?: string; card: CardMessage }
  | { type: 'fail'; id: string; failure: EllieFailure; text: string }
  | { type: 'retry'; id: string }
  | { type: 'stage'; id: string; stage: NutritionStage | WorkoutStage; workoutId?: string }
  | { type: 'replace'; id: string; card: CardMessage; intro?: string }
  | { type: 'reset'; greeting: string };

export const GREETING_ID = 'ellie-greeting';

export function greetingMessage(text: string): EllieTextMessage {
  return { id: GREETING_ID, role: 'assistant', kind: 'text', text };
}

export function initialChatState(greeting = ''): ChatState {
  return {
    messages: greeting ? [greetingMessage(greeting)] : [],
    thinking: false,
    blocked: null,
  };
}

const withoutNotice = (messages: ChatMessage[], userId: string) =>
  messages.filter(message => message.id !== `notice-${userId}`);

function markLastUser(messages: ChatMessage[], status: SendStatus): ChatMessage[] {
  let index = -1;
  messages.forEach((message, i) => {
    if (message.role === 'user') {
      index = i;
    }
  });
  if (index < 0) {
    return messages;
  }
  return messages.map((message, i) =>
    i === index && message.role === 'user' ? { ...message, status } : message,
  );
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'load':
      return {
        ...state,
        messages: [greetingMessage(action.greeting), ...action.messages],
      };
    case 'send':
      return {
        ...state,
        thinking: true,
        messages: [
          ...state.messages,
          {
            id: action.id,
            role: 'user',
            kind: 'text',
            text: action.text,
            status: 'sending',
            clientMessageId: action.id,
            imageUri: action.image?.uri ?? null,
            imagePath: action.image?.path ?? null,
          },
        ],
      };
    case 'delta': {
      const exists = state.messages.some(message => message.id === action.id);
      return {
        ...state,
        messages: exists
          ? state.messages.map(message =>
              message.id === action.id && message.kind === 'text'
                ? { ...message, text: message.text + action.delta }
                : message,
            )
          : [
              ...state.messages,
              { id: action.id, role: 'assistant', kind: 'text', text: action.delta },
            ],
      };
    }
    case 'done':
      return {
        ...state,
        thinking: false,
        messages: markLastUser(state.messages, 'sent'),
      };
    case 'tool': {
      const base = markLastUser(
        state.messages.filter(message => message.id !== action.id),
        'sent',
      );
      return {
        ...state,
        thinking: false,
        messages: [
          ...base,
          ...(action.intro
            ? [
                {
                  id: `${action.card.id}-intro`,
                  role: 'assistant' as const,
                  kind: 'text' as const,
                  text: action.intro,
                },
              ]
            : []),
          action.card,
        ],
      };
    }
    case 'fail': {
      const notice: EllieTextMessage = {
        id: `notice-${action.id}`,
        role: 'assistant',
        kind: 'text',
        text: action.text,
        notice: true,
      };
      const effect = failureEffect(action.failure.code);
      return {
        thinking: false,
        // A limit or no connection leaves the composer inactive until the
        // user retries (STATE_08).
        blocked: effect === 'limit' ? 'limit' : effect === 'offline' ? 'offline' : state.blocked,
        messages: [
          ...withoutNotice(state.messages, action.id).map(message =>
            message.id === action.id && message.role === 'user'
              ? { ...message, status: 'failed' as const, failure: action.failure }
              : message,
          ),
          notice,
        ],
      };
    }
    case 'retry':
      return {
        ...state,
        thinking: true,
        blocked: null,
        messages: withoutNotice(state.messages, action.id).map(message =>
          message.id === action.id && message.role === 'user'
            ? { ...message, status: 'sending' as const, failure: undefined }
            : message,
        ),
      };
    case 'stage':
      return {
        ...state,
        messages: state.messages.map(message =>
          message.id === action.id &&
          (message.kind === 'nutrition' || message.kind === 'workout')
            ? ({
                ...message,
                stage: action.stage,
                ...(action.workoutId ? { workoutId: action.workoutId } : {}),
              } as ChatMessage)
            : message,
        ),
      };
    case 'replace': {
      const index = state.messages.findIndex(message => message.id === action.id);
      if (index < 0) {
        return state;
      }
      const next = [...state.messages];
      next[index] = { ...action.card, id: action.id };
      if (action.intro) {
        next.splice(index, 0, {
          id: `${action.id}-intro-${next.length}`,
          role: 'assistant',
          kind: 'text',
          text: action.intro,
        });
      }
      return { ...state, messages: next };
    }
    case 'reset':
      return initialChatState(action.greeting);
  }
}

// What the composer can do now.
export function composerState(
  state: ChatState,
  draft: string,
): { canSend: boolean; disabled: boolean; placeholder: string } {
  if (state.blocked === 'limit') {
    return { canSend: false, disabled: true, placeholder: 'Límite alcanzado' };
  }
  if (state.blocked === 'offline') {
    return { canSend: false, disabled: true, placeholder: 'Sin conexión' };
  }
  return {
    canSend: !state.thinking && draft.trim().length > 0,
    disabled: false,
    placeholder: 'Escribe a ELLIE',
  };
}

export function isFirstContact(messages: ChatMessage[]): boolean {
  return messages.every(message => message.id === GREETING_ID);
}

// Suggestions under the greeting only while nothing was said yet.
export function showSuggestions(state: ChatState): boolean {
  return isFirstContact(state.messages) && !state.thinking;
}

// "Retomar conversación": the last line of the thread and when it was.
export function lastLine(
  history: { content: string; createdAt: string }[],
  now: Date,
): { text: string; when: string } | null {
  const last = history[history.length - 1];
  if (!last) {
    return null;
  }
  // Without markdown marks (B-24).
  const text = plainMarkdown(last.content).replace(/\s+/g, ' ').trim();
  return { text, when: relativeWhen(last.createdAt, now) };
}

export function relativeWhen(iso: string, now: Date): string {
  const then = new Date(iso);
  const day = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.round((day(now) - day(then)) / 86400000);
  if (days <= 0) {
    return now.getTime() - then.getTime() < 3600000 ? 'Ahora' : 'Hoy';
  }
  return days === 1 ? 'Ayer' : `Hace ${days} días`;
}

// Donut of the plan: protein, carbs and fats by calories (4 / 4 / 9) around
// a circle of radius 42, with a 2-pt gap between arcs.
export const DONUT_RADIUS = 42;
export const DONUT_LENGTH = 2 * Math.PI * DONUT_RADIUS;

export function macroDonut(plan: {
  targetProtein: number;
  targetCarbs: number;
  targetFats: number;
}): { length: number; offset: number }[] {
  const kcal = [plan.targetProtein * 4, plan.targetCarbs * 4, plan.targetFats * 9];
  const total = kcal.reduce((sum, value) => sum + value, 0) || 1;
  let offset = 0;
  return kcal.map(value => {
    const full = (value / total) * DONUT_LENGTH;
    const segment = { length: Math.max(0, full - 2), offset: -offset };
    offset += full;
    return segment;
  });
}

// The text the user sends from a quick answer, with the mode the edge
// function understands (same rule as the v1 prompt cards).
export type EllieMode = 'generate_workout' | 'generate_nutrition';
export const CANNED_PROMPTS: { text: string; mode?: EllieMode }[] = [
  { text: 'Ajustar mi rutina de hoy', mode: 'generate_workout' },
  { text: 'Quiero un plan nutricional', mode: 'generate_nutrition' },
  { text: 'Analiza mi semana' },
];

// What each entry point asks when it opens the chat (the prototype's
// `askEllie(prompt)`): sent once on arrival.
export const ELLIE_ASKS = {
  nutritionPlan: { text: 'Quiero un plan nutricional', mode: 'generate_nutrition' },
  adjustToday: { text: 'Ajusta mi rutina de hoy a 30 minutos', mode: 'generate_workout' },
  recovery: { text: 'Quiero mejorar mi recuperación' },
  week: { text: 'Analiza mi semana' },
  adjustNutrition: { text: 'Ajusta mi plan nutricional', mode: 'generate_nutrition' },
} as const satisfies Record<string, { text: string; mode?: EllieMode }>;
