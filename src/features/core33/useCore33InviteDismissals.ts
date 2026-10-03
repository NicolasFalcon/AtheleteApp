import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  NO_DISMISSALS,
  recordDismissal,
  type Core33InviteDismissals,
} from '@app/features/core33/core33Invite';

// "Ahora no" of the Core 33 discovery card, per user. Local for now
// (AsyncStorage); pending: move it to the profile in the backend so it
// follows the user across devices (MIGRATION_PROGRESS §17).
const keyFor = (userId: string) => `@athelete/core33-invite-v1:${userId}`;

// Lets the dev menu reset the card without restarting the app.
const resetListeners = new Set<() => void>();
let currentUserId: string | undefined;

// Development only ("Restablecer card de Core 33"): deletes the saved
// dismissals of the signed-in user and reloads every mounted hook.
export async function resetCore33InviteDismissals(): Promise<boolean> {
  if (!__DEV__ || !currentUserId) {
    return false;
  }
  await AsyncStorage.removeItem(keyFor(currentUserId));
  resetListeners.forEach(listener => listener());
  return true;
}

export function useCore33InviteDismissals(userId: string | undefined) {
  const [dismissals, setDismissals] =
    useState<Core33InviteDismissals>(NO_DISMISSALS);
  const [loaded, setLoaded] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    currentUserId = userId;
    const reload = () => setReloadKey(key => key + 1);
    resetListeners.add(reload);
    return () => {
      resetListeners.delete(reload);
    };
  }, [userId]);

  useEffect(() => {
    let active = true;
    setLoaded(false);

    if (!userId) {
      return;
    }

    AsyncStorage.getItem(keyFor(userId))
      .then(raw => {
        if (!active) {
          return;
        }
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<Core33InviteDismissals>;
          setDismissals({ ...NO_DISMISSALS, ...parsed });
        } else {
          setDismissals(NO_DISMISSALS);
        }
      })
      .catch(() => {
        if (active) {
          setDismissals(NO_DISMISSALS);
        }
      })
      .finally(() => {
        if (active) {
          setLoaded(true);
        }
      });

    return () => {
      active = false;
    };
  }, [userId, reloadKey]);

  const dismiss = useCallback(
    (completedCount: number) => {
      const next = recordDismissal(dismissals, completedCount, new Date());
      setDismissals(next);
      if (userId) {
        AsyncStorage.setItem(keyFor(userId), JSON.stringify(next)).catch(
          () => {},
        );
      }
    },
    [dismissals, userId],
  );

  return { dismissals, loaded, dismiss };
}
