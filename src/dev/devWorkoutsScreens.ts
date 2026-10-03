import { navigationRef } from '@app/navigation/navigationRef';
import {
  fetchExerciseLibraryPage,
  fetchWorkoutLibraryPage,
} from '@app/services/supabase/fitness';

// Development only: open each Entrenos screen with real data (first library
// routine / first chest-cable exercise). Used by the dev menu ("Ver
// pantallas de Entrenos") and athelete://dev/workouts?screen=<key>.
export const WORKOUTS_DEV_SCREENS = [
  { key: 'routines', label: 'Rutinas (WORKOUTS_01)' },
  {
    key: 'favorites',
    label: 'Rutinas · solo favoritos (WORKOUTS_02 / STATE_06)',
  },
  { key: 'exercises', label: 'Ejercicios (WORKOUTS_03)' },
  { key: 'list', label: 'Lista filtrada · Pecho + Cable (WORKOUTS_04)' },
  { key: 'filters', label: 'Filtros (WORKOUTS_05)' },
  { key: 'detail', label: 'Detalle de rutina (WORKOUTS_06)' },
  { key: 'create1', label: 'Nueva rutina · paso 1 (WORKOUTS_07_01)' },
  { key: 'create2', label: 'Nueva rutina · paso 2 (WORKOUTS_07_02)' },
  { key: 'create3', label: 'Nueva rutina · paso 3 (WORKOUTS_07_03)' },
  { key: 'exercise', label: 'Exercise Detail (EXERCISE_01)' },
  {
    key: 'fullscreen',
    label: 'Exercise Detail · pantalla completa (EXERCISE_02)',
  },
] as const;

export type WorkoutsDevScreen = (typeof WORKOUTS_DEV_SCREENS)[number]['key'];

export function isWorkoutsDevScreen(
  value: string | null,
): value is WorkoutsDevScreen {
  return WORKOUTS_DEV_SCREENS.some(screen => screen.key === value);
}

async function firstRoutineId(): Promise<string | null> {
  const page = await fetchWorkoutLibraryPage({
    source: 'library',
    type: 'all',
    search: '',
    favoriteIds: null,
    page: 0,
    pageSize: 1,
  });
  return page.items[0]?.id ?? null;
}

async function firstExerciseId(): Promise<string | null> {
  const page = await fetchExerciseLibraryPage({
    search: '',
    equipment: 'cable',
    bodyPart: 'chest',
    level: 'all',
    favoriteIds: null,
    page: 0,
    pageSize: 1,
  });
  if (page.items[0]) {
    return page.items[0].id;
  }
  const any = await fetchExerciseLibraryPage({
    search: '',
    equipment: 'all',
    bodyPart: 'all',
    level: 'all',
    favoriteIds: null,
    page: 0,
    pageSize: 1,
  });
  return any.items[0]?.id ?? null;
}

function inApp(): boolean {
  if (!navigationRef.isReady()) {
    return false;
  }
  const state = navigationRef.getRootState();
  return Boolean(state?.routeNames?.includes('MainTabs'));
}

// Waits until the signed-in app flow is mounted (launch arguments arrive
// before the session is restored).
export async function waitForApp(timeoutMs = 20000): Promise<boolean> {
  const started = Date.now();
  while (!inApp()) {
    if (Date.now() - started > timeoutMs) {
      return false;
    }
    await new Promise<void>(resolve => setTimeout(() => resolve(), 400));
  }
  return true;
}

export async function openWorkoutsDevScreen(
  screen: WorkoutsDevScreen,
): Promise<boolean> {
  if (!__DEV__ || !(await waitForApp())) {
    return false;
  }
  const nav = navigationRef;

  switch (screen) {
    case 'routines':
    case 'favorites':
    case 'exercises':
      nav.navigate('MainTabs', {
        screen: 'Workouts',
        params: {
          segment: screen === 'exercises' ? 'exercises' : 'routines',
          favoritesOnly: screen === 'favorites',
        },
      });
      return true;
    case 'list':
    case 'filters':
      nav.navigate('ExerciseList', {
        zone: 'chest',
        equipment: 'cable',
        openFilters: screen === 'filters',
      });
      return true;
    case 'detail': {
      const workoutId = await firstRoutineId();
      if (workoutId) {
        nav.navigate('WorkoutDetail', { workoutId });
      }
      return Boolean(workoutId);
    }
    case 'create1':
    case 'create2':
    case 'create3':
      nav.navigate('CreateRoutine', {
        devStep: screen === 'create1' ? 0 : screen === 'create2' ? 1 : 2,
      });
      return true;
    case 'exercise':
    case 'fullscreen': {
      const exerciseId = await firstExerciseId();
      if (exerciseId) {
        nav.navigate('ExerciseDetail', {
          exerciseId,
          fullscreen: screen === 'fullscreen',
        });
      }
      return Boolean(exerciseId);
    }
  }
}

let cursor = -1;

// Dev menu: cycles through the screens in order.
export async function openNextWorkoutsDevScreen(): Promise<string | null> {
  cursor = (cursor + 1) % WORKOUTS_DEV_SCREENS.length;
  const target = WORKOUTS_DEV_SCREENS[cursor];
  const ok = await openWorkoutsDevScreen(target.key);
  return ok ? target.label : null;
}
