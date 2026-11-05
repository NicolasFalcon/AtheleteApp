import { useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import { APP_ROUTES } from '@app/constants/routes';
import { parseCoachJoinLink } from '@app/features/coach/coachModel';
import { useAuth } from '@app/hooks/useAuth';
import { navigationRef } from '@app/navigation/navigationRef';

// athelete://coach/join?code=ATH-7K2Q (coach_get_invite → url): the link
// goes straight to the consent (§30.4), once the user is inside the app.
// Signed out, the code waits until the session opens. Same pattern as
// useSessionLink; AuthProvider keeps the auth links.
export function useCoachLink(): void {
  const { flow } = useAuth();
  const pending = useRef<string | null>(null);
  const initialRead = useRef(false);
  const inApp = flow === 'app';

  const open = useRef(() => {
    const code = pending.current;
    if (!code || !navigationRef.isReady()) {
      return;
    }
    pending.current = null;
    const route = navigationRef.getCurrentRoute();
    const params = route?.params as { code?: string } | undefined;
    if (route?.name === APP_ROUTES.CoachConsent && params?.code === code) {
      return;
    }
    (navigationRef.navigate as (name: string, params?: object) => void)(APP_ROUTES.CoachConsent, {
      code,
      via: 'link',
    });
  });

  useEffect(() => {
    const take = (url: string | null) => {
      const code = url ? parseCoachJoinLink(url) : null;
      if (code) {
        pending.current = code;
        if (inApp) {
          open.current();
        }
      }
    };
    if (!initialRead.current) {
      initialRead.current = true;
      Linking.getInitialURL().then(take).catch(() => undefined);
    }
    const subscription = Linking.addEventListener('url', event => take(event.url));
    return () => subscription.remove();
  }, [inApp]);

  useEffect(() => {
    if (!inApp) {
      return undefined;
    }
    // The navigator may mount a moment after the flow switches.
    const timer = setTimeout(() => open.current(), 300);
    return () => clearTimeout(timer);
  }, [inApp]);
}
