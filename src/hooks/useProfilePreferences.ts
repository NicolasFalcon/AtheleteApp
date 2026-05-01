import {useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useAuth} from '@app/hooks/useAuth';

type NotificationPreferences = {
  workouts: boolean;
  hydration: boolean;
  updates: boolean;
};

const defaultPreferences: NotificationPreferences = {
  workouts: true,
  hydration: true,
  updates: false,
};

export function useProfilePreferences() {
  const {profile} = useAuth();
  const [notifications, setNotifications] =
    useState<NotificationPreferences>(defaultPreferences);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const key = `@athelete/profile-preferences/${profile?.id || 'guest'}`;
    let cancelled = false;
    setHydrated(false);
    setNotifications(defaultPreferences);

    AsyncStorage.getItem(key)
      .then(value => {
        if (cancelled || !value) {
          return;
        }

        const parsed = JSON.parse(value) as NotificationPreferences;
        if (!cancelled) {
          setNotifications({
            workouts:
              typeof parsed.workouts === 'boolean'
                ? parsed.workouts
                : defaultPreferences.workouts,
            hydration:
              typeof parsed.hydration === 'boolean'
                ? parsed.hydration
                : defaultPreferences.hydration,
            updates:
              typeof parsed.updates === 'boolean'
                ? parsed.updates
                : defaultPreferences.updates,
          });
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) {
          setHydrated(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [profile?.id]);

  const updateNotifications = (patch: Partial<NotificationPreferences>) => {
    const next = {
      ...notifications,
      ...patch,
    };

    setNotifications(next);
    AsyncStorage.setItem(
      `@athelete/profile-preferences/${profile?.id || 'guest'}`,
      JSON.stringify(next),
    ).catch(() => undefined);
  };

  return {
    notifications,
    updateNotifications,
    hydrated,
  };
}
