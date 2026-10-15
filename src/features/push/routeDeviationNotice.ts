import type { EllieLanguage } from '@app/features/ellie/ellieCopy';
import { notificationsModule } from '@app/features/push/notificationsNative';
import { readPermission } from '@app/features/push/pushRuntime';
import { LOCAL_FLAG } from '@app/features/push/usePushEvents';

export const DEVIATION_ID = 'route-deviation';

// What to do when the route deviation flag changes: warn only when the app is
// not on screen (in the foreground the vibration already does it) and take the
// warning away once the person is back on the route.
export function deviationAction(input: {
  off: boolean;
  wasOff: boolean;
  appState: string;
}): 'notify' | 'clear' | null {
  if (input.off === input.wasOff) {
    return null;
  }
  if (input.off) {
    return input.appState === 'active' ? null : 'notify';
  }
  return 'clear';
}

const COPY = {
  es: { title: 'Te saliste de la ruta', body: 'Estás fuera del recorrido planeado. Abre ATHELETE para volver.' },
  en: { title: 'You left the route', body: "You're off the planned route. Open ATHELETE to get back." },
} as const;

// Local notification (no backend involved), only if the permission is granted.
export async function showDeviationNotice(language: EllieLanguage): Promise<void> {
  try {
    if ((await readPermission()) !== 'granted') {
      return;
    }
    await notificationsModule().scheduleNotificationAsync({
      identifier: DEVIATION_ID,
      content: { ...COPY[language], data: { [LOCAL_FLAG]: true } },
      trigger: null,
    });
  } catch {
    // The warning is a courtesy: never breaks the recording.
  }
}

export async function clearDeviationNotice(): Promise<void> {
  try {
    const Notifications = notificationsModule();
    await Notifications.dismissNotificationAsync(DEVIATION_ID);
  } catch {
    // Nothing shown, nothing to clear.
  }
}
