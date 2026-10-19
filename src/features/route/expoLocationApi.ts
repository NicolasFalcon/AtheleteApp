import { LOCATION_TASK, toRoutePoint } from '@app/features/route/locationTask';
import type { RoutePoint } from '@app/features/route/routeTypes';

// The few expo-location calls Ruta needs, behind an interface so the source
// can be tested without the native module. The module is loaded lazily.

export type PermissionSnapshot = {
  status: 'granted' | 'denied' | 'undetermined';
  canAskAgain: boolean;
  precise: boolean;
};

export type LocationApi = {
  getPermissions(): Promise<PermissionSnapshot>;
  requestPermissions(): Promise<PermissionSnapshot>;
  servicesEnabled(): Promise<boolean>;
  getCurrent(): Promise<RoutePoint | null>;
  getLastKnown(maxAgeMs: number): Promise<RoutePoint | null>;
  // Foreground updates before recording (Ruta open, not recording): 'balanced'
  // for a quick first fix, then 'high'. Returns the stop function.
  watchForeground(
    accuracy: 'balanced' | 'high',
    onFix: (fix: RoutePoint) => void,
  ): Promise<() => void>;
  startUpdates(): Promise<void>;
  stopUpdates(): Promise<void>;
  isUpdating(): Promise<boolean>;
};

// Values chosen for walking/running/cycling recordings:
//  - BestForNavigation: the best GPS the phone has (it is a fitness app);
//  - distanceInterval 5 m: a fix every ~5 m keeps the track light (a 3 h
//    outing stays far below the server's 50 000 points) and saves battery;
//  - Fitness activity type, and iOS must not pause updates by itself (the
//    app pauses on its own, see routeTracker auto-pause);
//  - the blue indicator is shown while recording in the background.
export const UPDATE_OPTIONS = {
  distanceInterval: 5,
  showsBackgroundLocationIndicator: true,
  pausesUpdatesAutomatically: false,
} as const;

function location() {
  return require('expo-location') as typeof import('expo-location');
}

function snapshot(response: {
  status: string;
  canAskAgain: boolean;
  ios?: { accuracy: 'full' | 'reduced' };
}): PermissionSnapshot {
  return {
    status: response.status === 'granted' ? 'granted' : response.status === 'denied' ? 'denied' : 'undetermined',
    canAskAgain: response.canAskAgain,
    precise: response.ios?.accuracy !== 'reduced',
  };
}

export const expoLocationApi: LocationApi = {
  async getPermissions() {
    return snapshot(await location().getForegroundPermissionsAsync());
  },
  async requestPermissions() {
    return snapshot(await location().requestForegroundPermissionsAsync());
  },
  servicesEnabled() {
    return location().hasServicesEnabledAsync();
  },
  async getCurrent() {
    const Location = location();
    try {
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      return toRoutePoint(current);
    } catch {
      const last = await Location.getLastKnownPositionAsync({});
      return last ? toRoutePoint(last) : null;
    }
  },
  async getLastKnown(maxAgeMs) {
    const last = await location().getLastKnownPositionAsync({ maxAge: maxAgeMs });
    return last ? toRoutePoint(last) : null;
  },
  async watchForeground(accuracy, onFix) {
    const Location = location();
    const subscription = await Location.watchPositionAsync(
      {
        accuracy: accuracy === 'balanced' ? Location.Accuracy.Balanced : Location.Accuracy.High,
        distanceInterval: 0,
        timeInterval: 1000,
      },
      position => onFix(toRoutePoint(position)),
    );
    return () => subscription.remove();
  },
  async startUpdates() {
    const Location = location();
    await Location.startLocationUpdatesAsync(LOCATION_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      activityType: Location.ActivityType.Fitness,
      ...UPDATE_OPTIONS,
    });
  },
  async stopUpdates() {
    const Location = location();
    if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    }
  },
  isUpdating() {
    return location().hasStartedLocationUpdatesAsync(LOCATION_TASK);
  },
};
