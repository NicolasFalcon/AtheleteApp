import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@app/hooks/useAuth';
import { deviceTimezone, syncProfileTimezone } from '@app/features/profile/timezoneSync';

// Keeps profiles.timezone equal to the device's zone (see timezoneSync.ts).
export function useTimezoneSync(): void {
  const { session } = useAuth();
  const userId = session?.user.id;

  useEffect(() => {
    if (!userId) {
      return undefined;
    }
    let last: string | null = null;
    const run = () => {
      const zone = deviceTimezone();
      // Nothing to ask the server while the zone is the one already synced.
      if (zone && zone !== last) {
        syncProfileTimezone(userId, zone)
          .then(() => {
            last = zone;
          })
          .catch(() => undefined);
      }
    };
    run();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        run();
      }
    });
    return () => subscription.remove();
  }, [userId]);
}
