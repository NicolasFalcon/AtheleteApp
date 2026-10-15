import type * as ExpoNotifications from 'expo-notifications';

// expo-notifications is loaded on first use, so the pure modules (and the
// tests of everything that imports them) never load the native module.
let cached: typeof ExpoNotifications | null = null;

export function notificationsModule(): typeof ExpoNotifications {
  if (!cached) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-notifications') as typeof ExpoNotifications;
  }
  return cached;
}
