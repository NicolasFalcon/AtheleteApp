import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { haptics } from '@app/components/v2';
import {
  activeSeconds,
  addRestTime,
  buildPlan,
  completedExerciseCount,
  completedExerciseIds,
  currentCursor,
  freezeRest,
  isExerciseDone,
  pauseClock,
  pausedForSeconds,
  restAfter,
  restPhase,
  restRemainingMs,
  resumeClock,
  startRest,
  suggestedSet,
  thawRest,
  withSet,
  YOUR_TURN_MS,
  type ClockState,
  type Cursor,
  type LoggedSet,
  type PlannedExercise,
  type RestState,
} from '@app/features/session/sessionModel';
import {
  completeSession,
  discardSession,
  enqueueSessionWrite,
  ensureSessionExercises,
  fetchLastWeights,
  fetchSessionDetail,
  flushSessionOutbox,
  markSessionExercise,
  reopenSession,
  saveSessionForLater,
  recordSessionActivity,
  setSessionPaused,
  syncCompletedExercises,
  upsertSessionSet,
  type CompletionPayload,
  type CompletionResult,
  type SaveForLaterParams,
  type SetWrite,
} from '@app/services/supabase/session';
import type { Workout } from '@app/shared';

// Development only (__DEV__): opens the session in a given state with the
// routine's real plan and nothing written (athelete://dev/session).
export type DevSessionState =
  | 'active'
  | 'paused'
  | 'pausedExit'
  | 'restExercise'
  | 'restSet'
  | 'restEnd'
  | 'menu'
  | 'exit'
  | 'error'
  | 'allDone';

export type SessionDraft = { reps: number | null; weightKg: number | null };

type Params = {
  workout: Workout | null;
  sessionId: string | null;
  userId?: string;
  dev?: DevSessionState | null;
  onCompleted: (result: CompletionResult) => void;
  onLeave: () => void;
};

type LoadState = 'loading' | 'ready' | 'error';

function devSetup(
  dev: DevSessionState,
  plan: PlannedExercise[],
  now: number,
): { sets: LoggedSet[]; clock: ClockState; rest: RestState | null } {
  const full = (exercise: PlannedExercise | undefined) =>
    exercise
      ? Array.from({ length: exercise.sets }, (_, setIndex) => ({
          position: exercise.position,
          setIndex,
          reps: exercise.reps,
          weightKg: 16,
          durationSec: exercise.durationSec,
        }))
      : [];
  const clock: ClockState = { startedAt: now - 1000, pausedTotalSec: 0, pausedAt: null };
  switch (dev) {
    case 'paused':
    case 'pausedExit':
      return {
        sets: [...full(plan[0]), ...full(plan[1])],
        clock: { startedAt: now - (12 * 60 + 34 + 73) * 1000, pausedTotalSec: 0, pausedAt: now - 73_000 },
        rest: null,
      };
    case 'restExercise':
      return {
        sets: full(plan[0]),
        clock,
        rest: startRest('exercise', plan[0]?.restSec ?? 45, now),
      };
    case 'restSet':
      return {
        sets: [...full(plan[0]), ...full(plan[1]).slice(0, 1)],
        clock,
        rest: startRest('set', plan[1]?.restSec ?? 60, now),
      };
    case 'allDone':
      return { sets: plan.flatMap(exercise => full(exercise)), clock, rest: null };
    default:
      return { sets: [], clock, rest: null };
  }
}

export function useSessionRunner({
  workout,
  sessionId,
  userId,
  dev = null,
  onCompleted,
  onLeave,
}: Params) {
  const dryRun = Boolean(dev);
  const plan = useMemo(() => buildPlan(workout?.exercises ?? []), [workout]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [sets, setSets] = useState<LoggedSet[]>([]);
  const [clock, setClock] = useState<ClockState | null>(null);
  const [rest, setRest] = useState<RestState | null>(null);
  const [yourTurnUntil, setYourTurnUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [draft, setDraft] = useState<SessionDraft>({ reps: null, weightKg: null });
  const [lastWeights, setLastWeights] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<null | 'save' | 'finish' | 'discard'>(null);
  // STATE_09: the workout could not be saved (finishing or saving for later).
  const [saveError, setSaveError] = useState<CompletionPayload | null>(null);
  const [saveErrorKind, setSaveErrorKind] = useState<'finish' | 'save'>(
    'finish',
  );
  const pendingWrites = useRef<Promise<unknown>[]>([]);
  const draftKey = useRef<string | null>(null);

  // ── Load (or the dev state) ───────────────────────────────────────────────
  useEffect(() => {
    if (!workout) {
      return;
    }
    if (dev) {
      const setup = devSetup(dev, plan, Date.now());
      setSets(setup.sets);
      setClock(setup.clock);
      setRest(setup.rest);
      setYourTurnUntil(dev === 'restEnd' ? Date.now() + 60 * 60 * 1000 : null);
      if (dev === 'error') {
        setSaveError({
          sessionId: 'dev',
          workoutId: workout.id,
          workoutTitle: workout.title,
          activeSec: workout.duration * 60,
          pausedTotalSec: 0,
          caloriesBurned: workout.calories,
          completedExercises: plan.map(exercise => String(exercise.position)),
          endedAt: new Date().toISOString(),
        });
      }
      setLoadState('ready');
      return;
    }
    if (!sessionId) {
      return;
    }
    let cancelled = false;
    setLoadState('loading');
    (async () => {
      try {
        if (userId) {
          await flushSessionOutbox(userId).catch(() => []);
        }
        let detail = await fetchSessionDetail(sessionId);
        if (detail.session.status === 'completed') {
          if (!cancelled) {
            onCompleted({ session: detail.session, volumeKg: detail.volumeKg, award: null });
          }
          return;
        }
        if (detail.session.status !== 'in_progress') {
          detail = await reopenSession(sessionId, detail.clock);
        }
        if (cancelled) {
          return;
        }
        setSets(detail.sets);
        setClock(detail.clock);
        setLoadState('ready');
        ensureSessionExercises(sessionId, plan).catch(error =>
          console.warn('[session] Ejercicios planificados sin guardar.', error),
        );
        const ids = plan
          .map(exercise => exercise.exerciseId)
          .filter((id): id is string => Boolean(id));
        if (userId && ids.length > 0) {
          fetchLastWeights(userId, ids)
            .then(result => !cancelled && setLastWeights(result))
            .catch(() => {});
        }
      } catch (error) {
        console.warn('[session] No se pudo cargar la sesión.', error);
        if (!cancelled) {
          setLoadState('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // onCompleted is a navigation callback; the load runs once per session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dev, loadAttempt, plan, sessionId, userId, workout]);

  // ── Ticker: 4 Hz while a countdown is on screen, 1 Hz otherwise ───────────
  const fast = Boolean(rest || yourTurnUntil);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), fast ? 250 : 1000);
    return () => clearInterval(id);
  }, [fast]);

  const paused = Boolean(clock?.pausedAt);
  const remainingMs = rest ? restRemainingMs(rest, now) : 0;

  // Rest reached zero → "Tu turno" for 1.5 s, then the active card.
  useEffect(() => {
    if (rest && !paused && remainingMs <= 0 && !dryRun) {
      haptics.success();
      setRest(null);
      setYourTurnUntil(Date.now() + YOUR_TURN_MS);
    }
  }, [dryRun, paused, remainingMs, rest]);

  useEffect(() => {
    if (yourTurnUntil && now >= yourTurnUntil) {
      setYourTurnUntil(null);
    }
  }, [now, yourTurnUntil]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const cursor: Cursor | null = currentCursor(plan, sets);
  const current = cursor ? plan[cursor.position] ?? null : null;

  // Proposed values when the cursor moves to a new set.
  useEffect(() => {
    const key = cursor ? `${cursor.position}:${cursor.setIndex}` : null;
    if (!current || key === draftKey.current) {
      return;
    }
    draftKey.current = key;
    setDraft(
      suggestedSet(
        current,
        sets,
        current.exerciseId ? lastWeights[current.exerciseId] : null,
      ),
    );
  }, [current, cursor, lastWeights, sets]);

  const elapsedSec = clock ? activeSeconds(clock, now) : 0;

  // ── Writes ────────────────────────────────────────────────────────────────
  const track = (promise: Promise<unknown>) => {
    pendingWrites.current.push(promise);
    promise.finally(() => {
      pendingWrites.current = pendingWrites.current.filter(item => item !== promise);
    });
  };

  const writeSet = (next: LoggedSet, exercise: PlannedExercise, setsAfter: LoggedSet[]) => {
    if (dryRun || !sessionId || !userId) {
      return;
    }
    const write: SetWrite = {
      sessionId,
      userId,
      exerciseId: exercise.exerciseId,
      set: next,
      restTakenSec: null,
      completedAt: new Date().toISOString(),
    };
    track(
      upsertSessionSet(write)
        .then(id =>
          setSets(currentSets =>
            withSet(currentSets, { ...next, id }),
          ),
        )
        .catch(() => enqueueSessionWrite(userId, { kind: 'set', write })),
    );
    // Last recorded activity: Inicio counts a running session up to here.
    if (clock) {
      track(
        recordSessionActivity(sessionId, activeSeconds(clock, Date.now())).catch(
          error => console.warn('[session] Actividad sin registrar.', error),
        ),
      );
    }
    if (isExerciseDone(exercise, setsAfter)) {
      track(
        Promise.all([
          markSessionExercise(sessionId, exercise.position, true),
          syncCompletedExercises(sessionId, plan, setsAfter),
        ]).catch(error =>
          console.warn('[session] Progreso del ejercicio sin sincronizar.', error),
        ),
      );
    }
  };

  const logSet = useCallback(() => {
    if (!cursor || !current || paused) {
      return;
    }
    const next: LoggedSet = {
      position: cursor.position,
      setIndex: cursor.setIndex,
      reps: current.durationSec ? null : draft.reps,
      weightKg: draft.weightKg,
      durationSec: current.durationSec,
    };
    const setsAfter = withSet(sets, next);
    haptics.light();
    setSets(setsAfter);
    writeSet(next, current, setsAfter);
    const after = restAfter(plan, setsAfter, cursor);
    if (after) {
      setRest(startRest(after.kind, after.restSec, Date.now()));
    }
    // writeSet only depends on stable values of this render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, cursor, draft, paused, plan, sets]);

  const pause = useCallback(() => {
    if (!clock || clock.pausedAt) {
      return;
    }
    const at = Date.now();
    const next = pauseClock(clock, at);
    setClock(next);
    setRest(currentRest => (currentRest ? freezeRest(currentRest, at) : null));
    if (!dryRun && sessionId) {
      setSessionPaused(sessionId, next, activeSeconds(next, at)).catch(error =>
        console.warn('[session] La pausa no se pudo guardar.', error),
      );
    }
  }, [clock, dryRun, sessionId]);

  const resume = useCallback(() => {
    if (!clock || !clock.pausedAt) {
      return;
    }
    const at = Date.now();
    const next = resumeClock(clock, at);
    setClock(next);
    setRest(currentRest => (currentRest ? thawRest(currentRest, at) : null));
    if (!dryRun && sessionId) {
      // Resuming is activity: the row's minutes are refreshed here.
      setSessionPaused(sessionId, next, activeSeconds(next, at)).catch(error =>
        console.warn('[session] La reanudación no se pudo guardar.', error),
      );
    }
  }, [clock, dryRun, sessionId]);

  const addRest = useCallback(() => {
    haptics.selection();
    setRest(currentRest =>
      currentRest ? addRestTime(currentRest, Date.now()) : null,
    );
  }, []);

  const skipRest = useCallback(() => {
    setRest(null);
    setYourTurnUntil(null);
  }, []);

  const waitForWrites = () => Promise.allSettled([...pendingWrites.current]);

  // Figures shown by STATE_09 and kept for a retry.
  const buildPayload = (closed: ClockState, at: number): CompletionPayload => {
    const done = completedExerciseCount(plan, sets);
    return {
      sessionId: sessionId ?? 'dev',
      workoutId: workout?.id ?? null,
      workoutTitle: workout?.title ?? '',
      activeSec: activeSeconds(closed, at),
      pausedTotalSec: closed.pausedTotalSec,
      caloriesBurned:
        workout && plan.length > 0
          ? Math.round((workout.calories * done) / plan.length)
          : workout?.calories ?? 0,
      completedExercises: completedExerciseIds(plan, sets),
      endedAt: new Date(at).toISOString(),
    };
  };

  const saveParams = (): SaveForLaterParams | null =>
    clock && sessionId
      ? {
          sessionId,
          clock,
          activeSec: activeSeconds(clock, Date.now()),
          plan,
          sets,
        }
      : null;

  // "Guardar para después". A failure is never silent: STATE_09 appears with
  // the figures and "Reintentar ahora" (the clock stays frozen meanwhile).
  const saveForLater = useCallback(async () => {
    if (!clock) {
      return;
    }
    if (dryRun || !sessionId) {
      onLeave();
      return;
    }
    const at = Date.now();
    const frozen = pauseClock(clock, at);
    const params: SaveForLaterParams = {
      sessionId,
      clock: frozen,
      activeSec: activeSeconds(frozen, at),
      plan,
      sets,
    };
    setBusy('save');
    try {
      await waitForWrites();
      await saveSessionForLater(params);
      setSaveError(null);
      onLeave();
    } catch (error) {
      console.warn('[session] No se pudo guardar para después.', error);
      setClock(frozen);
      setSaveErrorKind('save');
      setSaveError(buildPayload(frozen, at));
    } finally {
      setBusy(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clock, dryRun, plan, sessionId, sets, workout]);

  const discard = useCallback(async () => {
    if (dryRun || !sessionId) {
      onLeave();
      return;
    }
    setBusy('discard');
    try {
      await waitForWrites();
      await discardSession(sessionId);
      onLeave();
    } finally {
      setBusy(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dryRun, sessionId]);

  const runCompletion = async (payload: CompletionPayload) => {
    setBusy('finish');
    try {
      if (userId) {
        // Sets that failed before must be on the server first (volume).
        await flushSessionOutbox(userId);
      }
      const result = await completeSession(payload);
      setSaveError(null);
      onCompleted(result);
    } catch (error) {
      console.warn('[session] No se pudo completar la sesión.', error);
      setSaveError(payload);
    } finally {
      setBusy(null);
    }
  };

  const finish = useCallback(async () => {
    if (!clock || !workout) {
      return;
    }
    const at = Date.now();
    const closed = resumeClock(clock, at);
    const payload = buildPayload(closed, at);
    setClock(closed);
    setRest(null);
    setSaveErrorKind('finish');
    if (dryRun || !sessionId) {
      setSaveError(payload);
      return;
    }
    await waitForWrites();
    await runCompletion(payload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clock, dryRun, plan, sessionId, sets, workout]);

  const retrySave = useCallback(async () => {
    if (!saveError || dryRun) {
      return;
    }
    if (saveErrorKind === 'save') {
      await saveForLater();
      return;
    }
    await runCompletion(saveError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dryRun, saveError, saveErrorKind, saveForLater]);

  // "Continuar sin sincronizar": the completion waits in the outbox.
  const continueOffline = useCallback(async () => {
    if (saveError && userId && !dryRun) {
      const params = saveErrorKind === 'save' ? saveParams() : null;
      await enqueueSessionWrite(
        userId,
        params
          ? { kind: 'save', params }
          : { kind: 'complete', payload: saveError },
      );
    }
    onLeave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dryRun, saveError, saveErrorKind, userId]);

  return {
    loadState,
    retryLoad: () => setLoadAttempt(attempt => attempt + 1),
    plan,
    sets,
    cursor,
    current,
    doneCount: completedExerciseCount(plan, sets),
    elapsedSec,
    paused,
    pausedForSec: clock ? pausedForSeconds(clock, now) : 0,
    rest: rest
      ? {
          kind: rest.kind,
          totalSec: rest.totalSec,
          remainingMs,
          phase: restPhase(remainingMs),
        }
      : null,
    yourTurn: Boolean(yourTurnUntil),
    draft,
    setDraft,
    logSet,
    pause,
    resume,
    addRest,
    skipRest,
    saveForLater,
    discard,
    finish,
    saveError,
    saveErrorKind,
    retrySave,
    continueOffline,
    busy,
  };
}

export type SessionRunner = ReturnType<typeof useSessionRunner>;
