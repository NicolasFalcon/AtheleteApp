import { expoLocationApi, type LocationApi } from '@app/features/route/expoLocationApi';
import type { RoutePoint } from '@app/features/route/routeTypes';

// Where the person is, shared by every Ruta screen (B-11 / B-13):
//  - entering Ruta shows the last known position at once (≤ 5 min old,
//    marked as approximate) and starts looking for a real fix right away,
//    first with balanced accuracy (fast) and then high; the best accuracy
//    (BestForNavigation) is only used while recording;
//  - the last fix is reused for REUSE_MS when the person leaves Ruta and comes
//    back, without searching from scratch;
//  - the search stops when Ruta is left without recording (battery).
// "Comenzar" is ready once the accuracy is READY_ACCURACY_M or better.

export const REUSE_MS = 3 * 60 * 1000;
export const LAST_KNOWN_MAX_AGE_MS = 5 * 60 * 1000;
export const READY_ACCURACY_M = 30;

export type KnownFix = {
  point: RoutePoint;
  // When it was received (ms).
  at: number;
  // The platform's last known position, not a fix of this session yet.
  approximate: boolean;
};

export type LocationSnapshot = {
  fix: KnownFix | null;
  // The foreground search is running.
  searching: boolean;
};

// The fix makes "Comenzar" available: recent, real and accurate enough.
export function isReadyFix(fix: KnownFix | null): boolean {
  return Boolean(
    fix &&
      !fix.approximate &&
      fix.point.accuracy !== undefined &&
      fix.point.accuracy <= READY_ACCURACY_M,
  );
}

export function createLocationStore(api: LocationApi = expoLocationApi, clock: () => number = Date.now) {
  let snapshot: LocationSnapshot = { fix: null, searching: false };
  const listeners = new Set<() => void>();
  let stopWatch: (() => void) | null = null;
  let session = 0;
  // Calls to the platform, for the measurements and the tests.
  const calls = { lastKnown: 0, watch: 0 };

  const set = (next: Partial<LocationSnapshot>) => {
    snapshot = { ...snapshot, ...next };
    listeners.forEach(listener => listener());
  };

  const fresh = () =>
    snapshot.fix && clock() - snapshot.fix.at <= REUSE_MS ? snapshot.fix : null;

  const store = {
    get: () => snapshot,

    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    // A fix from anywhere (the search, or the recording itself).
    record(point: RoutePoint, approximate = false) {
      const current = snapshot.fix;
      // A real fix is never replaced by an approximate one.
      if (approximate && current && !current.approximate && clock() - current.at <= REUSE_MS) {
        return;
      }
      set({ fix: { point, at: clock(), approximate } });
    },

    // Entering Ruta: the reused fix if it is recent; otherwise the last known
    // position (approximate) while the real one arrives.
    async warm(): Promise<KnownFix | null> {
      const reused = fresh();
      if (reused) {
        return reused;
      }
      calls.lastKnown += 1;
      const last = await api.getLastKnown(LAST_KNOWN_MAX_AGE_MS).catch(() => null);
      if (last && !fresh()) {
        store.record(last, true);
      }
      return snapshot.fix;
    },

    // The foreground search: balanced first, high after its first fix. Calling
    // it again while it runs does nothing.
    start() {
      if (stopWatch) {
        return;
      }
      const mine = (session += 1);
      let stopCurrent: (() => void) | null = null;
      let level: 'balanced' | 'high' = 'balanced';
      const open = (accuracy: 'balanced' | 'high') => {
        calls.watch += 1;
        api
          .watchForeground(accuracy, point => {
            if (mine !== session) {
              return;
            }
            store.record(point);
            if (level === 'balanced') {
              level = 'high';
              stopCurrent?.();
              stopCurrent = null;
              open('high');
            }
          })
          .then(stop => {
            // Stopped meanwhile, or already moved on to 'high'.
            if (mine !== session || level !== accuracy) {
              stop();
              return;
            }
            stopCurrent = stop;
          })
          .catch(() => undefined);
      };
      open('balanced');
      stopWatch = () => {
        session += 1;
        stopCurrent?.();
        stopCurrent = null;
      };
      set({ searching: true });
    },

    // Leaving Ruta without recording: no more GPS.
    stop() {
      if (!stopWatch) {
        return;
      }
      stopWatch();
      stopWatch = null;
      set({ searching: false });
    },

    callCount() {
      return { ...calls };
    },
  };

  return store;
}

export type LocationStore = ReturnType<typeof createLocationStore>;

// The app's single store.
export const locationStore = createLocationStore();
