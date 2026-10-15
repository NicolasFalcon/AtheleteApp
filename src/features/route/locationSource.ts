import type { RoutePoint } from '@app/features/route/routeTypes';

// Where positions come from. The screens only know this interface; the real
// implementation (expo-location) is `RealLocationSource`.

// 'restricted': location services are off or restricted on this iPhone (iOS
// reports both as "denied, cannot ask again"), so it needs Ajustes too.
export type LocationPermission = 'undetermined' | 'granted' | 'denied' | 'restricted';

export type LocationAccess = {
  permission: LocationPermission;
  // iOS "Ubicación precisa". false = approximate location only: a recording
  // would be kilometres off, so Ruta blocks it.
  precise: boolean;
};

// Things that happen to the source while it is being watched.
export type LocationSourceEvent =
  // The person took the permission away (or switched services off) mid-route.
  | { type: 'permission_revoked' }
  // The platform is alive and has a recent fix, even if no new fix was
  // delivered (the distance filter is silent while standing still).
  | { type: 'alive'; t: number };

export interface LocationSource {
  getAccess(): Promise<LocationAccess>;
  // Shows the system dialog when it is still undetermined; otherwise it just
  // reads the state again (iOS never asks twice).
  requestAccess(): Promise<LocationAccess>;
  // One fix for "GPS listo ± N m"; the last known one if there is no fresh
  // fix; null when there is none at all.
  getCurrent(): Promise<RoutePoint | null>;
  // Starts delivering fixes (also with the screen off); returns the stop
  // function, which also stops the platform updates (battery).
  watch(onFix: (fix: RoutePoint) => void, onEvent?: (event: LocationSourceEvent) => void): () => void;
  // The clock of the source (ms).
  now(): number;
}
