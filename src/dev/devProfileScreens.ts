import { StackActions } from '@react-navigation/native';
import { waitForApp } from '@app/dev/devWorkoutsScreens';
import { navigationRef } from '@app/navigation/navigationRef';

// Development only: each Perfil / Ajustes screen and state with sample data:
// nothing is read or written. Used by the dev menu ("Ver pantallas de
// Perfil") and athelete://dev/profile?screen=<key>.
const SCREENS = [
  { key: 'profile', label: 'Perfil · datos reales (PROFILE_01)', route: 'Profile', params: undefined },
  { key: 'profileData', label: 'Perfil · con datos de ejemplo', route: 'Profile', params: { devState: 'data' } },
  { key: 'profileNew', label: 'Perfil · sin datos de onboarding', route: 'Profile', params: { devState: 'new' } },
  { key: 'profileLoading', label: 'Perfil · cargando', route: 'Profile', params: { devState: 'loading' } },
  { key: 'profileError', label: 'Perfil · error con reintento', route: 'Profile', params: { devState: 'error' } },
  { key: 'edit', label: 'Editar perfil · datos reales (PROFILE_02)', route: 'EditProfile', params: undefined },
  { key: 'editData', label: 'Editar perfil · datos de ejemplo', route: 'EditProfile', params: { devState: 'data' } },
  { key: 'editInvalid', label: 'Editar perfil · valores no válidos', route: 'EditProfile', params: { devState: 'invalid' } },
  { key: 'editSaving', label: 'Editar perfil · guardando', route: 'EditProfile', params: { devState: 'saving' } },
  { key: 'editSaved', label: 'Editar perfil · guardado', route: 'EditProfile', params: { devState: 'saved' } },
  { key: 'editError', label: 'Editar perfil · error al guardar', route: 'EditProfile', params: { devState: 'error' } },
  { key: 'editNew', label: 'Editar perfil · sin datos de onboarding', route: 'EditProfile', params: { devState: 'new' } },
  { key: 'settings', label: 'Ajustes · datos reales (PROFILE_03)', route: 'Settings', params: undefined },
  { key: 'settingsData', label: 'Ajustes · datos de ejemplo', route: 'Settings', params: { devState: 'data' } },
  { key: 'health', label: 'Apple Health · sin conectar (HEALTH_02)', route: 'HealthSettings', params: undefined },
  { key: 'healthOn', label: 'Apple Health · configurado (HEALTH_03)', route: 'HealthSettings', params: { devConnected: true } },
] as const;

export const PROFILE_DEV_SCREENS = SCREENS;
export type ProfileDevScreen = (typeof SCREENS)[number]['key'];

export function isProfileDevScreen(value: string | null): value is ProfileDevScreen {
  return SCREENS.some(screen => screen.key === value);
}

export async function openProfileDevScreen(key: ProfileDevScreen): Promise<boolean> {
  if (!__DEV__ || !(await waitForApp())) {
    return false;
  }
  const target = SCREENS.find(screen => screen.key === key);
  if (!target) {
    return false;
  }
  navigationRef.dispatch(StackActions.push(target.route as never, target.params as never));
  return true;
}

let cursor = -1;

export async function openNextProfileDevScreen(): Promise<string | null> {
  cursor = (cursor + 1) % SCREENS.length;
  const target = SCREENS[cursor];
  return (await openProfileDevScreen(target.key)) ? target.label : null;
}
