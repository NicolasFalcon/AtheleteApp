import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from '@app/components/v2';
import { useAuth } from '@app/hooks/useAuth';
import { setCore33InviteDismissedAt } from '@app/services/supabase/profile';

// "Ahora no" of the Core 33 discovery card: profiles.core33_invite_dismissed_at
// (it follows the user across devices). The old per-device AsyncStorage copy
// is uploaded once and deleted.
const legacyKey = (userId: string) => `@athelete/core33-invite-v1:${userId}`;

// Lets the dev menu reset the card without restarting the app.
type ResetListener = () => Promise<void>;
const resetListeners = new Set<ResetListener>();

// Development only ("Restablecer card de Core 33"): sets the column to null
// for the signed-in user; Inicio shows the card again right away.
export async function resetCore33InviteDismissals(): Promise<boolean> {
  if (!__DEV__ || resetListeners.size === 0) {
    return false;
  }
  await Promise.all([...resetListeners].map(listener => listener()));
  return true;
}

export function useCore33InviteDismissals() {
  const { profile, refreshProfile } = useAuth();
  const toast = useToast();
  const userId = profile?.id;
  const savedAt = profile?.core33InviteDismissedAt ?? null;
  // Optimistic value until the profile is refreshed (undefined: use saved).
  const [pending, setPending] = useState<string | null | undefined>(undefined);
  const migrated = useRef<string | null>(null);

  const write = useCallback(
    async (value: string | null) => {
      if (!userId) {
        return;
      }
      setPending(value);
      try {
        await setCore33InviteDismissedAt(userId, value);
        await refreshProfile();
      } catch (error) {
        console.warn('[core33] No se pudo guardar "Ahora no".', error);
        toast.show('No pudimos guardarlo. Inténtalo otra vez.', {
          tone: 'error',
        });
      } finally {
        setPending(undefined);
      }
    },
    [refreshProfile, toast, userId],
  );

  // One-time migration of a local dismissal.
  useEffect(() => {
    if (!userId || migrated.current === userId) {
      return;
    }
    migrated.current = userId;
    (async () => {
      const raw = await AsyncStorage.getItem(legacyKey(userId));
      if (!raw) {
        return;
      }
      const local = (JSON.parse(raw) as { lastDismissedAt?: string | null })
        .lastDismissedAt;
      // The server value wins if it already has one.
      if (local && !savedAt) {
        await setCore33InviteDismissedAt(userId, local);
        await refreshProfile();
      }
      await AsyncStorage.removeItem(legacyKey(userId));
    })().catch(error =>
      console.warn('[core33] No se pudo migrar el "Ahora no" local.', error),
    );
    // Runs once per user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    const reset: ResetListener = async () => {
      await write(null);
    };
    resetListeners.add(reset);
    return () => {
      resetListeners.delete(reset);
    };
  }, [write]);

  const dismiss = useCallback(() => {
    write(new Date().toISOString()).catch(() => {});
  }, [write]);

  return {
    dismissedAt: pending === undefined ? savedAt : pending,
    loaded: Boolean(profile),
    dismiss,
  };
}
