import { StackActions } from '@react-navigation/native';
import { waitForApp } from '@app/dev/devWorkoutsScreens';
import { navigationRef } from '@app/navigation/navigationRef';

// Development only: each Nutrición screen and state with sample data:
// nothing is read or written. Used by the dev menu ("Ver pantallas de
// Nutrición") and athelete://dev/nutrition?screen=<key>.
const SCREENS = [
  { key: 'real', label: 'Nutrición · datos reales', params: undefined },
  { key: 'plan', label: 'Con plan · macros y agua (NUTRI_02)', params: { devState: 'plan' } },
  { key: 'goalMet', label: 'Con plan · objetivos cumplidos', params: { devState: 'goalMet' } },
  { key: 'noPlan', label: 'Sin plan (NUTRI_01)', params: { devState: 'noPlan' } },
  { key: 'empty', label: 'Sin plan y sin registros', params: { devState: 'empty' } },
  { key: 'loading', label: 'Cargando', params: { devState: 'loading' } },
  { key: 'error', label: 'Error con reintento', params: { devState: 'error' } },
  { key: 'sheet', label: 'Registrar nutrición · hoja (NUTRI_03)', params: { devState: 'plan', devSheet: 'log' } },
  { key: 'sheetNoPlan', label: 'Registrar nutrición · sin plan', params: { devState: 'noPlan', devSheet: 'log' } },
  { key: 'sheetSaving', label: 'Registrar nutrición · guardando', params: { devState: 'plan', devSheet: 'logSaving' } },
  { key: 'sheetError', label: 'Registrar nutrición · error al guardar', params: { devState: 'plan', devSheet: 'logError' } },
] as const;

export const NUTRITION_DEV_SCREENS = SCREENS;
export type NutritionDevScreen = (typeof SCREENS)[number]['key'];

export function isNutritionDevScreen(value: string | null): value is NutritionDevScreen {
  return SCREENS.some(screen => screen.key === value);
}

export async function openNutritionDevScreen(key: NutritionDevScreen): Promise<boolean> {
  if (!__DEV__ || !(await waitForApp())) {
    return false;
  }
  const target = SCREENS.find(screen => screen.key === key);
  if (!target) {
    return false;
  }
  navigationRef.dispatch(
    StackActions.push('NutritionPlan' as never, target.params as never),
  );
  return true;
}

let cursor = -1;

export async function openNextNutritionDevScreen(): Promise<string | null> {
  cursor = (cursor + 1) % SCREENS.length;
  const target = SCREENS[cursor];
  return (await openNutritionDevScreen(target.key)) ? target.label : null;
}
