import { expoLocationApi, type LocationApi } from '@app/features/route/expoLocationApi';
import type {
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

// LocationSource over expo-location: permission "Al usar la app" only, a
// current fix for the pre-screen and the background updates task while
// recording (blue indicator on). Stopping the watch stops the updates.
export class RealLocationSource implements LocationSource {
  constructor(
    private readonly api: LocationApi = expoLocationApi,
    private readonly bus: typeof locationBus = locationBus,
    private readonly clock: () => number = Date.now,
  ) {}

  private async read(request: boolean): Promise<LocationAccess> {
    let snapshot = await this.api.getPermissions();
    if (request && snapshot.status === 'undetermined' && snapshot.canAskAgain) {
      snapshot = await this.api.requestPermissions();
    }
    if (snapshot.status === 'undetermined') {
      return { permission: 'undetermined', precise: snapshot.precise };
    }
    const servicesOn = await this.api.servicesEnabled().catch(() => true);
    if (!servicesOn) {
      return { permission: 'restricted', precise: snapshot.precise };
    }
    if (snapshot.status === 'denied') {
      return { permission: 'denied', precise: snapshot.precise };
    }
    return { permission: 'granted', precise: snapshot.precise };
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

    const checkAccess = async () => {
      if (stopped || revoked) {
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
      .catch(() => checkAccess());

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

// Stops the platform updates whatever the screens are doing (end, discard,
// sign out, or a task left over from a previous run of the app).
export async function stopAllLocationUpdates(api: LocationApi = expoLocationApi): Promise<void> {
  try {
    await api.stopUpdates();
  } catch {
    // Nothing running, or the module is unavailable.
  }
}
