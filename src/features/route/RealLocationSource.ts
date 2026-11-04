import {
  expoLocationApi,
  type LocationApi,
  type PermissionSnapshot,
} from '@app/features/route/expoLocationApi';
import type {
  BackgroundAccess,
  LocationAccess,
  LocationSource,
  LocationSourceEvent,
} from '@app/features/route/locationSource';
import { locationBus } from '@app/features/route/locationTask';
import type { RoutePoint } from '@app/features/route/routeTypes';

// How often we check that the platform is alive (the 5 m distance filter is
// silent while standing still, so "no fix" does not mean "no GPS"), and how
// old the last known fix may be to count as alive.
export const HEARTBEAT_MS = 4000;
export const ALIVE_MAX_AGE_MS = 8000;

// LocationSource over expo-location: permission "Al usar la app" (plus
// "Permitir todo el tiempo" on Android, asked when recording starts), a
// current fix for the pre-screen and the background updates task while
// recording (blue indicator on iOS, foreground service notification on
// Android). Stopping the watch stops the updates.
export class RealLocationSource implements LocationSource {
  constructor(
    private readonly api: LocationApi = expoLocationApi,
    private readonly bus: typeof locationBus = locationBus,
    private readonly clock: () => number = Date.now,
  ) {}

  private async read(request: boolean): Promise<LocationAccess> {
    let snapshot = await this.api.getPermissions();
    // Android can ask again after a first "No permitir"; iOS reports
    // canAskAgain false once it was answered.
    if (request && snapshot.status !== 'granted' && snapshot.canAskAgain) {
      snapshot = await this.api.requestPermissions();
    }
    const { precise, canAskAgain } = snapshot;
    if (snapshot.status === 'undetermined') {
      return { permission: 'undetermined', precise, canAskAgain };
    }
    const servicesOn = await this.api.servicesEnabled().catch(() => true);
    if (!servicesOn) {
      return { permission: 'restricted', precise, canAskAgain };
    }
    if (snapshot.status === 'denied') {
      return { permission: 'denied', precise, canAskAgain };
    }
    return { permission: 'granted', precise, canAskAgain };
  }

  async getBackgroundAccess(): Promise<BackgroundAccess> {
    if (!this.api.needsBackgroundPermission) {
      return { status: 'not_needed' };
    }
    return backgroundAccess(await this.api.getBackgroundPermissions());
  }

  async requestBackgroundAccess(): Promise<BackgroundAccess> {
    if (!this.api.needsBackgroundPermission) {
      return { status: 'not_needed' };
    }
    const current = await this.api.getBackgroundPermissions();
    if (current.status === 'granted' || !current.canAskAgain) {
      return backgroundAccess(current);
    }
    return backgroundAccess(await this.api.requestBackgroundPermissions());
  }

  getAccess() {
    return this.read(false);
  }

  requestAccess() {
    return this.read(true);
  }

  async getCurrent(): Promise<RoutePoint | null> {
    const access = await this.read(false);
    if (access.permission !== 'granted') {
      return null;
    }
    return this.api.getCurrent().catch(() => null);
  }

  now() {
    return this.clock();
  }

  watch(
    onFix: (fix: RoutePoint) => void,
    onEvent: (event: LocationSourceEvent) => void = () => undefined,
  ) {
    let stopped = false;
    let revoked = false;
    // The updates did not start: the screen shows it (Reintentar starts a new
    // watch), so the heartbeat does not report it again as a revoked permission.
    let failed = false;

    const checkAccess = async () => {
      if (stopped || revoked || failed) {
        return;
      }
      const access = await this.read(false).catch(() => null);
      if (access && access.permission !== 'granted' && !stopped && !revoked) {
        revoked = true;
        onEvent({ type: 'permission_revoked' });
      }
    };

    const offFixes = this.bus.onFixes(fixes => {
      if (!stopped) {
        fixes.forEach(onFix);
      }
    });
    const offError = this.bus.onError(() => {
      checkAccess().catch(() => undefined);
    });

    this.api
      .startUpdates()
      .then(() => {
        if (stopped) {
          return this.api.stopUpdates();
        }
        return undefined;
      })
      .catch(async () => {
        const access = await this.read(false).catch(() => null);
        if (stopped || revoked) {
          return;
        }
        if (access && (access.permission === 'denied' || access.permission === 'undetermined')) {
          revoked = true;
          onEvent({ type: 'permission_revoked' });
          return;
        }
        failed = true;
        onEvent({ type: 'start_failed', servicesOff: access?.permission === 'restricted' });
      });

    const timer = setInterval(() => {
      checkAccess().catch(() => undefined);
      this.api
        .getLastKnown(ALIVE_MAX_AGE_MS)
        .then(last => {
          if (last && !stopped) {
            onEvent({ type: 'alive', t: this.clock() });
          }
        })
        .catch(() => undefined);
    }, HEARTBEAT_MS);

    return () => {
      if (stopped) {
        return;
      }
      stopped = true;
      clearInterval(timer);
      offFixes();
      offError();
      this.api.stopUpdates().catch(() => undefined);
    };
  }
}

function backgroundAccess(snapshot: PermissionSnapshot): BackgroundAccess {
  if (snapshot.status === 'granted') {
    return { status: 'granted' };
  }
  return { status: snapshot.status, canAskAgain: snapshot.canAskAgain };
}

// Stops the platform updates whatever the screens are doing (end, discard,
// sign out, or a task left over from a previous run of the app).
export async function stopAllLocationUpdates(api: LocationApi = expoLocationApi): Promise<void> {
  try {
    await api.stopUpdates();
  } catch {
    // Nothing running, or the module is unavailable.
  }
}
