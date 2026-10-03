import { StackActions } from '@react-navigation/native';
import type { DevSessionState } from '@app/features/session/useSessionRunner';
import { navigationRef } from '@app/navigation/navigationRef';
import { firstRoutineId, waitForApp } from '@app/dev/devWorkoutsScreens';
import { getSupabaseClient } from '@app/services/supabase/client';

// Development only: each Workout Session state with a real routine and
// nothing written (devState), plus the summary of the user's latest
// completed session (read-only). athelete://dev/session?screen=<key>
export const SESSION_DEV_SCREENS = [
  { key: 'active', label: 'Sesión activa (SESSION_01)' },
  { key: 'paused', label: 'En pausa (SESSION_02)' },
  { key: 'menu', label: 'Menú … (SESSION_03)' },
  { key: 'restExercise', label: 'Descanso · ejercicio (SESSION_03)' },
  { key: 'restSet', label: 'Descanso · serie (SESSION_04)' },
  { key: 'restEnd', label: 'Tu turno (SESSION_05)' },
  { key: 'exit', label: 'Salir del entreno (SESSION_06)' },
  { key: 'allDone', label: 'Todo hecho · Finalizar' },
  { key: 'error', label: 'Error al guardar (STATE_09)' },
  { key: 'summary', label: 'Resumen · última sesión o vista previa (SESSION_07)' },
  { key: 'summaryPreview', label: 'Resumen · vista previa (SESSION_07)' },
] as const;

export type SessionDevScreen = (typeof SESSION_DEV_SCREENS)[number]['key'];

export function isSessionDevScreen(
  value: string | null,
): value is SessionDevScreen {
  return SESSION_DEV_SCREENS.some(screen => screen.key === value);
}

// The prototype's routine when it exists, otherwise the first one.
async function sessionRoutineId(): Promise<string | null> {
  const client = getSupabaseClient();
  if (client) {
    const { data } = await client
      .from('workout_templates')
      .select('id')
      .ilike('title', 'Total Body Dumbbell%')
      .limit(1);
    if (data?.[0]?.id) {
      return data[0].id as string;
    }
  }
  return firstRoutineId();
}

async function latestCompletedSessionId(): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }
  const { data } = await client
    .from('workout_sessions')
    .select('id')
    .eq('status', 'completed')
    .order('ended_at', { ascending: false, nullsFirst: false })
    .limit(1);
  return (data?.[0]?.id as string | undefined) ?? null;
}

export async function openSessionDevScreen(
  screen: SessionDevScreen,
): Promise<boolean> {
  if (!__DEV__ || !(await waitForApp())) {
    return false;
  }
  if (screen === 'summaryPreview') {
    navigationRef.dispatch(
      StackActions.push('WorkoutSummary', { sessionId: 'dev', devPreview: true }),
    );
    return true;
  }
  if (screen === 'summary') {
    // Latest completed session; without one, the sample preview.
    const sessionId = await latestCompletedSessionId();
    navigationRef.dispatch(
      StackActions.push(
        'WorkoutSummary',
        sessionId ? { sessionId } : { sessionId: 'dev', devPreview: true },
      ),
    );
    return true;
  }
  const workoutId = await sessionRoutineId();
  if (workoutId) {
    // Push: every state is a fresh screen (menu / dialog open on mount).
    navigationRef.dispatch(
      StackActions.push('WorkoutSession', {
        workoutId,
        devState: screen as DevSessionState,
      }),
    );
  }
  return Boolean(workoutId);
}

let cursor = -1;

export async function openNextSessionDevScreen(): Promise<string | null> {
  cursor = (cursor + 1) % SESSION_DEV_SCREENS.length;
  const target = SESSION_DEV_SCREENS[cursor];
  return (await openSessionDevScreen(target.key)) ? target.label : null;
}
