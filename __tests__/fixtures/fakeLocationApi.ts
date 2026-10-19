import type { LocationApi, PermissionSnapshot } from '../../src/features/route/expoLocationApi';
import type { RoutePoint } from '../../src/features/route/routeTypes';

// A scriptable stand-in for the expo-location wrapper (tests only).
export type FakeLocationApi = LocationApi & {
  permission: PermissionSnapshot;
  services: boolean;
  current: RoutePoint | null;
  lastKnown: RoutePoint | null;
  updating: boolean;
  startCalls: number;
  stopCalls: number;
};

export function createFakeLocationApi(overrides: Partial<FakeLocationApi> = {}): FakeLocationApi {
  const api: FakeLocationApi = {
    permission: { status: 'granted', canAskAgain: true, precise: true },
    services: true,
    current: { lat: 10, lon: 20, t: 1_000, accuracy: 5 },
    lastKnown: null,
    updating: false,
    startCalls: 0,
    stopCalls: 0,
    async getPermissions() {
      return api.permission;
    },
    async requestPermissions() {
      api.permission = { ...api.permission, status: 'granted', canAskAgain: true };
      return api.permission;
    },
    async servicesEnabled() {
      return api.services;
    },
    async getCurrent() {
      return api.current;
    },
    async getLastKnown() {
      return api.lastKnown;
    },
    async watchForeground() {
      return () => undefined;
    },
    async startUpdates() {
      api.startCalls += 1;
      api.updating = true;
    },
    async stopUpdates() {
      api.stopCalls += 1;
      api.updating = false;
    },
    async isUpdating() {
      return api.updating;
    },
    ...overrides,
  };
  return api;
}
