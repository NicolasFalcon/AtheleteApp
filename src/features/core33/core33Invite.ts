// Core 33 discovery card on Inicio (handoff · Core 33 flow, "Descubrimiento
// desde Inicio"; HOME_10 / HOME_11). Pure rules, persisted state lives in
// useCore33InviteDismissals.

export type Core33InviteVariant = 'invite' | 'again';

// "Ahora no" hides the card for 14 days (profiles.core33_invite_dismissed_at)
// and, at the second dismissal, for good (profiles.core33_invite_dismiss_count,
// BT-22: D-54 is resolved). Both reset when another Core 33 is completed.
export const INVITE_SNOOZE_DAYS = 14;
export const INVITE_MAX_DISMISSALS = 2;

export type Core33InviteInput = {
  // Active or prepared (chosen, not started) challenge: Core 33 lives in the
  // hero / Progreso, never in the card.
  hasCurrentChallenge: boolean;
  completedCount: number;
  lastDay33: string | null; // YYYY-MM-DD of day 33 of the latest finished one
  dismissedAt: string | null; // ISO, profiles.core33_invite_dismissed_at
  dismissCount?: number; // profiles.core33_invite_dismiss_count
  today: string; // YYYY-MM-DD (local)
  now: Date;
};

// A dismissal made before the latest Core 33 ended no longer counts: after
// finishing another one the card starts over.
function localDateKey(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function resolveCore33Invite({
  hasCurrentChallenge,
  completedCount,
  lastDay33,
  dismissedAt,
  dismissCount = 0,
  today,
  now,
}: Core33InviteInput): Core33InviteVariant | null {
  if (hasCurrentChallenge) {
    return null;
  }

  const variant: Core33InviteVariant = completedCount > 0 ? 'again' : 'invite';

  // "Empieza otro" appears from the day after day 33 (the completion screen
  // already offers "Explorar otro Core 33" that day).
  if (variant === 'again' && lastDay33 && today <= lastDay33) {
    return null;
  }

  const dismissalCounts =
    dismissedAt && !(lastDay33 && localDateKey(dismissedAt) <= lastDay33);

  // Two "Ahora no" and the card never comes back (until another Core 33 is
  // completed and the counter goes back to 0).
  if (dismissalCounts && dismissCount >= INVITE_MAX_DISMISSALS) {
    return null;
  }

  if (dismissalCounts && dismissedAt) {
    const elapsedDays =
      (now.getTime() - new Date(dismissedAt).getTime()) / 86400000;
    if (elapsedDays < INVITE_SNOOZE_DAYS) {
      return null;
    }
  }

  return variant;
}
