import type { NotificationContent, NotificationResponse } from 'expo-notifications';
import { notificationsModule } from '@app/features/push/notificationsNative';
import {
  markSupplement,
  snoozeSupplementReminder,
  type SupplementMoment,
} from '@app/services/supabase/nutritionDay';

// Supplement reminders (nut-1 §6): send-push groups the supplements of one
// moment under the category SUPPLEMENT_REMINDER with two actions that never
// open the app: TAKEN (mark_supplement, source = notification) and SNOOZE_30
// (snooze_supplement_reminder, once). The payload carries supplement_ids,
// local_date and moment.

export const SUPPLEMENT_CATEGORY = 'SUPPLEMENT_REMINDER';
export const ACTION_TAKEN = 'TAKEN';
export const ACTION_SNOOZE = 'SNOOZE_30';

let registered: Promise<void> | null = null;

// Once per launch: iOS keeps the category, re-setting it is harmless.
export function registerSupplementCategory(): Promise<void> {
  if (!registered) {
    registered = (async () => {
      const Notifications = notificationsModule();
      await Notifications.setNotificationCategoryAsync(SUPPLEMENT_CATEGORY, [
        { identifier: ACTION_TAKEN, buttonTitle: 'Tomado', options: { opensAppToForeground: false } },
        { identifier: ACTION_SNOOZE, buttonTitle: 'Recordar en 30 min', options: { opensAppToForeground: false } },
      ]);
    })().catch(() => {
      registered = null;
    });
  }
  return registered;
}

export type SupplementReminder = {
  supplementIds: string[];
  localDate: string;
  moment: SupplementMoment;
};

type Raw = Record<string, unknown>;
const rec = (value: unknown): Raw | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Raw) : null;

function idsOf(value: unknown): string[] {
  if (typeof value === 'string') {
    try {
      return idsOf(JSON.parse(value));
    } catch {
      return value.split(',').map(id => id.trim()).filter(Boolean);
    }
  }
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string' && id.length > 0) : [];
}

// The fields may sit in `data` itself or in its nested `data` (the APNs
// payload of send-push puts them under "data").
export function parseSupplementReminder(content: NotificationContent): SupplementReminder | null {
  const top = rec(content.data) ?? {};
  const nested = rec(top.data) ?? {};
  const pick = (key: string) => top[key] ?? nested[key];
  const isOurs =
    content.categoryIdentifier === SUPPLEMENT_CATEGORY ||
    pick('category') === SUPPLEMENT_CATEGORY ||
    pick('type') === 'supplement_reminder';
  const moment = pick('moment');
  const localDate = pick('local_date');
  const supplementIds = idsOf(pick('supplement_ids'));
  if (
    !isOurs ||
    (moment !== 'manana' && moment !== 'tarde' && moment !== 'noche') ||
    typeof localDate !== 'string' ||
    supplementIds.length === 0
  ) {
    return null;
  }
  return { supplementIds, localDate, moment };
}

export const isSupplementReminder = (response: NotificationResponse) =>
  parseSupplementReminder(response.notification.request.content) !== null;

// TAKEN / SNOOZE_30. Returns false for anything else (a plain tap opens the
// app as usual). The client ids come from the notification, so a response
// delivered twice never marks twice.
export async function handleSupplementAction(response: NotificationResponse): Promise<boolean> {
  const reminder = parseSupplementReminder(response.notification.request.content);
  if (!reminder) {
    return false;
  }
  const notificationId = response.notification.request.identifier;
  if (response.actionIdentifier === ACTION_TAKEN) {
    await Promise.allSettled(
      reminder.supplementIds.map(supplementId =>
        markSupplement({
          supplementId,
          date: reminder.localDate,
          moment: reminder.moment,
          taken: true,
          source: 'notification',
          clientId: `push:${notificationId}:${supplementId}`,
        }),
      ),
    );
    return true;
  }
  if (response.actionIdentifier === ACTION_SNOOZE) {
    await snoozeSupplementReminder(reminder.localDate, reminder.moment).catch(() => undefined);
    return true;
  }
  return false;
}
