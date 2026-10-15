import { useEffect } from 'react';
import { AppState } from 'react-native';
import { notificationsModule } from '@app/features/push/notificationsNative';
import { pushRegistration, setPushLocale } from '@app/features/push/pushRuntime';
import { useAuth } from '@app/hooks/useAuth';
import { useProfileLanguage } from '@app/hooks/useProfileLanguage';

// Registers the APNs token with the backend: at launch with a session, after
// signing in, when the app comes back to the foreground (the permission may
// have been granted in Ajustes) and every time iOS hands out a new token.
export function usePushRegistration(): void {
  const { session, flow } = useAuth();
  const language = useProfileLanguage();
  const userId = session?.user.id;
  const active = Boolean(userId) && flow === 'app';

  useEffect(() => {
    setPushLocale(language);
  }, [language]);

  useEffect(() => {
    if (!active) {
      return undefined;
    }
    pushRegistration.sync().catch(() => undefined);
    const state = AppState.addEventListener('change', next => {
      if (next === 'active') {
        pushRegistration.sync().catch(() => undefined);
      }
    });
    let subscription: { remove: () => void } | null = null;
    try {
      subscription = notificationsModule().addPushTokenListener(token => {
        if (typeof token.data === 'string') {
          pushRegistration.sync(token.data).catch(() => undefined);
        }
      });
    } catch {
      // No native module (tests): nothing to listen to.
    }
    return () => {
      state.remove();
      subscription?.remove();
    };
  }, [active, userId]);
}
