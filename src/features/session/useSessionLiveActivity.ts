import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import {
  liveActivityKey,
  liveActivityRestEndState,
  liveActivityState,
  restEndNotification,
  type LiveActivityLanguage,
} from '@app/features/session/liveActivityModel';
import type { SessionRunner } from '@app/features/session/useSessionRunner';
import { notificationsModule } from '@app/features/push/notificationsNative';
import { readPermission } from '@app/features/push/pushRuntime';
import { LOCAL_FLAG } from '@app/features/push/usePushEvents';
import {
  clearLiveSession,
  endAllLiveActivities,
  endLiveActivity,
  hasLiveSession,
  setLiveSession,
  startLiveActivity,
  updateLiveActivity,
  type LiveActivityState,
} from '@app/lib/liveActivity';
import { restCuesAudible } from '@app/lib/restCues';
import { useProfileLanguage } from '@app/hooks/useProfileLanguage';
import type { Workout } from '@app/shared';

export const REST_END_NOTIFICATION_ID = 'athelete-rest-end';
export const REST_END_KIND = 'rest-end';

// The end of the rest as a local notification (only seen with the app in
// the background: usePushEvents hides it in the foreground). Replaced on
// every change of the rest and cancelled when there is none. One sync after
// another, so a cancel never lands before a schedule still in flight.
let notificationChain: Promise<void> = Promise.resolve();
function syncRestNotification(
  state: LiveActivityState | null,
  language: LiveActivityLanguage = 'es',
): Promise<void> {
  const run = notificationChain.then(() => applyRestNotification(state, language)).catch(() => undefined);
  notificationChain = run;
  return run;
}

async function applyRestNotification(
  state: LiveActivityState | null,
  language: LiveActivityLanguage,
): Promise<void> {
  let Notifications: ReturnType<typeof notificationsModule>;
  try {
    Notifications = notificationsModule();
  } catch {
    return;
  }
  await Notifications.cancelScheduledNotificationAsync(REST_END_NOTIFICATION_ID).catch(() => undefined);
  const plan = state ? restEndNotification(state, language) : null;
  if (!plan || plan.fireAt.getTime() <= Date.now() + 1000) {
    return;
  }
  if ((await readPermission()) !== 'granted') {
    return;
  }
  await Notifications.scheduleNotificationAsync({
    identifier: REST_END_NOTIFICATION_ID,
    content: {
      title: plan.title,
      body: plan.body,
      // Silent when the native rest cues sound (rest-go at the same time).
      sound: restCuesAudible() ? false : 'default',
      data: { [LOCAL_FLAG]: true, kind: REST_END_KIND },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: plan.fireAt },
  }).catch(() => undefined);
}

// Modo foco · Live Activity (Dynamic Island + pantalla bloqueada): starts
// when the session is ready, follows the rest (start, +30 s, skip), the
// exercise and the pause. Coming back to the foreground sends the real state
// again (a rest that ended while the app was suspended stays at 0:00 until
// then). teardown() ends it for good (every way out of the session, and the
// unmount as the safety net): the activity, the rest notification and no
// more updates. Idempotent.
export function useSessionLiveActivity({
  runner,
  sessionId,
  workout,
}: {
  runner: SessionRunner;
  sessionId: string | null;
  workout: Workout | null;
}): { teardown: (reason: string) => Promise<void> } {
  const ready = runner.loadState === 'ready' && Boolean(sessionId && workout);
  const language: LiveActivityLanguage = useProfileLanguage() === 'en' ? 'en' : 'es';
  const input = {
    rest: runner.rest,
    paused: runner.paused,
    current: runner.current,
    setIndex: runner.cursor?.setIndex ?? 0,
    doneCount: runner.doneCount,
    total: runner.plan.length,
    draft: runner.draft,
    sets: runner.sets,
  };
  const now = Date.now();
  const state = liveActivityState(input, now, language);
  // What the activity shows by itself when this rest reaches zero: the native
  // rest cues apply it with the app in the background.
  const endState =
    state.phase === 'rest' && !state.paused ? liveActivityRestEndState(input, now, language) : null;
  const key = liveActivityKey(state, endState);
  // B-16: log every change of the button the activity offers.
  const lastAction = useRef(state.action);
  if (__DEV__ && lastAction.current !== state.action) {
    console.log(
      `[LA] action ${lastAction.current} -> ${state.action}`,
      JSON.stringify({ position: state.position, setIndex: state.setIndex, draft: runner.draft }),
    );
  }
  lastAction.current = state.action;
  const stateRef = useRef(state);
  stateRef.current = state;
  const endStateRef = useRef(endState);
  endStateRef.current = endState;
  const languageRef = useRef(language);
  languageRef.current = language;
  const idRef = useRef<string | null>(null);
  const starting = useRef<Promise<string | null> | null>(null);
  const closed = useRef(false);
  const teardownRun = useRef<Promise<void> | null>(null);
  const sessionRef = useRef(sessionId);
  sessionRef.current = sessionId;
  const startInfo = useMemo(
    () =>
      ready && sessionId && workout
        ? { routineName: workout.title, sessionId, workoutId: workout.id }
        : null,
    [ready, sessionId, workout],
  );

  const teardown = useCallback((reason: string) => {
    if (!teardownRun.current) {
      closed.current = true;
      if (__DEV__) {
        console.log(`[LA] teardown (${reason})`);
      }
      if (sessionRef.current) {
        clearLiveSession(sessionRef.current);
      }
      const id = idRef.current;
      idRef.current = null;
      const pending = starting.current;
      starting.current = null;
      // An activity still starting is ended as soon as it has an id.
      const ending = id
        ? endLiveActivity(id)
        : pending
        ? pending.then(late => (late ? endLiveActivity(late) : undefined))
        : Promise.resolve();
      teardownRun.current = Promise.all([ending, syncRestNotification(null)]).then(
        () => undefined,
        () => undefined,
      );
    }
    return teardownRun.current;
  }, []);

  // Start once per session (again if the session reloads).
  useEffect(() => {
    if (!startInfo || closed.current) {
      return undefined;
    }
    let cancelled = false;
    setLiveSession(startInfo.sessionId);
    const run = startLiveActivity(startInfo, stateRef.current);
    starting.current = run;
    run.then(id => {
      if (closed.current) {
        // teardown() ends it.
        return;
      }
      if (cancelled) {
        if (id) {
          endLiveActivity(id).catch(() => undefined);
        }
        return;
      }
      starting.current = null;
      idRef.current = id;
      // Anything that changed while it was starting.
      if (id) {
        updateLiveActivity(id, stateRef.current, endStateRef.current).catch(() => undefined);
      }
    });
    return () => {
      cancelled = true;
      if (closed.current) {
        return;
      }
      starting.current = null;
      clearLiveSession(startInfo.sessionId);
      const id = idRef.current;
      idRef.current = null;
      if (id) {
        endLiveActivity(id).catch(() => undefined);
      }
      syncRestNotification(null).catch(() => undefined);
    };
  }, [startInfo]);

  // Safety net: whatever way the screen goes, nothing stays running.
  useEffect(() => () => {
    teardown('unmount').catch(() => undefined);
  }, [teardown]);

  // Rest started, +30 s, skipped, next exercise, paused or resumed.
  useEffect(() => {
    if (!startInfo || closed.current) {
      return;
    }
    const id = idRef.current;
    if (id) {
      updateLiveActivity(id, stateRef.current, endStateRef.current).catch(() => undefined);
    }
    syncRestNotification(stateRef.current, languageRef.current).catch(() => undefined);
  }, [key, startInfo]);

  // Back in the foreground: the real state (the session clock moved on).
  useEffect(() => {
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'active' && idRef.current && !closed.current) {
        updateLiveActivity(idRef.current, stateRef.current, endStateRef.current).catch(() => undefined);
      }
    });
    return () => subscription.remove();
  }, []);

  return { teardown };
}

// At launch and on every return to the foreground: with no session screen
// open, any workout Live Activity and pending rest notification is an
// orphan (a killed app, a session left by a path that did not clean up).
export function useOrphanLiveActivityCleanup(): void {
  useEffect(() => {
    const sweep = (when: string) => {
      if (hasLiveSession()) {
        return;
      }
      if (__DEV__) {
        console.log(`[LA] sweep (${when}): sin sesión activa`);
      }
      endAllLiveActivities().catch(() => undefined);
      syncRestNotification(null).catch(() => undefined);
    };
    sweep('launch');
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'active') {
        sweep('foreground');
      }
    });
    return () => subscription.remove();
  }, []);
}
