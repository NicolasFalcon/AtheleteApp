import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useToast } from '@app/components/v2';
import { useAuth } from '@app/hooks/useAuth';
import {
  DEFAULT_NOTIFICATION_PREFS,
  parseNotificationPrefs,
  saveNotificationPrefs,
} from '@app/services/supabase/profile';
import type { NotificationPrefs } from '@app/types/auth';

// The three switches of Ajustes live in profiles.notification_prefs (BT-31):
// they follow the user across devices. The change shows at once and is put
// back (with a toast) if the write fails. The old per-device copy in
// AsyncStorage is uploaded once and deleted.
export const legacyPreferencesKey = (userId: string) =>
  `@athelete/profile-preferences/${userId}`;

export function useProfilePreferences() {
  const { profile, refreshProfile } = useAuth();
  const toast = useToast();
  const userId = profile?.id;
  const [notifications, setNotifications] = useState<NotificationPrefs>(
    profile?.notificationPrefs ?? DEFAULT_NOTIFICATION_PREFS,
  );
  // Writes in flight: the profile does not overwrite what the user just set.
  const inFlight = useRef(0);
  const latest = useRef(notifications);
  latest.current = notifications;
  const migrated = useRef<string | null>(null);

  useEffect(() => {
    if (profile && inFlight.current === 0) {
      setNotifications(profile.notificationPrefs);
    }
  }, [profile]);

  // One-time migration of the local values to the profile.
  useEffect(() => {
    if (!userId || migrated.current === userId) {
      return;
    }
    migrated.current = userId;
    (async () => {
      const raw = await AsyncStorage.getItem(legacyPreferencesKey(userId));
      if (!raw) {
        return;
      }
      const legacy = parseNotificationPrefs(JSON.parse(raw));
      await saveNotificationPrefs(userId, legacy);
      await refreshProfile();
      await AsyncStorage.removeItem(legacyPreferencesKey(userId));
    })().catch(error =>
      console.warn('[preferences] No se pudieron migrar los avisos.', error),
    );
    // Runs once per user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const updateNotifications = useCallback(
    (patch: Partial<NotificationPrefs>) => {
      if (!userId) {
        return;
      }
      const previous = latest.current;
      const next = { ...previous, ...patch };
      setNotifications(next);
      inFlight.current += 1;
      saveNotificationPrefs(userId, next)
        .then(() => refreshProfile())
        .catch(error => {
          console.warn('[preferences] No se pudo guardar.', error);
          setNotifications(previous);
          toast.show('No pudimos guardar el cambio', { tone: 'error' });
        })
        .finally(() => {
          inFlight.current -= 1;
        });
    },
    [refreshProfile, toast, userId],
  );

  return {
    notifications,
    updateNotifications,
    hydrated: Boolean(profile),
  };
}
