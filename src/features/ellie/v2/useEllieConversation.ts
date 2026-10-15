import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  chatReducer,
  composerState,
  initialChatState,
  type EllieMode as PlanMode,
} from '@app/features/ellie/chatModel';
import { ellieErrorLine, failureEffect, type EllieLanguage } from '@app/features/ellie/ellieCopy';
import { historyToMessages, parseTool } from '@app/features/ellie/resultParsing';
import { useAuth } from '@app/hooks/useAuth';
import {
  cacheEllieUsage,
  invalidateEllieConversations,
  useEllieLatest,
  useEllieMessages,
  useEllieUsage,
} from '@app/hooks/useEllieConversations';
import { createUuid } from '@app/lib/uuid';
import { saveEllieNutritionPlan, saveEllieWorkout } from '@app/services/supabase/ellie-actions';
import { invalidateNutritionPlanQueries } from '@app/lib/queryInvalidation';
import {
  EllieError,
  sendEllieMessage,
  type EllieMode,
  type EllieReply,
} from '@app/services/ellie/ellieService';

export const defaultGreeting = (name?: string | null) =>
  `Hola${name ? `, ${name}` : ''}. ¿En qué te ayudo hoy?`;

// What is sent with a photo and no words.
const PHOTO_TEXT: Record<EllieLanguage, string> = {
  es: 'Mira esta foto.',
  en: 'Look at this photo.',
};

// "Another version" of a plan: a new turn of the same conversation.
const ANOTHER_VERSION: Record<EllieLanguage, string> = {
  es: 'Genérame otra versión diferente, con otra estructura y una propuesta distinta.',
  en: 'Generate a different version for me, with another structure and a different proposal.',
};

type Options = {
  greeting: string;
  language: EllieLanguage;
  // undefined: the most recent conversation; null: a new one; a uuid: that one.
  conversationId?: string | null;
  // Only the screen the question comes from ("home", "session_summary"…).
  clientContext?: string | null;
  // The session is gone: the screen goes back to the sign-in.
  onUnauthorized?: () => void;
};

export type RegenerateBusy = Record<string, boolean>;

// The state of the chat (chatReducer) wired to ellie-chat: the server keeps the
// conversation and reads the user's context; the app sends one message per
// turn with an idempotency key and reads the history. Nothing is inserted from
// here.
export function useEllieConversation({
  greeting,
  language,
  conversationId: requestedId,
  clientContext = null,
  onUnauthorized,
}: Options) {
  const { profile } = useAuth();
  const userId = profile?.id;
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(chatReducer, initialChatState(greeting));
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState<RegenerateBusy>({});
  const stateRef = useRef(state);
  stateRef.current = state;
  const modes = useRef<Record<string, EllieMode | undefined>>({});
  // The photo each message carries (its path in storage): a retry sends it again.
  const images = useRef<Record<string, string | undefined>>({});

  // Which conversation is open. Without a request it is the latest one, once
  // known; a conversation created by the first message is adopted here.
  const latest = useEllieLatest();
  const [adopted, setAdopted] = useState<string | null | undefined>(requestedId);
  const conversationId =
    adopted !== undefined ? adopted : latest.isSuccess ? latest.data?.conversation.id ?? null : undefined;
  const conversationRef = useRef<string | null>(null);
  conversationRef.current = conversationId ?? null;
  // A conversation born in this screen is not loaded from the server: its
  // messages are already here.
  const [localOnly, setLocalOnly] = useState(false);
  const loadedFor = useRef<string | null>(null);
  const messagesQuery = useEllieMessages(conversationId ?? null, !localOnly);
  const usage = useEllieUsage();

  useEffect(() => {
    if (!conversationId || localOnly || loadedFor.current === conversationId) {
      return;
    }
    if (messagesQuery.data && !messagesQuery.isFetching) {
      loadedFor.current = conversationId;
      dispatch({ type: 'load', messages: historyToMessages(messagesQuery.data), greeting });
    }
  }, [conversationId, greeting, localOnly, messagesQuery.data, messagesQuery.isFetching]);

  const waitingForLatest = adopted === undefined && !latest.isSuccess && !latest.isError;
  const emptyThread = conversationId === null || (adopted === undefined && latest.isError);
  const ready = emptyThread
    ? true
    : !waitingForLatest && (localOnly || loadedFor.current === conversationId || messagesQuery.isError);
  const loading = !ready;
  const historyFailed = Boolean(conversationId) && !localOnly && messagesQuery.isError;

  const fail = useCallback(
    (id: string, error: unknown) => {
      const failure =
        error instanceof EllieError
          ? { code: error.code, used: error.used, limit: error.limit }
          : { code: 'unknown' as const };
      dispatch({ type: 'fail', id, failure, text: ellieErrorLine(failure, language) });
      if (failureEffect(failure.code) === 'login') {
        onUnauthorized?.();
      }
    },
    [language, onUnauthorized],
  );

  // After a good reply: adopt the conversation, keep the usage, refresh lists.
  const afterReply = useCallback(
    (reply: EllieReply) => {
      if (conversationRef.current !== reply.conversationId) {
        conversationRef.current = reply.conversationId;
        loadedFor.current = reply.conversationId;
        setLocalOnly(true);
        setAdopted(reply.conversationId);
      }
      cacheEllieUsage(queryClient, userId, reply.usage);
      invalidateEllieConversations(queryClient, userId);
    },
    [queryClient, userId],
  );

  const run = useCallback(
    async (
      id: string,
      text: string,
      mode: EllieMode | undefined,
      retry: boolean,
      image: { uri: string; path: string } | null = null,
    ) => {
      modes.current[id] = mode;
      dispatch(retry ? { type: 'retry', id } : { type: 'send', id, text, image });
      try {
        const reply = await sendEllieMessage({
          conversationId: conversationRef.current,
          // Same id on every retry: the server returns the stored answer
          // (replayed) instead of answering and charging twice.
          clientMessageId: id,
          message: text,
          mode,
          imagePath: images.current[id] ?? null,
          clientContext,
        });
        afterReply(reply);
        const parsed = reply.message.tool
          ? parseTool(reply.message.tool, reply.message.id, reply.message.content)
          : null;
        if (parsed) {
          dispatch({ type: 'tool', id: `assistant-${id}`, intro: parsed.intro, card: parsed.card });
        } else {
          dispatch({ type: 'delta', id: reply.message.id || `assistant-${id}`, delta: reply.message.content });
          dispatch({ type: 'done' });
        }
      } catch (error) {
        fail(id, error);
      }
    },
    [afterReply, clientContext, fail],
  );

  const send = useCallback(
    (text: string, mode?: PlanMode, image?: { uri: string; path: string } | null) => {
      const trimmed = text.trim() || (image ? PHOTO_TEXT[language] : '');
      if (!trimmed || stateRef.current.thinking || !userId) {
        return;
      }
      setDraft('');
      const id = createUuid();
      if (image) {
        images.current[id] = image.path;
      }
      run(id, trimmed, mode, false, image ?? null).catch(() => undefined);
    },
    [language, run, userId],
  );

  const retry = useCallback(
    (id: string) => {
      const message = stateRef.current.messages.find(item => item.id === id);
      if (message && message.role === 'user' && message.kind === 'text') {
        run(message.clientMessageId, message.text, modes.current[id], true).catch(() => undefined);
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
      const result = await saveEllieNutritionPlan(userId, card.plan);
      if (!result.success) {
        settle(id, 'error');
        return;
      }
      settle(id, 'active');
      await invalidateNutritionPlanQueries(queryClient, userId);
    },
    [queryClient, settle, userId],
  );

  const saveRoutine = useCallback(
    async (id: string) => {
      const card = stateRef.current.messages.find(item => item.id === id);
      if (!card || card.kind !== 'workout' || !userId) {
        return;
      }
      dispatch({ type: 'stage', id, stage: 'saving' });
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
    [queryClient, settle, userId],
  );

  // "Otra versión": one more turn of the same conversation, in the mode of the
  // card; the new plan replaces the card.
  const anotherVersion = useCallback(
    async (id: string) => {
      const card = stateRef.current.messages.find(item => item.id === id);
      if (!card || (card.kind !== 'nutrition' && card.kind !== 'workout')) {
        return;
      }
      setBusy(current => ({ ...current, [id]: true }));
      try {
        const reply = await sendEllieMessage({
          conversationId: conversationRef.current,
          clientMessageId: createUuid(),
          message: ANOTHER_VERSION[language],
          mode: card.kind === 'workout' ? 'generate_workout' : 'generate_nutrition',
          clientContext,
        });
        afterReply(reply);
        const parsed = reply.message.tool ? parseTool(reply.message.tool, id, reply.message.content) : null;
        if (parsed && parsed.card.kind !== 'meal') {
          dispatch({ type: 'replace', id, card: parsed.card, intro: parsed.intro });
        } else {
          settle(id, 'error');
        }
      } catch (error) {
        settle(id, 'error');
        if (error instanceof EllieError && failureEffect(error.code) === 'login') {
          onUnauthorized?.();
        }
      } finally {
        setBusy(current => ({ ...current, [id]: false }));
      }
    },
    [afterReply, clientContext, language, onUnauthorized, settle],
  );

  // A new conversation: the server creates it with the first message.
  const newConversation = useCallback(() => {
    conversationRef.current = null;
    loadedFor.current = null;
    setLocalOnly(false);
    setAdopted(null);
    dispatch({ type: 'reset', greeting });
    setDraft('');
  }, [greeting]);

  // Opens another stored conversation.
  const openConversation = useCallback(
    (id: string) => {
      conversationRef.current = id;
      loadedFor.current = null;
      setLocalOnly(false);
      setAdopted(id);
      dispatch({ type: 'reset', greeting });
      setDraft('');
    },
    [greeting],
  );

  const composer = useMemo(() => composerState(state, draft), [draft, state]);

  return {
    state,
    draft,
    setDraft,
    composer,
    busy,
    conversationId: conversationId ?? null,
    ready,
    loading,
    historyFailed,
    refetchHistory: () => {
      loadedFor.current = null;
      messagesQuery.refetch().catch(() => undefined);
    },
    usage: usage.data ?? null,
    send,
    retry,
    activatePlan,
    saveRoutine,
    anotherVersion,
    newConversation,
    openConversation,
  };
}
