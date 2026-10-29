import { useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import { APP_ROUTES } from '@app/constants/routes';
import { useAuth } from '@app/hooks/useAuth';
import { navigationRef } from '@app/navigation/navigationRef';

// athelete://session/<sessionId>?workoutId=<id> → { sessionId, workoutId }.
export function parseSessionLink(url: string): { sessionId: string; workoutId: string } | null {
  const match = /^athelete:\/\/session\/([^/?#]+)\?(?:.*&)?workoutId=([^&#]+)/i.exec(url);
  if (!match) {
    return null;
  }
  return { sessionId: decodeURIComponent(match[1]), workoutId: decodeURIComponent(match[2]) };
}

// Tapping the workout Live Activity opens the running session. Only this
// link is handled here (AuthProvider keeps the auth links); it waits until
// the navigation is ready and the user is inside the app.
export function useSessionLink(): void {
  const { flow } = useAuth();
  const pending = useRef<{ sessionId: string; workoutId: string } | null>(null);
  const initialRead = useRef(false);
  const inApp = flow === 'app';

  const open = useRef(() => {
    const target = pending.current;
    if (!target || !navigationRef.isReady()) {
      return;
    }
    pending.current = null;
    const route = navigationRef.getCurrentRoute();
    const params = route?.params as { sessionId?: string } | undefined;
    if (route?.name === APP_ROUTES.WorkoutSession && params?.sessionId === target.sessionId) {
      return;
    }
    (navigationRef.navigate as (name: string, params?: object) => void)(APP_ROUTES.WorkoutSession, target);
  });

  useEffect(() => {
    const take = (url: string | null) => {
      const target = url ? parseSessionLink(url) : null;
      if (target) {
        pending.current = target;
        if (inApp) {
          open.current();
        }
      }
    };
    // The link that opened the app from closed, once.
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
