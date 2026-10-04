import { StackActions } from '@react-navigation/native';
import { waitForApp } from '@app/dev/devWorkoutsScreens';
import { navigationRef } from '@app/navigation/navigationRef';

// Development only: each Progreso screen and state. States that the test
// account cannot reach naturally (with data, loading, error) use sample data
// or a forced state: nothing is read or written. Used by the dev menu ("Ver
// pantallas de Progreso") and athelete://dev/progress?screen=<key>.
export const PROGRESS_DEV_SCREENS = [
  { key: 'summary', label: 'Resumen · datos reales (PROGRESS_01)' },
  { key: 'data', label: 'Resumen · semana con datos de ejemplo' },
  { key: 'month', label: 'Resumen · mes con datos de ejemplo (PROGRESS_02)' },
  { key: 'empty', label: 'Resumen · usuario nuevo (PROGRESS_04)' },
  { key: 'loading', label: 'Resumen · cargando (STATE_03)' },
  { key: 'error', label: 'Resumen · error con reintento' },
  { key: 'retos', label: 'Retos (PROGRESS_03)' },
  { key: 'records', label: 'Récords · lista' },
  { key: 'recordDetail', label: 'Récord personal (RECORDS_01)' },
  { key: 'recordSheet', label: 'Registrar récord (RECORDS_02)' },
  {
    key: 'recordCelebration',
    label: 'Nuevo récord · celebración (OVERLAY_01)',
  },
  { key: 'recordsEmpty', label: 'Récords · vacío' },
  { key: 'recordsLoading', label: 'Récords · cargando' },
  { key: 'recordsError', label: 'Récords · error con reintento' },
  { key: 'achievements', label: 'Logros (ACHIEVEMENTS_01)' },
  { key: 'achievementSheet', label: 'Detalle de logro (ACHIEVEMENTS_02)' },
  {
    key: 'achievementLocked',
    label: 'Detalle de logro bloqueado con progreso',
  },
  { key: 'achievementsEmpty', label: 'Logros · sin medallas (cuenta real)' },
  { key: 'achievementsLoading', label: 'Logros · cargando' },
  { key: 'achievementsError', label: 'Logros · error con reintento' },
] as const;

export type ProgressDevScreen = (typeof PROGRESS_DEV_SCREENS)[number]['key'];

export function isProgressDevScreen(
  value: string | null,
): value is ProgressDevScreen {
  return PROGRESS_DEV_SCREENS.some(screen => screen.key === value);
}

export async function openProgressDevScreen(
  screen: ProgressDevScreen,
  options: { scroll?: number } = {},
): Promise<boolean> {
  if (!__DEV__ || !(await waitForApp())) {
    return false;
  }
  const nav = navigationRef;
  const tab = (params: object) =>
    nav.navigate('MainTabs', {
      screen: 'Progress',
      params: { ...params, devScroll: options.scroll },
    });
  // Stack screens are pushed so each state opens fresh.
  const push = (name: string, params?: object) =>
    nav.dispatch(StackActions.push(name as never, params as never));

  switch (screen) {
    case 'summary':
      tab({ segment: 'summary', period: 'week', devState: undefined });
      return true;
    case 'data':
      tab({ segment: 'summary', period: 'week', devState: 'data' });
      return true;
    case 'month':
      tab({ segment: 'summary', period: 'month', devState: 'data' });
      return true;
    case 'empty':
      tab({ segment: 'summary', period: 'week', devState: 'empty' });
      return true;
    case 'loading':
      tab({ segment: 'summary', period: 'week', devState: 'loading' });
      return true;
    case 'error':
      tab({ segment: 'summary', period: 'week', devState: 'error' });
      return true;
    case 'retos':
      tab({ segment: 'challenges', devState: 'data' });
      return true;
    case 'records':
      push('PersonalRecords', { devState: 'data' });
      return true;
    case 'recordCelebration':
      push('PersonalRecords', {
        exerciseId: 'rdl',
        exerciseName: 'Peso muerto rumano',
        devState: 'data',
        devCelebration: true,
      });
      return true;
    case 'recordsLoading':
      push('PersonalRecords', { devState: 'loading' });
      return true;
    case 'recordsError':
      push('PersonalRecords', { devState: 'error' });
      return true;
    case 'achievementsLoading':
      push('Achievements', { devState: 'loading' });
      return true;
    case 'achievementsError':
      push('Achievements', { devState: 'error' });
      return true;
    case 'recordsEmpty':
      push('PersonalRecords', { devState: 'empty' });
      return true;
    case 'recordDetail':
      push('PersonalRecords', {
        exerciseId: 'rdl',
        exerciseName: 'Peso muerto rumano',
        devState: 'data',
      });
      return true;
    case 'recordSheet':
      push('PersonalRecords', {
        exerciseId: 'rdl',
        exerciseName: 'Peso muerto rumano',
        devState: 'data',
        devSheet: true,
      });
      return true;
    case 'achievements':
      push('Achievements', { devState: 'data' });
      return true;
    case 'achievementLocked':
      push('Achievements', { devState: 'data', devSheet: 'locked' });
      return true;
    case 'achievementsEmpty':
      push('Achievements', {});
      return true;
    case 'achievementSheet':
      push('Achievements', { devState: 'data', devSheet: true });
      return true;
  }
}

let cursor = -1;

export async function openNextProgressDevScreen(): Promise<string | null> {
  cursor = (cursor + 1) % PROGRESS_DEV_SCREENS.length;
  const target = PROGRESS_DEV_SCREENS[cursor];
  return (await openProgressDevScreen(target.key)) ? target.label : null;
}
