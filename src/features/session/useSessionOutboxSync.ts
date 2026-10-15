import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useAuth } from '@app/hooks/useAuth';
import { nextBackoffMs } from '@app/features/session/sessionOutbox';
import { flushSessionOutbox } from '@app/services/supabase/session';

// Queries that show a finished workout.
const AFTER_SYNC_KEYS = [
  ['home'],
  ['progress'],
  ['workouts'],
  ['ellie'],
  ['profile'],
  ['workout-session'],
  ['session-summary'],
] as const;

function invalidateWorkoutViews(client: QueryClient) {
  AFTER_SYNC_KEYS.forEach(queryKey => {
    client.invalidateQueries({ queryKey: [...queryKey] }).catch(() => {});
  });
}

// Silent, global replay of the session outbox (workouts saved on the phone
// while offline). It runs when the app starts with a session, when it returns
// to the foreground, and on a timer with progressive waits (15 s … 5 min)
// while the network keeps failing. Only one replay runs at a time (the
// service shares the one in progress). Items that failed for a reason other
// than the network are parked with an error and skipped here. NetInfo is not
// installed, so "connection is back" is covered by the foreground trigger and
// the backoff timer.
export function useSessionOutboxSync(): void {
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

    const clearTimer = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const sync = async () => {
      clearTimer();
      try {
        const run = await flushSessionOutbox(userId);
        if (cancelled) {
          return;
        }
        if (run.done > 0) {
          invalidateWorkoutViews(queryClient);
        }
        if (run.stoppedByNetwork) {
          failures += 1;
          timer = setTimeout(sync, nextBackoffMs(failures));
        } else {
          failures = 0;
        }
      } catch {
        // Reading the queue failed: try again later like a network failure.
        if (!cancelled) {
          failures += 1;
          timer = setTimeout(sync, nextBackoffMs(failures));
        }
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
      clearTimer();
      subscription.remove();
    };
  }, [queryClient, userId]);
}
