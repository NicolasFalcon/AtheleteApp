import { notificationsModule } from '@app/features/push/notificationsNative';

// The icon badge = the unread notifications of the inbox (the `unread` that
// mark_notifications_read returns, or the count the bell already holds).
export async function applyBadge(unread: number): Promise<void> {
  try {
    await notificationsModule().setBadgeCountAsync(Math.max(0, Math.floor(unread)));
  } catch {
    // Without permission iOS ignores the badge: nothing to do.
  }
}
