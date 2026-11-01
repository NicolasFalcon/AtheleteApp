import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  chatReducer,
  composerState,
  initialChatState,
  proposalMessageId,
  type EllieMode as PlanMode,
  type ProposalMessage,
  type RoutineCardStatus,
} from '@app/features/ellie/chatModel';
import { discomfortMessage } from '@app/features/ellie/discomfortModel';
import { ROUTINE_ADJUST_PREFIX } from '@app/features/ellie/routineProposalModel';
import { ellieErrorLine, failureEffect, type EllieLanguage } from '@app/features/ellie/ellieCopy';
import {
  ellieRoutineInput,
  historyToMessages,
  parseTool,
  proposalToMessage,
} from '@app/features/ellie/resultParsing';
import { useAuth } from '@app/hooks/useAuth';
import {
  cacheEllieUsage,
  ellieKeys,
  invalidateEllieConversations,
  useEllieLatest,
  useEllieMessages,
  useEllieUsage,
} from '@app/hooks/useEllieConversations';
import { createUuid } from '@app/lib/uuid';
import { saveEllieNutritionPlan } from '@app/services/supabase/ellie-actions';
import { invalidateNutritionPlanQueries } from '@app/lib/queryInvalidation';
import { invalidateRoutineLists, routineKeys } from '@app/hooks/useRoutines';
import { routinesService } from '@app/services/routines/routinesService';
import {
  EllieError,
  EllieStreamError,
  sendEllieMessage,
  streamEllieMessage,
  type DiscomfortAnswer,
  type EllieMode,
  type EllieReply,
  type EllieSendInput,
} from '@app/services/ellie/ellieService';
import {
  discardProposal as discardStoredProposal,
  editsPayload,
  getProposal,
  ProposalError,
  saveRoutineProposal,
  startRoutineProposal,
  storedCards,
  type ProposalErrorCode,
  type ProposalStatus,
  type RoutineEdits,
} from '@app/services/ellie/ellieProposals';

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

type SendExtras = { adjustProposalId?: string | null; discomfortAnswer?: DiscomfortAnswer | null };

// An adjustment replaces the card it was asked from.
const parentOf = (card: ProposalMessage, extra: SendExtras | undefined) =>
  card.kind === 'routineProposal' && card.version > 1 && extra?.adjustProposalId
    ? proposalMessageId(extra.adjustProposalId)
    : null;

export type ProposalActionResult =
  | { ok: true; routineId?: string | null; workoutId?: string | null; sessionId?: string | null }
  | { ok: false; code: ProposalErrorCode };

// get_proposal's status as the state of the card.
function cardStatus(status: ProposalStatus): RoutineCardStatus {
  switch (status) {
    case 'open':
      return 'open';
    case 'saved':
      return 'saved';
    case 'started':
      return 'started';
    case 'discarded':
      return 'discarded';
    default:
      return 'replaced';
  }
}

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
  // What else each message carries (the adjusted proposal, a discomfort
  // answer): a retry sends it again.
  const extras = useRef<Record<string, SendExtras | undefined>>({});
  // The card whose Ajustar left the prefix in the composer.
  const adjustTarget = useRef<string | null>(null);

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
      // A streamed answer does not carry the usage: read it again.
      if (!reply.usage) {
        queryClient.invalidateQueries({ queryKey: ellieKeys.usage(userId) }).catch(() => undefined);
      }
      invalidateEllieConversations(queryClient, userId);
    },
    [queryClient, userId],
  );

  // A JSON reply (no stream, or the server chose not to stream): its text or
  // legacy tool, then its cards.
  const paintReply = useCallback((id: string, reply: EllieReply, extra?: SendExtras) => {
    const parsed = reply.message.tool
      ? parseTool(reply.message.tool, reply.message.id, reply.message.content)
      : null;
    if (parsed) {
      dispatch({ type: 'tool', id: `assistant-${id}`, intro: parsed.intro, card: parsed.card });
    } else if (reply.message.content) {
      dispatch({ type: 'delta', id: reply.message.id || `assistant-${id}`, delta: reply.message.content });
    }
    // A replayed answer may carry its card only as tool_data.proposal_id.
    const cards =
      reply.cards.length > 0 || !reply.message.tool
        ? reply.cards
        : storedCards(reply.message.tool.type, reply.message.tool.data);
    cards.forEach(card => {
      const message = proposalToMessage(card, reply.message.id || `assistant-${id}`);
      if (message) {
        dispatch({ type: 'proposal', card: message, parentId: parentOf(message, extra) });
      }
    });
  }, []);

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
      const input: EllieSendInput = {
        conversationId: conversationRef.current,
        // Same id on every retry (and on the fallback without stream): the
        // server returns the stored answer (replayed) instead of answering
        // and charging twice.
        clientMessageId: id,
        message: text,
        mode,
        imagePath: images.current[id] ?? null,
        clientContext,
        adjustProposalId: extras.current[id]?.adjustProposalId ?? null,
        discomfortAnswer: extras.current[id]?.discomfortAnswer ?? null,
      };
      const extra = extras.current[id];
      const assistantId = `assistant-${id}`;
      // What the stream painted, removed if it has to be asked again.
      const painted = new Set<string>();
      try {
        let reply: EllieReply;
        try {
          const streamed = await streamEllieMessage(input, {
            onDelta: delta => {
              painted.add(assistantId);
              dispatch({ type: 'delta', id: assistantId, delta });
            },
            onCard: card => {
              const message = proposalToMessage(card, assistantId);
              if (message) {
                painted.add(message.id);
                dispatch({ type: 'proposal', card: message, parentId: parentOf(message, extra) });
              }
            },
          });
          reply = streamed;
          if (!streamed.streamed) {
            paintReply(id, reply, extra);
          }
        } catch (error) {
          if (!(error instanceof EllieStreamError) || !error.fallback) {
            throw error instanceof EllieStreamError ? error.failure : error;
          }
          console.warn('[ellie] Stream falló; se pide sin stream.', error.failure.code);
          if (painted.size > 0) {
            dispatch({ type: 'discard', ids: [...painted] });
          }
          reply = await sendEllieMessage(input);
          paintReply(id, reply, extra);
        }
        afterReply(reply);
        dispatch({ type: 'done' });
      } catch (error) {
        fail(id, error);
      }
    },
    [afterReply, clientContext, fail, paintReply],
  );

  const send = useCallback(
    (
      text: string,
      mode?: PlanMode,
      image?: { uri: string; path: string } | null,
      extra?: SendExtras,
    ): boolean => {
      const trimmed = text.trim() || (image ? PHOTO_TEXT[language] : '');
      if (!trimmed || stateRef.current.thinking || !userId) {
        return false;
      }
      setDraft('');
      const id = createUuid();
      if (image) {
        images.current[id] = image.path;
      }
      // "Ajusta la rutina: …" after Ajustar adjusts that card.
      const target =
        adjustTarget.current && trimmed.startsWith(ROUTINE_ADJUST_PREFIX.trim()) ? adjustTarget.current : null;
      adjustTarget.current = null;
      const adjustProposalId = extra?.adjustProposalId ?? target;
      if (adjustProposalId || extra?.discomfortAnswer) {
        extras.current[id] = { adjustProposalId, discomfortAnswer: extra?.discomfortAnswer ?? null };
      }
      run(id, trimmed, mode, false, image ?? null).catch(() => undefined);
      return true;
    },
    [language, run, userId],
  );

  // Ajustar: the prefix in the composer; what is sent adjusts that card.
  const adjustDraft = useCallback((proposalId: string) => {
    adjustTarget.current = proposalId;
    setDraft(ROUTINE_ADJUST_PREFIX);
  }, []);

  // A chip of a discomfort_check card ("Tengo otra molestia" with its zone).
  const answerDiscomfort = useCallback(
    (id: string, chip: string, otherZone?: string) => {
      const card = stateRef.current.messages.find(item => item.id === id);
      if (!card || card.kind !== 'discomfortCheck' || card.answer) {
        return;
      }
      const answer = discomfortMessage(chip, card.zones, otherZone);
      if (!answer) {
        // A chip the app does not know: sent as text.
        send(chip);
        return;
      }
      const { other, ...discomfortAnswer } = answer.reply;
      if (send(answer.text, undefined, null, { discomfortAnswer })) {
        dispatch({ type: 'discomfortAnswered', id, answer: { ...discomfortAnswer, other } });
      }
    },
    [send],
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
    (id: string, stage: 'active' | 'saved' | 'error' | 'proposed', workoutId?: string) =>
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

  // save_user_routine with origin ellie: the message that carries the plan
  // and its exercises (tool_data.exercises). One message = one routine: saving
  // it again answers the same one (replayed) and nothing is duplicated.
  const saveRoutine = useCallback(
    async (id: string): Promise<{ routineId: string; replayed: boolean } | null> => {
      const card = stateRef.current.messages.find(item => item.id === id);
      if (!card || card.kind !== 'workout' || !userId) {
        return null;
      }
      dispatch({ type: 'stage', id, stage: 'saving' });
      try {
        const { routine, replayed } = await routinesService.saveRoutine(
          ellieRoutineInput(card.workout),
          { origin: 'ellie', chatMessageId: card.messageId ?? card.id },
        );
        settle(id, 'saved', routine.id);
        queryClient.setQueryData(routineKeys.detail(routine.id), routine);
        await Promise.allSettled([
          invalidateRoutineLists(queryClient),
          queryClient.invalidateQueries({ queryKey: ['ellie', 'overview', userId] }),
          queryClient.invalidateQueries({ queryKey: ['home', 'overview', userId] }),
        ]);
        return { routineId: routine.id, replayed };
      } catch (error) {
        console.warn('[ellie] No se pudo guardar la rutina.', error);
        settle(id, 'error');
        return null;
      }
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
        // The card keeps its place (id); the plan is the new message's.
        const parsed = reply.message.tool
          ? parseTool(reply.message.tool, id, reply.message.content)
          : null;
        if (parsed?.card.kind === 'workout' && reply.message.id) {
          parsed.card.messageId = reply.message.id;
        }
        if (parsed && parsed.card.kind !== 'meal') {
          dispatch({ type: 'replace', id, card: parsed.card, intro: parsed.intro });
        } else if (reply.cards.length > 0 || typeof reply.message.tool?.data.proposal_id === 'string') {
          // cards_v2 answers with a proposal instead of the old plan.
          settle(id, 'proposed');
          paintReply(id, reply);
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
    [afterReply, clientContext, language, onUnauthorized, paintReply, settle],
  );

  // Cards of the history carry only their proposal_id: read each once.
  const requested = useRef(new Set<string>());
  useEffect(() => {
    state.messages.forEach(message => {
      if (
        message.kind !== 'routineProposal' ||
        message.status !== 'loading' ||
        requested.current.has(message.id)
      ) {
        return;
      }
      requested.current.add(message.id);
      getProposal(message.proposalId)
        .then(stored =>
          dispatch({
            type: 'proposalLoaded',
            id: message.id,
            proposal: stored?.routine ?? null,
            status: stored?.routine ? cardStatus(stored.status) : 'unavailable',
          }),
        )
        .catch(error => {
          console.warn('[ellie] No se pudo leer la propuesta.', error);
          requested.current.delete(message.id);
          dispatch({ type: 'proposalLoaded', id: message.id, proposal: null, status: 'unavailable' });
        });
    });
  }, [state.messages]);

  const reloadProposal = useCallback((id: string) => {
    requested.current.delete(id);
    dispatch({ type: 'proposalStatus', id, status: 'loading' });
  }, []);

  // One client_id per action, proposal and edits: a retry of the same thing
  // is answered with the same result and never creates it twice.
  const clientIds = useRef<Record<string, string>>({});
  const clientIdFor = (action: string, proposalId: string, edits: RoutineEdits) => {
    const key = `${action}:${proposalId}:${JSON.stringify(editsPayload(edits))}`;
    clientIds.current[key] = clientIds.current[key] ?? createUuid();
    return clientIds.current[key];
  };

  const proposalFailure = useCallback(
    (id: string, error: unknown, previous: RoutineCardStatus): ProposalActionResult => {
      const code = error instanceof ProposalError ? error.code : 'unknown';
      console.warn('[ellie] Acción de propuesta fallida.', code);
      // Replaced, saved or active elsewhere: the card has no actions anymore.
      dispatch({ type: 'proposalStatus', id, status: code === 'proposal_not_open' ? 'replaced' : previous });
      if (code === 'unauthorized') {
        onUnauthorized?.();
      }
      return { ok: false, code };
    },
    [onUnauthorized],
  );

  const refreshAfterRoutine = useCallback(
    () =>
      Promise.allSettled([
        invalidateRoutineLists(queryClient),
        queryClient.invalidateQueries({ queryKey: ['ellie', 'overview', userId] }),
        queryClient.invalidateQueries({ queryKey: ['home', 'overview', userId] }),
      ]),
    [queryClient, userId],
  );

  // Guardar (card: no edits) · Guardar en mis rutinas (sheet: its edits).
  const saveProposal = useCallback(
    async (id: string, edits: RoutineEdits): Promise<ProposalActionResult> => {
      const card = stateRef.current.messages.find(item => item.id === id);
      if (!card || card.kind !== 'routineProposal' || card.status !== 'open') {
        return { ok: false, code: 'proposal_not_open' };
      }
      dispatch({ type: 'proposalStatus', id, status: 'saving' });
      try {
        const { routineId } = await saveRoutineProposal(
          card.proposalId,
          edits,
          clientIdFor('save', card.proposalId, edits),
        );
        dispatch({ type: 'proposalStatus', id, status: 'saved' });
        await refreshAfterRoutine();
        return { ok: true, routineId };
      } catch (error) {
        return proposalFailure(id, error, 'open');
      }
    },
    [proposalFailure, refreshAfterRoutine],
  );

  // Empezar ahora: a session with the sheet's version, not saved in Mis
  // rutinas. workout.id is the hidden template the session runs.
  const startProposal = useCallback(
    async (id: string, edits: RoutineEdits): Promise<ProposalActionResult> => {
      const card = stateRef.current.messages.find(item => item.id === id);
      if (!card || card.kind !== 'routineProposal' || card.status !== 'open') {
        return { ok: false, code: 'proposal_not_open' };
      }
      try {
        const { workoutId, sessionId } = await startRoutineProposal(
          card.proposalId,
          edits,
          clientIdFor('start', card.proposalId, edits),
        );
        if (!workoutId) {
          return { ok: false, code: 'unknown' };
        }
        dispatch({ type: 'proposalStatus', id, status: 'started' });
        return { ok: true, workoutId, sessionId };
      } catch (error) {
        return proposalFailure(id, error, 'open');
      }
    },
    [proposalFailure],
  );

  // Descartar (sheet): discard_proposal; the card stays as Descartada.
  const discardProposal = useCallback(
    async (id: string): Promise<ProposalActionResult> => {
      const card = stateRef.current.messages.find(item => item.id === id);
      if (!card || card.kind !== 'routineProposal' || card.status !== 'open') {
        return { ok: false, code: 'proposal_not_open' };
      }
      try {
        await discardStoredProposal(card.proposalId);
        dispatch({ type: 'proposalStatus', id, status: 'discarded' });
        return { ok: true };
      } catch (error) {
        return proposalFailure(id, error, 'open');
      }
    },
    [proposalFailure],
  );

  // A new conversation: the server creates it with the first message.
  const newConversation = useCallback(() => {
    conversationRef.current = null;
    loadedFor.current = null;
    setLocalOnly(false);
    setAdopted(null);
    adjustTarget.current = null;
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
      adjustTarget.current = null;
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
    adjustDraft,
    answerDiscomfort,
    retry,
    activatePlan,
    saveRoutine,
    anotherVersion,
    saveProposal,
    startProposal,
    discardProposal,
    reloadProposal,
    newConversation,
    openConversation,
  };
}
