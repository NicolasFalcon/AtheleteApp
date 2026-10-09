import { useSyncExternalStore } from 'react';
import { Platform, Settings } from 'react-native';
import type { Core33InviteVariant } from '@app/features/core33/core33Invite';
import type { HomeMode, HomeSlideKind } from '@app/features/home/homePriority';

// Development-only visual override for Inicio ("Ver modos de Inicio" in the
// dev menu): hero mode + Core 33 discovery card. In-memory, never persisted,
// never writes data. In production builds `useHomeModeOverride` returns null.

export type HomeOverride = {
  mode: HomeMode;
  // Slides of the hero carousel for this override.
  slides: HomeSlideKind[];
  // Card forced by the override (null = hidden), ignoring "Ahora no".
  core33Card: Core33InviteVariant | null;
  label: string;
};

const OVERRIDES: HomeOverride[] = [
  { mode: 'new', slides: ['new'], core33Card: null, label: 'Usuario nuevo' },
  {
    mode: 'new',
    slides: ['new'],
    core33Card: 'invite',
    label: 'Usuario nuevo + Core 33 invitación',
  },
  { mode: 'allDone', slides: ['allDone'], core33Card: null, label: 'Todo completado' },
  {
    mode: 'workoutDone',
    slides: ['core33', 'workoutDone'],
    core33Card: null,
    label: 'Entreno hecho + Core 33 pendiente (2)',
  },
  { mode: 'resume', slides: ['resume'], core33Card: null, label: 'Sesión guardada' },
  { mode: 'core33', slides: ['core33'], core33Card: null, label: 'Core 33 prioridad' },
  { mode: 'workout', slides: ['workout'], core33Card: null, label: 'Entreno pendiente' },
  {
    mode: 'workout',
    slides: ['workout'],
    core33Card: 'again',
    label: 'Entreno pendiente + empezar otro Core 33',
  },
  {
    mode: 'workout',
    slides: ['workout', 'core33'],
    core33Card: null,
    label: 'Entreno + Core 33 (2)',
  },
  {
    mode: 'resume',
    slides: ['resume', 'core33', 'workoutDone'],
    core33Card: null,
    label: 'Retomar + Core 33 + Entreno hecho (3, uno cerrado)',
  },
  {
    mode: 'workout',
    slides: ['workout', 'core33Closed'],
    core33Card: null,
    label: 'Entreno + Core 33 cerrado (2, uno cerrado)',
  },
];

// -1 = real data. iOS dev launch argument to start on an override (for
// screenshots): xcrun simctl launch booted <bundle> -homeOverride 1
function initialIndex(): number {
  if (!__DEV__ || Platform.OS !== 'ios') {
    return -1;
  }
  const value = Number(Settings.get('homeOverride'));
  return Number.isInteger(value) && value >= 0 && value < OVERRIDES.length
    ? value
    : -1;
}

let index = initialIndex();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): HomeOverride | null {
  return index >= 0 ? OVERRIDES[index] : null;
}

// auto → each override in order → auto
export function cycleHomeModeOverride(): HomeOverride | null {
  if (!__DEV__) {
    return null;
  }

  index = index + 1 < OVERRIDES.length ? index + 1 : -1;
  listeners.forEach(listener => listener());
  return getSnapshot();
}

export function useHomeModeOverride(): HomeOverride | null {
  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return __DEV__ ? value : null;
}

// iOS dev launch argument to open Inicio already scrolled (for screenshots of
// the sections under the hero): `-homeScroll 900`. 0 in production builds.
export function devHomeScroll(): number {
  if (!__DEV__ || Platform.OS !== 'ios') {
    return 0;
  }
  const value = Number(Settings.get('homeScroll'));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

// iOS dev launch argument to open the hero carousel on a slide (for
// screenshots): `-homeSlide 1`. 0 in production builds.
export function devHomeSlide(): number {
  if (!__DEV__ || Platform.OS !== 'ios') {
    return 0;
  }
  const value = Number(Settings.get('homeSlide'));
  return Number.isInteger(value) && value > 0 ? value : 0;
}
