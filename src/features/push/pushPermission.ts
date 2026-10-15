// The permission of notifications, as the app reasons about it.
export type PushPermission = 'undetermined' | 'granted' | 'denied';

export type PermissionSnapshot = {
  status?: string;
  granted?: boolean;
  canAskAgain?: boolean;
  ios?: { status?: number };
};

// expo-notifications: iOS NOTDETERMINED = 0, DENIED = 1, AUTHORIZED = 2,
// PROVISIONAL = 3, EPHEMERAL = 4.
export function permissionOf(snapshot: PermissionSnapshot): PushPermission {
  if (snapshot.granted) {
    return 'granted';
  }
  const ios = snapshot.ios?.status;
  if (ios === 3 || ios === 4) {
    return 'granted';
  }
  if (snapshot.status === 'undetermined' || ios === 0) {
    return 'undetermined';
  }
  return 'denied';
}

export type PromptReason = 'onboarding' | 'community' | 'inbox';

// When the v2 pre-permission screen may come up on its own: only while the
// system has not been asked yet, only once per person (a "Ahora no" is
// respected: from then on the switch lives in Ajustes), and never before the
// onboarding is complete.
export function shouldPrompt(input: {
  permission: PushPermission;
  alreadyAsked: boolean;
  onboardingCompleted: boolean;
}): boolean {
  return input.permission === 'undetermined' && !input.alreadyAsked && input.onboardingCompleted;
}
