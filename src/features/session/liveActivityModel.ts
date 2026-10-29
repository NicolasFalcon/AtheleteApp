import { planScheme, type PlannedExercise, type RestKind } from '@app/features/session/sessionModel';
import type { LiveActivityState } from '@app/lib/liveActivity';

// What the workout Live Activity shows, from the session's state. Pure.

export type LiveActivityInput = {
  rest: { kind: RestKind; remainingMs: number; phase: string } | null;
  paused: boolean;
  // Exercise in play: the next one during a rest.
  current: PlannedExercise | null;
  setIndex: number;
  doneCount: number;
  total: number;
};

export function liveActivityState(input: LiveActivityInput, now: number): LiveActivityState {
  const resting = Boolean(input.rest && input.rest.phase !== 'go' && input.rest.remainingMs > 0);
  const remainingMs = input.rest?.remainingMs ?? 0;
  const current = input.current;
  const scheme = !current
    ? ''
    : resting && input.rest?.kind === 'set'
    ? `Serie ${input.setIndex + 1} de ${current.sets}`
    : planScheme(current);

  return {
    phase: resting ? 'rest' : current ? 'exercise' : 'done',
    // Whole seconds, so the ticks of the session clock do not change it.
    restEndsAt: resting && !input.paused ? Math.round((now + remainingMs) / 1000) * 1000 : null,
    paused: input.paused,
    pausedRemainingSec: resting && input.paused ? Math.ceil(remainingMs / 1000) : null,
    exerciseName: current?.name ?? '',
    scheme,
    progress: `${input.doneCount} de ${input.total} ejercicios`,
  };
}

// Same key = nothing to send to ActivityKit.
export function liveActivityKey(state: LiveActivityState): string {
  return JSON.stringify(state);
}

// Local notification at the end of a running rest (shown only with the app
// in the background): "¡Vamos! · Siguiente: Círculos de brazos".
export function restEndNotification(
  state: LiveActivityState,
): { fireAt: Date; title: string; body: string } | null {
  if (state.phase !== 'rest' || state.paused || state.restEndsAt === null) {
    return null;
  }
  return {
    fireAt: new Date(state.restEndsAt),
    title: '¡Vamos!',
    body: state.exerciseName
      ? `Siguiente: ${state.exerciseName}${state.scheme ? ` · ${state.scheme}` : ''}`
      : 'Se acabó el descanso.',
  };
}
