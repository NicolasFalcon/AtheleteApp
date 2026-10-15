import type { RoutePoint } from '@app/features/route/routeTypes';

// Background location task. `TaskManager.defineTask` must run when the JS
// bundle loads (before any screen mounts), so index.js imports this file. The
// task only forwards the fixes to whoever is listening (RealLocationSource);
// the recording itself is persisted by the tracker (activeRecording.ts).

export const LOCATION_TASK = 'athelete-route-location';

type FixListener = (fixes: RoutePoint[]) => void;
type ErrorListener = (error: unknown) => void;

const fixListeners = new Set<FixListener>();
const errorListeners = new Set<ErrorListener>();

export const locationBus = {
  onFixes(listener: FixListener) {
    fixListeners.add(listener);
    return () => {
      fixListeners.delete(listener);
    };
  },
  onError(listener: ErrorListener) {
    errorListeners.add(listener);
    return () => {
      errorListeners.delete(listener);
    };
  },
  emitFixes(fixes: RoutePoint[]) {
    fixListeners.forEach(listener => listener(fixes));
  },
  emitError(error: unknown) {
    errorListeners.forEach(listener => listener(error));
  },
};

type RawLocation = {
  coords: {
    latitude: number;
    longitude: number;
    altitude: number | null;
    accuracy: number | null;
  };
  timestamp: number;
};

// expo-location's LocationObject → a RoutePoint. `t` is the time of the
// SAMPLE (in the background they arrive in batches, later than they happened).
export function toRoutePoint(location: RawLocation): RoutePoint {
  const { coords } = location;
  return {
    lat: coords.latitude,
    lon: coords.longitude,
    ...(coords.altitude !== null && Number.isFinite(coords.altitude) ? { ele: coords.altitude } : {}),
    t: location.timestamp,
    ...(coords.accuracy !== null && coords.accuracy >= 0 ? { accuracy: coords.accuracy } : {}),
  };
}

export function handleTaskBody(body: { data?: unknown; error?: unknown }) {
  if (body.error) {
    locationBus.emitError(body.error);
    return;
  }
  const locations = (body.data as { locations?: RawLocation[] } | undefined)?.locations;
  if (locations && locations.length > 0) {
    locationBus.emitFixes(locations.map(toRoutePoint));
  }
}

export function defineLocationTask() {
  try {
    // Loaded here (not at the top) so tests and non-native hosts can import
    // the bus without the native module.
    const TaskManager = require('expo-task-manager') as typeof import('expo-task-manager');
    TaskManager.defineTask(LOCATION_TASK, async body => {
      handleTaskBody(body as { data?: unknown; error?: unknown });
    });
  } catch (error) {
    console.warn('[route] expo-task-manager is not available.', error);
  }
}

defineLocationTask();
