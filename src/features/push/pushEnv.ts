import type { ApnsEnv } from '@app/services/push/pushService';

// The APNs environment of this build: a Debug build (Xcode, development
// provisioning) talks to the sandbox; Release (TestFlight / App Store) to
// production. Production needs BOTH: Release AND APP_ENV=production
// (.env.production), so a Release build packed with the development .env
// never registers its token as production.
export function apnsEnvironment(appEnv: string, isDev: boolean): ApnsEnv {
  return !isDev && appEnv === 'production' ? 'production' : 'sandbox';
}
