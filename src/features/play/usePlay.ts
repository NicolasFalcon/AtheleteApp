import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { nextBackoffMs } from '@app/features/session/sessionOutbox';
import {
  enqueueRound,
  flushPlayQueue,
  isRetryable,
  onQueuedOutcome,
  sendRound,
  type QueuedRound,
} from '@app/features/play/playQueue';
import { useAuth } from '@app/hooks/useAuth';
import { invalidatePlayQueries } from '@app/lib/queryInvalidation';
import { playSound } from '@app/features/sound/soundService';
import {
  createClientRoundId,
  fetchPlayHome,
  PlayError,
  startPlayRound,
  type PlayHome,
  type PlayResult,
  type PlayRound,
  type PlayRoute,
} from '@app/services/supabase/play';

// get_play_home: Play's portada, the level start and Inicio's Play card and
// streak (the same value everywhere). Invalidated when a round is saved.
export function usePlayHome() {
  const { profile } = useAuth();
  const userId = profile?.id;
  return useQuery<PlayHome, PlayError>({
    queryKey: ['play-home', userId],
    enabled: Boolean(userId),
    staleTime: 30_000,
    queryFn: fetchPlayHome,
  });
}

// Silent replay of the rounds finished offline: when the app starts with a
// session, when it comes back to the foreground and on a backoff timer while
// the network keeps failing (NetInfo is not installed; same approach as the
// session outbox).
export function usePlayQueueSync(): void {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) {
      return undefined;
    }
    let cancelled = false;
    let failures = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const sync = async () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      const run = await flushPlayQueue(userId).catch(() => ({ sent: 0, stoppedByNetwork: true }));
      if (cancelled) {
        return;
      }
      if (run.sent > 0) {
        invalidatePlayQueries(queryClient, userId).catch(() => {});
      }
      if (run.stoppedByNetwork) {
        failures += 1;
        timer = setTimeout(sync, nextBackoffMs(failures));
      } else {
        failures = 0;
      }
    };

    sync();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        failures = 0;
        sync();
      }
    });
    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
      subscription.remove();
    };
  }, [queryClient, userId]);
}

export type SubmitState =
  | { status: 'saving' }
  | { status: 'saved'; result: PlayResult }
  // Kept in the queue until the connection is back.
  | { status: 'queued' }
  | { status: 'error'; error: PlayError };

// Resultado: the round goes to the persistent queue first and is sent at
// once. Without connection it stays queued ("Guardaremos tu resultado al
// reconectar") and the screen switches to the server's answer if the queue
// gets through while it is still open. Sending twice is safe (idempotent).
export function useSubmitRound(item: QueuedRound) {
  const { profile } = useAuth();
  const userId = profile?.id;
  const queryClient = useQueryClient();
  const [state, setState] = useState<SubmitState>({ status: 'saving' });
  const itemRef = useRef(item);

  const send = useCallback(async () => {
    if (!userId) {
      setState({ status: 'error', error: new PlayError('unauthorized') });
      return;
    }
    setState({ status: 'saving' });
    try {
      await enqueueRound(userId, itemRef.current);
    } catch {
      // Storage failed: still try to send it.
    }
    try {
      const result = await sendRound(userId, itemRef.current);
      setState({ status: 'saved', result });
      invalidatePlayQueries(queryClient, userId).catch(() => {});
    } catch (error) {
      const failure = error instanceof PlayError ? error : new PlayError('unknown', String(error));
      setState(isRetryable(failure) ? { status: 'queued' } : { status: 'error', error: failure });
    }
  }, [queryClient, userId]);

  // Once on arrival; "Reintentar" goes through the queue.
  const started = useRef(false);
  useEffect(() => {
    if (!started.current && userId) {
      started.current = true;
      send();
    }
  }, [send, userId]);

  // The global replay may deliver it while this screen is open.
  useEffect(
    () =>
      onQueuedOutcome((roundId, outcome) => {
        if (roundId !== itemRef.current.roundId) {
          return;
        }
        setState(current =>
          current.status === 'saved'
            ? current
            : 'result' in outcome
            ? { status: 'saved', result: outcome.result }
            : { status: 'error', error: outcome.error },
        );
      }),
    [],
  );

  const retry = useCallback(() => {
    if (state.status === 'queued' && userId) {
      setState({ status: 'saving' });
      flushPlayQueue(userId)
        .then(run => {
          if (run.stoppedByNetwork) {
            setState(current => (current.status === 'saved' ? current : { status: 'queued' }));
          } else {
            invalidatePlayQueries(queryClient, userId).catch(() => {});
          }
        })
        .catch(() => setState({ status: 'queued' }));
    }
  }, [queryClient, state.status, userId]);

  return { state, retry };
}

const START_ERRORS: Partial<Record<PlayError['code'], string>> = {
  level_locked: 'Este nivel todavía está bloqueado.',
  not_enough_questions: 'Nivel en preparación. Vuelve pronto.',
  offline: 'Conéctate para jugar.',
};

// start_play_round for "Empezar" and "Otra ronda". The client round id stays
// the same for every retry of a failed start (the server returns the same
// round) and is renewed once a round has been handed out. If today's
// challenge changed meanwhile, the level is played without the bonus.
export function useStartRound() {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientRoundId = useRef(createClientRoundId());

  const start = useCallback(
    async (target: { route: PlayRoute; level: number; isDaily: boolean }): Promise<PlayRound | null> => {
      setStarting(true);
      setError(null);
      const ask = (isDaily: boolean) =>
        startPlayRound({ ...target, isDaily, clientRoundId: clientRoundId.current });
      try {
        let round: PlayRound;
        try {
          round = await ask(target.isDaily);
        } catch (failure) {
          if (failure instanceof PlayError && failure.code === 'not_daily_challenge') {
            clientRoundId.current = createClientRoundId();
            round = await ask(false);
          } else {
            throw failure;
          }
        }
        clientRoundId.current = createClientRoundId();
        return round;
      } catch (failure) {
        const code = failure instanceof PlayError ? failure.code : 'unknown';
        if (code === 'level_locked') {
          playSound('play-locked');
        }
        setError(START_ERRORS[code] ?? 'No pudimos empezar la ronda. Inténtalo de nuevo.');
        return null;
      } finally {
        setStarting(false);
      }
    },
    [],
  );

  return { start, starting, error };
}
