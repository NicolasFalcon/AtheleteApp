import { useSyncExternalStore } from 'react';

// Development only: shows the "tu ruta real" state of the Inicio Route card
// with a sample activity (athelete://dev/route?screen=homeCardActive). In
// memory, never persisted. In production builds the hook always returns false.
// TODO(route-wire): the real card reads today's activity from the RouteService.
let active = false;
const listeners = new Set<() => void>();

export function setHomeRouteScenario(next: boolean) {
  if (!__DEV__) {
    return;
  }
  active = next;
  listeners.forEach(listener => listener());
}

export function useHomeRouteScenario(): boolean {
  const value = useSyncExternalStore(
    listener => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => active,
  );
  return __DEV__ ? value : false;
}
