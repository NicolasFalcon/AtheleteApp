import { useSyncExternalStore } from 'react';
import { HOME_MODES, type HomeMode } from '@app/features/home/homePriority';

// Development-only visual override for the Inicio hero ("Ver modos de
// Inicio" in the dev menu). In-memory, never persisted, never writes data.
// In production builds `useHomeModeOverride` always returns null.

let override: HomeMode | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return override;
}

// auto → new → allDone → workoutDone → resume → core33 → workout → auto
export function cycleHomeModeOverride(): HomeMode | null {
  if (!__DEV__) {
    return null;
  }

  const index = override === null ? -1 : HOME_MODES.indexOf(override);
  override = index + 1 < HOME_MODES.length ? HOME_MODES[index + 1] : null;
  listeners.forEach(listener => listener());
  return override;
}

export function useHomeModeOverride(): HomeMode | null {
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return __DEV__ ? value : null;
}

export const HOME_MODE_LABELS: Record<HomeMode, string> = {
  new: 'Usuario nuevo',
  allDone: 'Todo completado',
  workoutDone: 'Entreno hecho',
  resume: 'Sesión guardada',
  core33: 'Core 33 prioridad',
  workout: 'Entreno pendiente',
};
