import {
  chatReducer,
  initialChatState,
  type ChatState,
  type NutritionCardMessage,
  type WorkoutCardMessage,
} from '@app/features/ellie/chatModel';
import type { EllieChatRouteParams } from '@app/types/navigation';

// Development only: ready conversations for every state of the chat
// (athelete://dev/ellie?screen=…). Nothing is sent to ELLIE or stored.

export const FIXTURE_PLAN = {
  targetCalories: 2850,
  targetProtein: 168,
  targetCarbs: 330,
  targetFats: 85,
  notes:
    'Con tu objetivo de ganar músculo y 6 días de entreno, subo las calorías un 12 % sobre tu mantenimiento y reparto la proteína en 4 tomas.',
};

const plan = (stage: NutritionCardMessage['stage']): NutritionCardMessage => ({
  id: 'fx-plan',
  role: 'assistant',
  kind: 'nutrition',
  plan: FIXTURE_PLAN,
  stage,
});

const routine = (stage: WorkoutCardMessage['stage']): WorkoutCardMessage => ({
  id: 'fx-routine',
  role: 'assistant',
  kind: 'workout',
  stage,
  workoutId: stage === 'saved' ? 'fixture' : undefined,
  workout: {
    title: 'Total Body · 30 min',
    type: 'fullbody',
    difficulty: 'intermediate',
    duration: 30,
    calories: 260,
    targetMuscles: [],
    exercises: [
      'Sentadilla goblet',
      'Press de banca',
      'Remo',
      'Peso muerto rumano',
      'Plancha',
    ].map(name => ({ name, sets: 3, reps: 10 })),
  },
});

export function ellieChatFixture(
  kind: NonNullable<EllieChatRouteParams['devState']>,
  greeting: string,
): ChatState {
  let state = initialChatState(greeting);
  const ask = (id: string, text: string) => {
    state = chatReducer(state, { type: 'send', id, text });
    state = chatReducer(state, { type: 'done' });
  };
  const reply = (text: string) => {
    state = {
      ...state,
      messages: [
        ...state.messages,
        {
          id: `r${state.messages.length}`,
          role: 'assistant',
          kind: 'text',
          text,
        },
      ],
    };
  };
  switch (kind) {
    case 'chat':
      ask('u1', 'Analiza mi semana');
      reply(
        'Llevas 2 entrenos y 11 días seguidos de Core 33. Te falta una sesión para cerrar la semana; mañana encaja bien una de 30 minutos.',
      );
      break;
    case 'thinking':
      ask('u1', 'Analiza mi semana');
      state = { ...state, thinking: true };
      break;
    case 'plan':
    case 'planActivating':
    case 'planError':
    case 'planActive': {
      ask('u1', 'Quiero un plan nutricional');
      reply(
        'Con tu objetivo de ganar músculo y 6 días de entreno, te propongo este punto de partida.',
      );
      const stage = {
        plan: 'proposed',
        planActivating: 'activating',
        planError: 'error',
        planActive: 'active',
      } as const;
      state = { ...state, messages: [...state.messages, plan(stage[kind])] };
      break;
    }
    case 'routine':
      ask('u1', 'Ajustar mi rutina de hoy');
      reply('Te dejo una rutina de cuerpo completo que cabe en 30 minutos.');
      state = { ...state, messages: [...state.messages, routine('proposed')] };
      break;
    case 'offline':
      state = chatReducer(state, {
        type: 'send',
        id: 'u1',
        text: 'Ajustar mi rutina de hoy',
      });
      state = chatReducer(state, { type: 'fail', id: 'u1', kind: 'offline' });
      break;
    case 'server':
      state = chatReducer(state, {
        type: 'send',
        id: 'u1',
        text: 'Analiza mi semana',
      });
      state = chatReducer(state, { type: 'fail', id: 'u1', kind: 'server' });
      break;
    case 'limit':
      state = chatReducer(state, {
        type: 'send',
        id: 'u1',
        text: 'Analiza mi semana',
      });
      state = chatReducer(state, { type: 'fail', id: 'u1', kind: 'limit' });
      break;
    default:
      break;
  }
  return state;
}
