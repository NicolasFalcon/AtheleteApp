import { env } from '@app/lib/config/env';
import { apnsEnvironment } from '@app/features/push/pushEnv';
import { notificationsModule } from '@app/features/push/notificationsNative';
import { permissionOf, type PushPermission } from '@app/features/push/pushPermission';
import { createPushRegistration } from '@app/features/push/pushRegistration';
import { pushService } from '@app/services/push/pushService';

// The language the backend writes the pushes in follows profiles.language;
// the registration only reports the device's.
let locale: 'es' | 'en' | null = null;
export function setPushLocale(value: 'es' | 'en' | null) {
  locale = value;
}

export async function readPermission(): Promise<PushPermission> {
  try {
    return permissionOf(await notificationsModule().getPermissionsAsync());
  } catch {
    return 'denied';
  }
}

// The native APNs token (hex), never an Expo token. Only asked for once the
// permission is granted.
async function getApnsToken(): Promise<string | null> {
  if ((await readPermission()) !== 'granted') {
    return null;
  }
  const token = await notificationsModule().getDevicePushTokenAsync();
  return typeof token.data === 'string' && token.type === 'ios' ? token.data : null;
}

export const pushRegistration = createPushRegistration({
  getToken: getApnsToken,
  register: input => pushService.registerToken(input),
  unregister: token => pushService.unregisterToken(token),
  env: apnsEnvironment(env.appEnv, __DEV__),
  appVersion: null,
  getLocale: () => locale,
});

// For the places that end the session: never longer than 3 s, never throws.
export async function unregisterPushTokenBeforeSignOut(): Promise<void> {
  await Promise.race([
    pushRegistration.unregister().catch(() => undefined),
    new Promise<void>(resolve => setTimeout(resolve, 3000)),
  ]);
}

export async function requestPermission(): Promise<PushPermission> {
  try {
    const result = await notificationsModule().requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    return permissionOf(result);
  } catch {
    return 'denied';
  }
}
