// Core 33 discovery card on Inicio (handoff · Core 33 flow, "Descubrimiento
// desde Inicio"; HOME_10 / HOME_11). Pure rules, persisted state lives in
// useCore33InviteDismissals.

export type Core33InviteVariant = 'invite' | 'again';

export const INVITE_SNOOZE_DAYS = 14;
export const INVITE_MAX_DISMISSALS = 2;

// "Ahora no" history. `completedCountAtDismissal` resets the counter when the
// user finishes another Core 33 after dismissing.
export type Core33InviteDismissals = {
  count: number;
  lastDismissedAt: string | null; // ISO
  completedCountAtDismissal: number;
};

export const NO_DISMISSALS: Core33InviteDismissals = {
  count: 0,
  lastDismissedAt: null,
  completedCountAtDismissal: 0,
};

export type Core33InviteInput = {
  // Active or prepared (chosen, not started) challenge: Core 33 lives in the
  // hero / Progreso, never in the card.
  hasCurrentChallenge: boolean;
  completedCount: number;
  lastDay33: string | null; // YYYY-MM-DD of day 33 of the latest finished one
  dismissals: Core33InviteDismissals;
  today: string; // YYYY-MM-DD (local)
  now: Date;
};

function effectiveDismissals(
  dismissals: Core33InviteDismissals,
  completedCount: number,
): Core33InviteDismissals {
  return completedCount > dismissals.completedCountAtDismissal
    ? NO_DISMISSALS
    : dismissals;
}

export function resolveCore33Invite({
  hasCurrentChallenge,
  completedCount,
  lastDay33,
  dismissals,
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

  const state = effectiveDismissals(dismissals, completedCount);

  if (state.count >= INVITE_MAX_DISMISSALS) {
    return null;
  }

  if (state.count > 0 && state.lastDismissedAt) {
    const elapsedDays =
      (now.getTime() - new Date(state.lastDismissedAt).getTime()) / 86400000;
    if (elapsedDays < INVITE_SNOOZE_DAYS) {
      return null;
    }
  }

  return variant;
}

export function recordDismissal(
  dismissals: Core33InviteDismissals,
  completedCount: number,
  now: Date,
): Core33InviteDismissals {
  const state = effectiveDismissals(dismissals, completedCount);
  return {
    count: state.count + 1,
    lastDismissedAt: now.toISOString(),
    completedCountAtDismissal: completedCount,
  };
}
