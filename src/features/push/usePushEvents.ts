import { useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Notification, NotificationResponse } from 'expo-notifications';
import { applyBadge } from '@app/features/push/badge';
import { notificationsModule } from '@app/features/push/notificationsNative';
import { isAlreadyThere, navigateToTarget, resolveTarget } from '@app/features/push/pushNavigation';
import { pushChecks } from '@app/features/push/pushChecks';
import { parsePushData, targetForPush } from '@app/features/push/pushRoute';
import {
  ACTION_SNOOZE,
  ACTION_TAKEN,
  handleSupplementAction,
  isSupplementReminder,
  registerSupplementCategory,
} from '@app/features/push/supplementActions';
import { APP_ROUTES } from '@app/constants/routes';
import { getSocialService } from '@app/services/social/socialSource';
import { useAuth } from '@app/hooks/useAuth';
import { navigationRef } from '@app/navigation/navigationRef';

// Notifications that are not pushes of the backend (reminders, route
// deviation) are scheduled by the app with this flag in `data`.
export const LOCAL_FLAG = 'athelete_local';

const isLocal = (notification: Notification): boolean =>
  (notification.request.content.data as Record<string, unknown> | undefined)?.[LOCAL_FLAG] === true;

function targetOf(notification: Notification) {
  const data = parsePushData(notification.request.content.data);
  return data ? targetForPush(data) : null;
}

// What the app does with notifications while it runs:
//  · open (foreground): a discreet system banner, unless the person is
//    already on that very screen; the inbox and the counter reload;
//  · tap, also with the app closed (getLastNotificationResponse): go to the
//    screen of the notification, or to the inbox if the entity is gone;
//  · icon badge = unread count.
export function usePushEvents(): void {
  const { flow, session } = useAuth();
  const client = useQueryClient();
  const userId = session?.user.id;
  const ready = flow === 'app' && Boolean(userId);
  const handled = useRef(new Set<string>());
  const pending = useRef<NotificationResponse | null>(null);

  const open = useCallback(
    async (response: NotificationResponse) => {
      const key = `${response.notification.request.identifier}:${response.actionIdentifier}`;
      if (handled.current.has(key)) {
        return;
      }
      handled.current.add(key);
      // A tap on a supplement reminder opens Nutrición (its actions never
      // get here: see `act`).
      if (isSupplementReminder(response)) {
        (navigationRef.navigate as (route: string) => void)(APP_ROUTES.NutritionPlan);
        return;
      }
      const target = targetOf(response.notification);
      if (!target) {
        // A local reminder or something that is not ours: nothing to open.
        return;
      }
      const resolved = await resolveTarget(target, pushChecks);
      navigateToTarget((name, params) => {
        (navigationRef.navigate as (route: string, options?: object) => void)(name, params);
      }, resolved);
      client.invalidateQueries({ queryKey: ['social'] }).catch(() => undefined);
    },
    [client],
  );

  // "Tomado" / "Recordar en 30 min" of a supplement reminder: done at once,
  // without navigating (the app may be running in the background only).
  const act = useCallback(
    (response: NotificationResponse): boolean => {
      const action = response.actionIdentifier;
      if ((action !== ACTION_TAKEN && action !== ACTION_SNOOZE) || !isSupplementReminder(response)) {
        return false;
      }
      const key = `${response.notification.request.identifier}:${action}`;
      if (!handled.current.has(key)) {
        handled.current.add(key);
        handleSupplementAction(response)
          .then(() => client.invalidateQueries({ queryKey: ['nutrition-day'] }))
          .catch(() => undefined);
      }
      return true;
    },
    [client],
  );

  // A response that arrives before the app is ready (cold start) waits.
  const flush = useCallback(() => {
    const response = pending.current;
    if (response && ready && navigationRef.isReady()) {
      pending.current = null;
      open(response).catch(() => undefined);
    }
  }, [open, ready]);

  useEffect(() => {
    let Notifications: ReturnType<typeof notificationsModule>;
    try {
      Notifications = notificationsModule();
    } catch {
      return undefined;
    }
    Notifications.setNotificationHandler({
      handleNotification: async notification => {
        const local = isLocal(notification);
        const target = local ? null : targetOf(notification);
        // The end of the rest only matters with the app in the background
        // (the session screen already shows "¡Vamos!").
        const restEnd =
          (notification.request.content.data as Record<string, unknown> | undefined)?.kind === 'rest-end';
        const there =
          restEnd || (target ? isAlreadyThere(navigationRef.getCurrentRoute(), target) : false);
        return {
          shouldShowBanner: !there,
          shouldShowList: !there,
          // The sound and the badge are the app's call, not the payload's.
          shouldPlaySound: false,
          shouldSetBadge: false,
        };
      },
    });
    const received = Notifications.addNotificationReceivedListener(notification => {
      if (!isLocal(notification)) {
        client.invalidateQueries({ queryKey: ['social'] }).catch(() => undefined);
      }
    });
    registerSupplementCategory().catch(() => undefined);
    const responded = Notifications.addNotificationResponseReceivedListener(response => {
      if (act(response)) {
        return;
      }
      pending.current = response;
      flush();
    });
    // The notification that opened the app from closed (or launched it in
    // the background for an action).
    const last = Notifications.getLastNotificationResponse();
    if (last && !act(last)) {
      pending.current = last;
    }
    return () => {
      received.remove();
      responded.remove();
      Notifications.setNotificationHandler(null);
    };
  }, [act, client, flush]);

  // Cold start: the navigator may take a moment to be ready after the flow
  // is the app one.
  useEffect(() => {
    if (!ready) {
      return undefined;
    }
    flush();
    const timer = setInterval(flush, 400);
    const stop = setTimeout(() => clearInterval(timer), 15000);
    return () => {
      clearInterval(timer);
      clearTimeout(stop);
    };
  }, [flush, ready]);

  // The badge follows the unread counter of the bell.
  // Same cache entry as the bell (useSocialResource), without its focus hook:
  // this runs outside any screen.
  const unreadQuery = useQuery({
    queryKey: ['social', userId ?? 'anon', 'getUnreadNotifications'],
    queryFn: () => getSocialService().getUnreadNotifications(),
    enabled: ready,
    staleTime: 30_000,
  });
  const unread = unreadQuery.data ?? 0;
  useEffect(() => {
    if (ready) {
      applyBadge(unread).catch(() => undefined);
    }
  }, [ready, unread]);

  // Out of the session the badge goes to zero.
  useEffect(() => {
    if (flow === 'auth') {
      applyBadge(0).catch(() => undefined);
    }
  }, [flow]);
}
