import type { PushPrefs, PushPrefsPatch } from '@app/services/push/pushService';

export function applyPatch(prefs: PushPrefs, patch: PushPrefsPatch): PushPrefs {
  return {
    social: patch.social ?? prefs.social,
    challenges: patch.challenges ?? prefs.challenges,
    quietHours: {
      enabled: patch.quietEnabled ?? prefs.quietHours.enabled,
      start: patch.quietStart ?? prefs.quietHours.start,
      end: patch.quietEnd ?? prefs.quietHours.end,
    },
  };
}

// Several quick changes (a stepper tapped three times) go as one call, with
// the last value of each field.
export function mergePatches(first: PushPrefsPatch, next: PushPrefsPatch): PushPrefsPatch {
  return { ...first, ...next };
}

// The hour stepper: 0..23, wrapping around.
export function stepHour(hour: number, delta: 1 | -1): number {
  return (hour + delta + 24) % 24;
}

// Whether `hour` (0-23, local) falls inside the quiet window. A window that
// crosses midnight (22 → 8) is the usual one; start == end is no window.
export function inQuietHours(
  quiet: { enabled: boolean; start: number; end: number },
  hour: number,
): boolean {
  if (!quiet.enabled || quiet.start === quiet.end) {
    return false;
  }
  return quiet.start < quiet.end
    ? hour >= quiet.start && hour < quiet.end
    : hour >= quiet.start || hour < quiet.end;
}
