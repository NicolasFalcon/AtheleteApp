import { apnsEnvironment } from '@app/features/push/pushEnv';
import type { ApnsEnv, RegisterTokenInput } from '@app/services/push/pushService';

// Registers the APNs token of this device with the backend, and takes it back
// before the session ends. Everything best-effort: a failure here never
// blocks sign-in or sign-out.

export type RegistrationDeps = {
  // The native APNs token (hex), or null when the system gives none.
  getToken: () => Promise<string | null>;
  register: (input: RegisterTokenInput) => Promise<unknown>;
  unregister: (token: string) => Promise<void>;
  env: ApnsEnv;
  appVersion: string | null;
  getLocale: () => 'es' | 'en' | null;
};

export function createPushRegistration(deps: RegistrationDeps) {
  // The last token that went to the backend, to take it back on sign-out
  // without asking the system again.
  let lastToken: string | null = null;

  async function registerToken(token: string): Promise<boolean> {
    try {
      await deps.register({ token, env: deps.env, appVersion: deps.appVersion, locale: deps.getLocale() });
      lastToken = token;
      return true;
    } catch {
      return false;
    }
  }

  return {
    // At launch with a session, after signing in, and each time iOS hands
    // out a token (`token` given): idempotent on the server.
    async sync(token?: string): Promise<boolean> {
      try {
        const current = token ?? (await deps.getToken());
        return current ? await registerToken(current) : false;
      } catch {
        return false;
      }
    },

    // Called BEFORE the session closes (and before deleting the account).
    async unregister(): Promise<void> {
      let token = lastToken;
      try {
        token = token ?? (await deps.getToken());
      } catch {
        // Without permission or token there is nothing to take back.
      }
      if (!token) {
        return;
      }
      try {
        await deps.unregister(token);
      } catch {
        // Offline: the server drops the token on its own when APNs rejects it.
      }
      lastToken = null;
    },
    lastToken: () => lastToken,
  };
}

export { apnsEnvironment };

// The order that matters when a session ends: the token goes back to the
// backend FIRST (it needs the user's JWT), then the session closes.
export async function signOutAfterUnregister<T>(
  unregister: () => Promise<void>,
  signOut: () => Promise<T>,
): Promise<T> {
  await unregister();
  return signOut();
}
