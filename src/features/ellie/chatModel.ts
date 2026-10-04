import type {
  EllieGeneratedNutritionPlan,
  EllieGeneratedWorkout,
} from '@app/services/supabase/ellie-actions';

// ELLIE · conversación v2: pure state of the chat (messages, send states,
// generative cards, errors) so the screen and the hook only wire it.
//
// The backend keeps ONE conversation per user (`chat_messages`), the edge
// function answers with text or a generated routine / nutrition plan.

// ── Errors ──────────────────────────────────────────────────────────────────
export type EllieErrorKind = 'offline' | 'limit' | 'server';

// ELLIE explains the failure with her voice (STATE_08). Not persisted.
export const ELLIE_ERROR_LINES: Record<EllieErrorKind, string> = {
  offline:
    'Ahora mismo no puedo conectarme. Tus datos están a salvo; te respondo en cuanto vuelva la red.',
  server:
    'Algo falló de mi lado y no pude responderte. Inténtalo de nuevo en unos segundos.',
  limit:
    'Hoy llegamos al límite de mensajes. Tus datos están a salvo; seguimos en cuanto se renueve.',
};

// The client does not know any quota: only the HTTP status and an error
// text. 429 / 402 are read as a limit; a failed fetch as no connection.
export function classifyEllieError(input: {
  status?: number;
  message?: string;
}): EllieErrorKind {
  if (input.status === 429 || input.status === 402) {
    return 'limit';
  }
  if (input.status !== undefined && input.status > 0) {
    return 'server';
  }
  const message = (input.message ?? '').toLowerCase();
  if (
    message.includes('network') ||
    message.includes('internet') ||
    message.includes('offline') ||
    message.includes('failed to fetch') ||
    message.includes('conectar') ||
    message.includes('timed out')
  ) {
    return 'offline';
  }
  return 'server';
}

// ── Messages ────────────────────────────────────────────────────────────────
export type SendStatus = 'sending' | 'sent' | 'failed';

export type UserMessage = {
  id: string;
  role: 'user';
  kind: 'text';
  text: string;
  status: SendStatus;
  // Already stored in chat_messages (a retry must not store it twice).
  persisted: boolean;
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
  // Messages that produced it (to ask for another version).
  context?: { role: 'user' | 'assistant'; content: string }[];
};

export type WorkoutCardMessage = {
  id: string;
  role: 'assistant';
  kind: 'workout';
  workout: EllieGeneratedWorkout;
  stage: WorkoutStage;
  workoutId?: string;
  context?: { role: 'user' | 'assistant'; content: string }[];
};

export type CardMessage = NutritionCardMessage | WorkoutCardMessage;
export type ChatMessage =
  | UserMessage
  | EllieTextMessage
  | NutritionCardMessage
  | WorkoutCardMessage;

export type ChatState = {
  messages: ChatMessage[];
  thinking: boolean;
  // The composer is inactive: limit reached, or no connection.
  blocked: EllieErrorKind | null;
};

export type HistoryRow = { id: string; role: 'user' | 'assistant'; content: string };

export type ChatAction =
  | { type: 'load'; history: HistoryRow[]; greeting: string }
  | { type: 'send'; id: string; text: string }
  | { type: 'delta'; id: string; delta: string }
  | { type: 'done' }
  | { type: 'tool'; id: string; intro?: string; card: CardMessage }
  | { type: 'persisted'; id: string }
  | { type: 'fail'; id: string; kind: EllieErrorKind }
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
        messages: [
          greetingMessage(action.greeting),
          ...action.history.map<ChatMessage>(row =>
            row.role === 'user'
              ? {
                  id: row.id,
                  role: 'user',
                  kind: 'text',
                  text: row.content,
                  status: 'sent',
                  persisted: true,
                }
              : { id: row.id, role: 'assistant', kind: 'text', text: row.content },
          ),
        ],
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
            persisted: false,
          },
        ],
      };
    case 'persisted':
      return {
        ...state,
        messages: state.messages.map(message =>
          message.id === action.id && message.role === 'user'
            ? { ...message, persisted: true }
            : message,
        ),
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
        text: ELLIE_ERROR_LINES[action.kind],
        notice: true,
      };
      return {
        thinking: false,
        // A limit or no connection leaves the composer inactive until the
        // user retries (STATE_08).
        blocked: action.kind === 'server' ? state.blocked : action.kind,
        messages: [
          ...withoutNotice(state.messages, action.id).map(message =>
            message.id === action.id && message.role === 'user'
              ? { ...message, status: 'failed' as const }
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
            ? { ...message, status: 'sending' as const }
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
  const text = last.content.replace(/\s+/g, ' ').trim();
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
} as const satisfies Record<string, { text: string; mode?: EllieMode }>;
