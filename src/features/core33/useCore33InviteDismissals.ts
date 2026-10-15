import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from '@app/components/v2';
import { useAuth } from '@app/hooks/useAuth';
import { dismissCore33Invite } from '@app/services/supabase/profile';

// "Ahora no" of the Core 33 discovery card: profiles.core33_invite_dismissed_at
// and core33_invite_dismiss_count (they follow the user across devices; two
// dismissals hide the card for good, BT-22). The old per-device AsyncStorage
// copy is uploaded once and deleted.
const legacyKey = (userId: string) => `@athelete/core33-invite-v1:${userId}`;

type Dismissal = { at: string | null; count: number };

export function useCore33InviteDismissals() {
  const { profile, refreshProfile } = useAuth();
  const toast = useToast();
  const userId = profile?.id;
  const saved: Dismissal = {
    at: profile?.core33InviteDismissedAt ?? null,
    count: profile?.core33InviteDismissCount ?? 0,
  };
  const savedRef = useRef(saved);
  savedRef.current = saved;
  // Optimistic value until the profile is refreshed (undefined: use saved).
  const [pending, setPending] = useState<Dismissal | undefined>(undefined);
  const migrated = useRef<string | null>(null);

  const run = useCallback(
    async (next: Dismissal, write: () => Promise<void>) => {
      if (!userId) {
        return;
      }
      setPending(next);
      try {
        await write();
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

  // One-time migration of a local dismissal (it counts as one).
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
      if (local && !savedRef.current.at) {
        await dismissCore33Invite(userId, savedRef.current.count, new Date(local));
        await refreshProfile();
      }
      await AsyncStorage.removeItem(legacyKey(userId));
    })().catch(error =>
      console.warn('[core33] No se pudo migrar el "Ahora no" local.', error),
    );
    // Runs once per user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const dismiss = useCallback(() => {
    if (!userId) {
      return;
    }
    const at = new Date();
    run({ at: at.toISOString(), count: savedRef.current.count + 1 }, () =>
      dismissCore33Invite(userId, savedRef.current.count, at),
    ).catch(() => {});
  }, [run, userId]);

  const current = pending ?? saved;
  return {
    dismissedAt: current.at,
    dismissCount: current.count,
    loaded: Boolean(profile),
    dismiss,
  };
}
