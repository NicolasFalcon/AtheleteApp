import { StackActions } from '@react-navigation/native';
import { waitForApp } from '@app/dev/devWorkoutsScreens';
import { navigationRef } from '@app/navigation/navigationRef';

// Development only: each Core 33 screen and state with sample data: nothing
// is read or written. Used by the dev menu ("Ver pantallas de Core 33") and
// athelete://dev/core33?screen=<key>.
const SCREENS = [
  { key: 'intro1', label: 'Intro · 33 días (CORE33_01)', route: 'Core33Intro', params: { devStep: 0 } },
  { key: 'intro2', label: 'Intro · Constancia, no perfección', route: 'Core33Intro', params: { devStep: 1 } },
  { key: 'intro3', label: 'Intro · Tu progreso queda visible', route: 'Core33Intro', params: { devStep: 2 } },
  { key: 'explore', label: 'Explorar retos (CORE33_02)', route: 'Core33Explore', params: undefined },
  { key: 'detail', label: 'Detalle · Construye fuerza (CORE33_03)', route: 'Core33Detail', params: { challengeId: 'fuerza' } },
  { key: 'detailRecovery', label: 'Detalle · Recupera mejor', route: 'Core33Detail', params: { challengeId: 'recuperacion' } },
  { key: 'ready', label: 'Tu Core 33 está listo (CORE33_04)', route: 'Core33Ready', params: { challengeId: 'fuerza' } },
  { key: 'starting', label: 'Listo · empezando', route: 'Core33Ready', params: { challengeId: 'fuerza', devStarting: true } },
  { key: 'readyActive', label: 'Listo · ya hay un reto activo', route: 'Core33Ready', params: { challengeId: 'fuerza', devAlreadyActive: true } },
  { key: 'day1', label: 'Día 1', route: 'Core33', params: { devState: 'day1' } },
  { key: 'day17', label: 'Día 17 (CORE33_05)', route: 'Core33', params: { devState: 'day17' } },
  { key: 'missed', label: 'Día 10 con días perdidos', route: 'Core33', params: { devState: 'missed' } },
  { key: 'day33', label: 'Día 33 · último día', route: 'Core33', params: { devState: 'day33' } },
  { key: 'completed', label: 'Reto completado (CORE33_06)', route: 'Core33', params: { devState: 'completed' } },
  { key: 'celebration', label: 'Celebración (OVERLAY_01)', route: 'Core33', params: { devState: 'celebration' } },
  { key: 'none', label: 'Sin reto activo', route: 'Core33', params: { devState: 'none' } },
  { key: 'loading', label: 'Cargando', route: 'Core33', params: { devState: 'loading' } },
  { key: 'error', label: 'Error con reintento', route: 'Core33', params: { devState: 'error' } },
] as const;

export const CORE33_DEV_SCREENS = SCREENS;
export type Core33DevScreen = (typeof SCREENS)[number]['key'];

export function isCore33DevScreen(value: string | null): value is Core33DevScreen {
  return SCREENS.some(screen => screen.key === value);
}

export async function openCore33DevScreen(key: Core33DevScreen): Promise<boolean> {
  if (!__DEV__ || !(await waitForApp())) {
    return false;
  }
  const target = SCREENS.find(screen => screen.key === key);
  if (!target) {
    return false;
  }
  navigationRef.dispatch(
    StackActions.push(target.route as never, target.params as never),
  );
  return true;
}

let cursor = -1;

export async function openNextCore33DevScreen(): Promise<string | null> {
  cursor = (cursor + 1) % SCREENS.length;
  const target = SCREENS[cursor];
  return (await openCore33DevScreen(target.key)) ? target.label : null;
}
