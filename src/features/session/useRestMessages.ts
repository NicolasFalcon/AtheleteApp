import { useCallback, useEffect, useRef, useState } from 'react';
import {
  EMPTY_HISTORY,
  markShown,
  pickRestMessage,
  trendNote,
  type BodyZone,
  type DiscomfortTrend,
  type Effort,
  type RestMessageContext,
  type RestMessageHistory,
} from '@app/features/session/restMessages';
import { enqueueFeedback, feedbackClientId } from '@app/features/session/feedbackQueue';
import type { RestMessage } from '@app/features/session/v2/RestMessageCard';
import type { SessionRunner } from '@app/features/session/useSessionRunner';
import { useHydration } from '@app/hooks/useHydration';
import type { SessionMessagesMode } from '@app/lib/feedbackPrefs';
import { detectSessionPRs } from '@app/services/supabase/session';

// The marks are read only if the server answers fast: the message shows when
// the rest starts, not halfway through it.
const RECORD_WAIT_MS = 1500;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise.catch(() => null),
    new Promise<null>(resolve => setTimeout(() => resolve(null), ms)),
  ]);
}

// Modo foco · mensajes de ELLIE en el descanso (§28.13). When a rest starts
// it asks the rules (restMessages) which message to show, with the session's
// state: the new mark (detect_session_prs, read only), the zone told earlier,
// the exercise just worked and how far the plan is. Answers go to the
// feedback queue (sfb-1) with their client id; "+1 vaso" is the hydration
// action of the app. The card closes when the rest ends or the session is
// paused.
export function useRestMessages({
  runner,
  sessionId,
  userId,
  mode,
}: {
  runner: SessionRunner;
  sessionId: string | null;
  userId: string | undefined;
  mode: SessionMessagesMode;
}) {
  const { addGlass } = useHydration();
  const [message, setMessage] = useState<RestMessage | null>(null);
  const history = useRef<RestMessageHistory>(EMPTY_HISTORY);
  const restIndex = useRef(-1);
  const zone = useRef<BodyZone | null>(null);
  // The exercise the shown message is about.
  const subject = useRef<string | null>(null);
  const resting = Boolean(runner.rest && runner.rest.phase !== 'go');
  const wasResting = useRef(false);
  const latest = useRef({ runner, mode, sessionId });
  latest.current = { runner, mode, sessionId };

  useEffect(() => {
    const started = resting && !wasResting.current;
    wasResting.current = resting;
    if (!resting) {
      setMessage(null);
      return;
    }
    if (!started || !latest.current.sessionId) {
      return;
    }
    restIndex.current += 1;
    const index = restIndex.current;
    let cancelled = false;

    (async () => {
      const { runner: now, mode: currentMode, sessionId: currentSession } = latest.current;
      const lastSet = now.sets[now.sets.length - 1];
      const worked = lastSet ? now.plan[lastSet.position] ?? null : null;
      const base: Omit<RestMessageContext, 'record'> = {
        mode: currentMode,
        restSec: now.rest?.totalSec ?? 0,
        restIndex: index,
        restKind: now.rest?.kind ?? 'exercise',
        doneCount: now.doneCount,
        total: now.plan.length,
        discomfortZone: zone.current,
        checkInExercise: worked ? { id: worked.exerciseId, name: worked.name } : null,
      };
      // Ask the server for marks only when a record could still be shown.
      const wantsRecord =
        pickRestMessage({ ...base, record: { exerciseName: '', weightKg: null } }, history.current) === 'record';
      let record: RestMessageContext['record'] = null;
      if (wantsRecord && currentSession) {
        const marks = await withTimeout(detectSessionPRs(currentSession), RECORD_WAIT_MS);
        const mark = marks?.find(item => item.valueWeight !== null) ?? marks?.[0];
        const exercise = mark ? now.plan.find(item => item.exerciseId === mark.exerciseId) : null;
        if (mark && exercise) {
          record = { exerciseName: exercise.name, weightKg: mark.valueWeight };
        }
      }
      if (cancelled) {
        return;
      }
      const kind = pickRestMessage({ ...base, record }, history.current);
      if (!kind) {
        return;
      }
      history.current = markShown(history.current, kind, index);
      subject.current = worked?.exerciseId ?? null;
      switch (kind) {
        case 'record':
          setMessage({ kind, exerciseName: record?.exerciseName ?? '', weightKg: record?.weightKg ?? null });
          break;
        case 'discomfortFollowUp':
          setMessage({ kind, zone: zone.current ?? 'otra' });
          break;
        case 'checkIn':
          setMessage({ kind, exerciseName: worked?.name ?? 'el ejercicio' });
          break;
        default:
          setMessage({ kind });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [resting]);

  // Pausing closes it.
  useEffect(() => {
    if (runner.paused) {
      setMessage(null);
    }
  }, [runner.paused]);

  const queue = useCallback(
    (write: Parameters<typeof enqueueFeedback>[1]) => {
      if (userId) {
        enqueueFeedback(userId, write).catch(() => undefined);
      }
    },
    [userId],
  );

  const onEffort = useCallback(
    (effort: Effort) => {
      if (!sessionId) {
        return;
      }
      queue({
        type: 'feedback',
        queuedAt: new Date().toISOString(),
        write: { clientId: feedbackClientId(), sessionId, exerciseId: subject.current, kind: 'effort', effort },
      });
    },
    [queue, sessionId],
  );

  const onDiscomfort = useCallback(
    (bodyZone: BodyZone, note: string | null) => {
      zone.current = bodyZone;
      if (!sessionId) {
        return;
      }
      queue({
        type: 'feedback',
        queuedAt: new Date().toISOString(),
        write: { clientId: feedbackClientId(), sessionId, exerciseId: subject.current, kind: 'discomfort', bodyZone, note },
      });
    },
    [queue, sessionId],
  );

  const onTrend = useCallback(
    (trend: DiscomfortTrend) => {
      if (!sessionId || !zone.current) {
        return;
      }
      queue({
        type: 'feedback',
        queuedAt: new Date().toISOString(),
        write: {
          clientId: feedbackClientId(),
          sessionId,
          exerciseId: subject.current,
          kind: 'discomfort',
          bodyZone: zone.current,
          note: trendNote(trend),
        },
      });
    },
    [queue, sessionId],
  );

  const onWater = useCallback(() => {
    const added = addGlass();
    return added?.glasses != null && added.goal != null
      ? `Sumado · ${added.glasses} de ${added.goal}`
      : 'Sumado a Hidratación';
  }, [addGlass]);

  const close = useCallback(() => setMessage(null), []);

  return { message, onEffort, onDiscomfort, onTrend, onWater, close };
}
