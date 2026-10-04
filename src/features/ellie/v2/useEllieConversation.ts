import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@app/hooks/useAuth';
import { useEllieHistory } from '@app/hooks/useEllieHistory';
import { invalidateNutritionPlanQueries } from '@app/lib/queryInvalidation';
import {
  callEllieChat,
  generateWithEllie,
} from '@app/services/ellie/chat';
import {
  clearEllieChatHistory,
  insertEllieChatMessage,
} from '@app/services/supabase/ellie';
import {
  saveEllieNutritionPlan,
  saveEllieWorkout,
} from '@app/services/supabase/ellie-actions';
import {
  chatReducer,
  classifyEllieError,
  composerState,
  initialChatState,
  type ChatState,
  type EllieMode,
} from '@app/features/ellie/chatModel';
import {
  parseToolResult,
  toClientMessages,
} from '@app/features/ellie/resultParsing';

export const defaultGreeting = (name?: string | null) =>
  `Hola${name ? `, ${name}` : ''}. ¿En qué te ayudo hoy?`;

type Options = {
  userContext: string;
  greeting: string;
  // Development: a ready conversation. Nothing is sent or stored; the
  // actions are simulated locally.
  fixture?: ChatState;
};

export type RegenerateBusy = Record<string, boolean>;

// The state of the chat (chatReducer) wired to the ELLIE v1 backend: the
// ellie-chat edge function and chat_messages, exactly as the v1 hook did.
export function useEllieConversation({ userContext, greeting, fixture }: Options) {
  const { profile } = useAuth();
  const userId = profile?.id;
  const queryClient = useQueryClient();
  const history = useEllieHistory();
  const [state, dispatch] = useReducer(
    chatReducer,
    fixture ?? initialChatState(greeting),
  );
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState<RegenerateBusy>({});
  const stateRef = useRef(state);
  stateRef.current = state;
  const modes = useRef<Record<string, EllieMode | undefined>>({});
  const loaded = useRef(Boolean(fixture));

  // The stored thread is loaded once (the query keeps it for the session).
  useEffect(() => {
    if (fixture || loaded.current || !history.data) {
      return;
    }
    loaded.current = true;
    dispatch({ type: 'load', history: history.data, greeting });
  }, [fixture, greeting, history.data]);

  const ready = Boolean(fixture) || loaded.current || history.isError;
  const loading = !fixture && history.isLoading;
  const historyFailed = !fixture && history.isError;

  const persist = useCallback(
    (role: 'user' | 'assistant', content: string, onStored?: () => void) => {
      if (!userId || fixture) {
        return;
      }
      insertEllieChatMessage({ userId, role, content })
        .then(() => onStored?.())
        .catch(() => {});
    },
    [fixture, userId],
  );

  const run = useCallback(
    async (id: string, text: string, mode: EllieMode | undefined, retry: boolean) => {
      modes.current[id] = mode;
      const before = stateRef.current;
      const messages = [
        ...toClientMessages(before.messages, id),
        { role: 'user' as const, content: text },
      ];
      dispatch(retry ? { type: 'retry', id } : { type: 'send', id, text });
      const alreadyStored = before.messages.some(
        message => message.id === id && message.role === 'user' && message.persisted,
      );
      if (!alreadyStored) {
        persist('user', text, () => dispatch({ type: 'persisted', id }));
      }

      if (fixture) {
        setTimeout(() => {
          dispatch({ type: 'delta', id: `a-${id}`, delta: 'Respuesta de ejemplo (dev): no se envió nada.' });
          dispatch({ type: 'done' });
        }, 900);
        return;
      }

      const streamId = `assistant-${id}`;
      let answer = '';
      await callEllieChat({
        messages,
        userContext,
        mode,
        onDelta: delta => {
          answer += delta;
          dispatch({ type: 'delta', id: streamId, delta });
        },
        onDone: () => {
          dispatch({ type: 'done' });
          if (answer.trim()) {
            persist('assistant', answer);
          }
        },
        onToolResult: result => {
          const parsed = parseToolResult(result, `card-${id}`, messages);
          if (!parsed) {
            dispatch({ type: 'done' });
            return;
          }
          dispatch({ type: 'tool', id: streamId, intro: parsed.intro, card: parsed.card });
          persist('assistant', parsed.summary);
        },
        onError: (message, status) =>
          dispatch({ type: 'fail', id, kind: classifyEllieError({ status, message }) }),
      });
    },
    [fixture, persist, userContext],
  );

  const send = useCallback(
    (text: string, mode?: EllieMode) => {
      const trimmed = text.trim();
      if (!trimmed || stateRef.current.thinking || (!userId && !fixture)) {
        return;
      }
      setDraft('');
      run(`user-${Date.now()}`, trimmed, mode, false);
    },
    [fixture, run, userId],
  );

  const retry = useCallback(
    (id: string) => {
      const message = stateRef.current.messages.find(item => item.id === id);
      if (message && message.role === 'user' && message.kind === 'text') {
        run(id, message.text, modes.current[id], true);
      }
    },
    [run],
  );

  const settle = useCallback(
    (id: string, stage: 'active' | 'saved' | 'error', workoutId?: string) =>
      dispatch({ type: 'stage', id, stage, workoutId }),
    [],
  );

  const activatePlan = useCallback(
    async (id: string) => {
      const card = stateRef.current.messages.find(item => item.id === id);
      if (!card || card.kind !== 'nutrition' || !userId) {
        return;
      }
      dispatch({ type: 'stage', id, stage: 'activating' });
      if (fixture) {
        setTimeout(() => settle(id, 'active'), 900);
        return;
      }
      const result = await saveEllieNutritionPlan(userId, card.plan);
      if (!result.success) {
        settle(id, 'error');
        return;
      }
      settle(id, 'active');
      await invalidateNutritionPlanQueries(queryClient, userId);
    },
    [fixture, queryClient, settle, userId],
  );

  const saveRoutine = useCallback(
    async (id: string) => {
      const card = stateRef.current.messages.find(item => item.id === id);
      if (!card || card.kind !== 'workout' || !userId) {
        return;
      }
      dispatch({ type: 'stage', id, stage: 'saving' });
      if (fixture) {
        setTimeout(() => settle(id, 'saved', 'fixture'), 900);
        return;
      }
      const result = await saveEllieWorkout(userId, card.workout);
      if (!result.success) {
        settle(id, 'error');
        return;
      }
      settle(id, 'saved', result.workoutId);
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ['workouts', 'library', userId] }),
        queryClient.invalidateQueries({ queryKey: ['ellie', 'overview', userId] }),
        queryClient.invalidateQueries({ queryKey: ['home', 'overview', userId] }),
      ]);
    },
    [fixture, queryClient, settle, userId],
  );

  // "Otra versión": same request as v1 (regeneration messages + mode).
  const anotherVersion = useCallback(
    async (id: string) => {
      const card = stateRef.current.messages.find(item => item.id === id);
      if (!card || (card.kind !== 'nutrition' && card.kind !== 'workout') || fixture) {
        return;
      }
      const isWorkout = card.kind === 'workout';
      setBusy(current => ({ ...current, [id]: true }));
      try {
        const result = await generateWithEllie({
          messages: [
            ...(card.context ?? []),
            {
              role: 'assistant',
              content: `Ya generé una versión anterior llamada "${
                card.kind === 'workout' ? card.workout.title : 'plan anterior'
              }". El usuario quiere una variante diferente.`,
            },
            {
              role: 'user',
              content:
                'Genérame otra versión diferente, con otra estructura y una propuesta distinta.',
            },
          ],
          userContext,
          mode: isWorkout ? 'generate_workout' : 'generate_nutrition',
        });
        const parsed = parseToolResult(result, id, card.context ?? []);
        if (parsed) {
          dispatch({ type: 'replace', id, card: parsed.card, intro: parsed.intro });
        }
      } catch {
        settle(id, 'error');
      } finally {
        setBusy(current => ({ ...current, [id]: false }));
      }
    },
    [fixture, settle, userContext],
  );

  // Starts over: the one stored thread is cleared (as in v1).
  const reset = useCallback(async () => {
    if (userId && !fixture) {
      await clearEllieChatHistory(userId);
      await queryClient.invalidateQueries({ queryKey: ['ellie', 'chat', userId] });
    }
    dispatch({ type: 'reset', greeting });
    setDraft('');
  }, [fixture, greeting, queryClient, userId]);

  const composer = useMemo(() => composerState(state, draft), [draft, state]);

  return {
    state,
    draft,
    setDraft,
    composer,
    ready,
    loading,
    historyFailed,
    refetchHistory: history.refetch,
    busy,
    send,
    retry,
    activatePlan,
    saveRoutine,
    anotherVersion,
    reset,
  };
}
