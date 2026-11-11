import { setsFor, type LoggedSet, type PlannedExercise, type RestKind } from '@app/features/session/sessionModel';
import { activePlan } from '@app/features/session/sessionModel';
import type {
  LiveActivityButton,
  LiveActivityButtonAction,
  LiveActivityLabels,
  LiveActivityState,
} from '@app/lib/liveActivity';

// What the workout Live Activity shows, from the session's state. Pure.
//
// Three situations (and "paused"):
//   rest      the countdown, "Siguiente: …" and a "Saltar" button;
//   exercise  the set in course ("Ahora"): "Serie 2 de 3 · 10 reps × 40 kg"
//             and "Serie hecha ✓" (or, without a weight to log,
//             "Elige tu peso en la app" with a link to the app);
//   done      "Sesión completa · Abre la app para terminar".
// Every string is written here (ES / EN) and sent to the activity as is.

export type LiveActivityLanguage = 'es' | 'en';

type Copy = {
  rest: string;
  now: string;
  paused: string;
  sessionDone: string;
  next: string;
  set: string;
  of: string;
  reps: string;
  sets: string;
  exercises: string;
  max: string;
  pausedShort: string;
  letsGo: string;
  restOver: string;
  labels: LiveActivityLabels;
  needsWeight: string;
  needsReps: string;
};

const COPY: Record<LiveActivityLanguage, Copy> = {
  es: {
    rest: 'Descanso',
    now: 'Ahora',
    paused: 'En pausa',
    sessionDone: 'Sesión completa',
    next: 'Siguiente',
    set: 'Serie',
    of: 'de',
    reps: 'reps',
    sets: 'series',
    exercises: 'ejercicios',
    max: 'máx',
    pausedShort: 'Pausa',
    letsGo: '¡Vamos!',
    restOver: 'Se acabó el descanso.',
    needsWeight: 'Elige tu peso en la app',
    needsReps: 'Elige tus reps en la app',
    labels: {
      skip: 'Saltar',
      setDone: 'Serie hecha ✓',
      chooseInApp: 'Abrir la app',
      openApp: 'Abrir la app',
      doneHint: 'Abre la app para terminar',
      pausedHint: 'Sesión en pausa',
    },
  },
  en: {
    rest: 'Rest',
    now: 'Now',
    paused: 'Paused',
    sessionDone: 'Session complete',
    next: 'Next',
    set: 'Set',
    of: 'of',
    reps: 'reps',
    sets: 'sets',
    exercises: 'exercises',
    max: 'max',
    pausedShort: 'Paused',
    letsGo: "Let's go!",
    restOver: 'Rest is over.',
    needsWeight: 'Pick your weight in the app',
    needsReps: 'Pick your reps in the app',
    labels: {
      skip: 'Skip',
      setDone: 'Set done ✓',
      chooseInApp: 'Open the app',
      openApp: 'Open the app',
      doneHint: 'Open the app to finish',
      pausedHint: 'Session paused',
    },
  },
};

export type LiveActivityInput = {
  rest: { kind: RestKind; remainingMs: number; phase: string } | null;
  paused: boolean;
  // Exercise in play: the next one during a rest.
  current: PlannedExercise | null;
  setIndex: number;
  doneCount: number;
  total: number;
  // The values the runner has loaded for the set at the cursor (the ones
  // "hecha" would save without editing anything).
  draft: { reps: number | null; weightKg: number | null };
  // The sets logged so far.
  sets: LoggedSet[];
};

// "40" · "42,5" (es) · "42.5" (en), always with " kg".
export function kgText(value: number, language: LiveActivityLanguage): string {
  const text = String(Math.round(value * 10) / 10);
  return `${language === 'es' ? text.replace('.', ',') : text} kg`;
}

// What "Serie hecha" would save, or what is missing for it.
export type SetReadiness = { ready: true } | { ready: false; needs: 'weight' | 'reps' };

// "Serie hecha" saves exactly what the card of the app would save with no
// editing (draft). It is offered only when that is a complete set:
//   · reps (and "máx") need the reps the runner loaded; seconds and metres
//     are the planned amount;
//   · the weight is the one loaded; without one, the set is still complete
//     for a timed or distance set, for a bodyweight exercise of a plan, and
//     for an exercise whose earlier set of this session was logged with no
//     weight on purpose. A calibration set or an exercise with no weight to
//     start from is not: the athlete picks it in the app.
export function setReadiness(
  exercise: PlannedExercise,
  draft: { reps: number | null; weightKg: number | null },
  sets: LoggedSet[],
): SetReadiness {
  const needsReps = exercise.unit === 'reps' || exercise.unit === 'max';
  if (needsReps && draft.reps === null) {
    return { ready: false, needs: 'reps' };
  }
  if (draft.weightKg !== null || exercise.unit === 'sec' || exercise.unit === 'm') {
    return { ready: true };
  }
  const plan = activePlan(exercise);
  if (plan) {
    return plan.calibrate ? { ready: false, needs: 'weight' } : { ready: true };
  }
  const earlier = setsFor(sets, exercise.position);
  return earlier.length > 0 && earlier.every(set => set.weightKg === null)
    ? { ready: true }
    : { ready: false, needs: 'weight' };
}

// The amount of one set: "10 reps" · "40 s" · "40 m" · "máx" / "max".
function amountText(
  exercise: PlannedExercise,
  draftReps: number | null,
  language: LiveActivityLanguage,
): string | null {
  const copy = COPY[language];
  switch (exercise.unit) {
    case 'sec':
      return exercise.amount !== null ? `${exercise.amount} s` : null;
    case 'm':
      return exercise.amount !== null ? `${exercise.amount} m` : null;
    default: {
      const reps = draftReps ?? exercise.reps;
      return reps !== null && reps !== undefined ? `${reps} ${copy.reps}` : null;
    }
  }
}

// The set in course: "Serie 2 de 3 · 10 reps × 40 kg" · bodyweight "10 reps".
// Whatever is missing is left out, never a dash.
export function setLine(
  exercise: PlannedExercise,
  setIndex: number,
  draft: { reps: number | null; weightKg: number | null },
  language: LiveActivityLanguage,
): string {
  const copy = COPY[language];
  const head = `${copy.set} ${setIndex + 1} ${copy.of} ${exercise.sets}`;
  const amount = amountText(exercise, draft.reps, language);
  const weight = draft.weightKg !== null ? kgText(draft.weightKg, language) : null;
  const tail = [amount, weight].filter(Boolean).join(' × ');
  return tail ? `${head} · ${tail}` : head;
}

// The next exercise during a rest: "3 × 10 · 40 kg" · "3 × 10" · "3 series".
// The reps are the target of the exercise, else the runner's loaded reps; the
// weight is the loaded one and is left out when there is none. Never "—".
export function exerciseLine(
  exercise: PlannedExercise,
  draft: { reps: number | null; weightKg: number | null },
  language: LiveActivityLanguage,
): string {
  const copy = COPY[language];
  let amount: string | null;
  switch (exercise.unit) {
    case 'sec':
      amount = exercise.amount !== null ? `${exercise.amount} s` : null;
      break;
    case 'm':
      amount = exercise.amount !== null ? `${exercise.amount} m` : null;
      break;
    case 'max':
      amount = copy.max;
      break;
    default: {
      const reps = exercise.amount ?? draft.reps;
      amount =
        reps === null
          ? null
          : exercise.amountMax !== null && exercise.amountMax !== reps && exercise.amount !== null
            ? `${reps}–${exercise.amountMax}`
            : String(reps);
    }
  }
  const scheme = amount ? `${exercise.sets} × ${amount}` : `${exercise.sets} ${copy.sets}`;
  const weight = draft.weightKg !== null ? kgText(draft.weightKg, language) : null;
  return weight ? `${scheme} · ${weight}` : scheme;
}

export function liveActivityState(
  input: LiveActivityInput,
  now: number,
  language: LiveActivityLanguage = 'es',
): LiveActivityState {
  const copy = COPY[language];
  const resting = Boolean(input.rest && input.rest.phase !== 'go' && input.rest.remainingMs > 0);
  const remainingMs = input.rest?.remainingMs ?? 0;
  const current = input.current;
  const phase = resting ? 'rest' : current ? 'exercise' : 'done';

  let scheme = '';
  if (current) {
    scheme =
      resting && input.rest?.kind === 'set'
        ? `${copy.set} ${input.setIndex + 1} ${copy.of} ${current.sets}`
        : resting
          ? exerciseLine(current, input.draft, language)
          : setLine(current, input.setIndex, input.draft, language);
  }

  // The set that follows, ready for when the rest ends (staleDate): can it
  // be logged without opening the app?
  const readiness: SetReadiness =
    current && !input.paused ? setReadiness(current, input.draft, input.sets) : { ready: true };
  const setAction: LiveActivityButton =
    !current || input.paused ? 'none' : readiness.ready ? 'completeSet' : 'chooseInApp';

  // What the button of the activity does now (iOS 17+).
  let action: LiveActivityButton = 'none';
  if (phase === 'done') {
    action = 'openApp';
  } else if (!input.paused && phase === 'rest') {
    action = 'skipRest';
  } else {
    action = setAction;
  }

  const headline =
    phase === 'done'
      ? copy.sessionDone
      : input.paused
        ? copy.paused
        : phase === 'rest'
          ? copy.rest
          : copy.now;

  return {
    phase,
    // Whole seconds, so the ticks of the session clock do not change it.
    restEndsAt: resting && !input.paused ? Math.round((now + remainingMs) / 1000) * 1000 : null,
    paused: input.paused,
    pausedRemainingSec: resting && input.paused ? Math.ceil(remainingMs / 1000) : null,
    exerciseName: current?.name ?? '',
    scheme,
    progress: `${input.doneCount} ${copy.of} ${input.total} ${copy.exercises}`,
    headline,
    prefix: phase === 'rest' ? `${copy.next}: ` : '',
    compact:
      phase === 'done'
        ? '✓'
        : input.paused
          ? copy.pausedShort
          : current && phase !== 'rest'
            ? `${copy.set} ${input.setIndex + 1}`
            : '',
    action,
    hint: readiness.ready ? '' : readiness.needs === 'weight' ? copy.needsWeight : copy.needsReps,
    position: current?.position ?? 0,
    setIndex: input.setIndex,
    labels: copy.labels,
    nowHeadline: copy.now,
    setScheme: current ? setLine(current, input.setIndex, input.draft, language) : '',
    setCompact: current ? `${copy.set} ${input.setIndex + 1}` : '',
    setAction,
  };
}

// The state the activity takes when the running rest reaches zero: the same
// state with no rest (the cursor already points at the next set). With the
// rest sounds on, rest-cues applies it natively at the end of the rest; in any
// case the widget gets there by itself through the staleDate (it draws the
// set from the `set*` fields of the rest state).
export function liveActivityRestEndState(
  input: LiveActivityInput,
  now: number,
  language: LiveActivityLanguage = 'es',
): LiveActivityState {
  return liveActivityState({ ...input, rest: null }, now, language);
}

// Same key = nothing to send to ActivityKit.
export function liveActivityKey(state: LiveActivityState, endState?: LiveActivityState | null): string {
  return JSON.stringify([state, endState ?? null]);
}

// Local notification at the end of a running rest (shown only with the app
// in the background): "¡Vamos! · Siguiente: Círculos de brazos · 3 × 10".
export function restEndNotification(
  state: LiveActivityState,
  language: LiveActivityLanguage = 'es',
): { fireAt: Date; title: string; body: string } | null {
  if (state.phase !== 'rest' || state.paused || state.restEndsAt === null) {
    return null;
  }
  const copy = COPY[language];
  return {
    fireAt: new Date(state.restEndsAt),
    title: copy.letsGo,
    body: state.exerciseName
      ? `${state.prefix}${state.exerciseName}${state.scheme ? ` · ${state.scheme}` : ''}`
      : copy.restOver,
  };
}

// ── Actions that come from the activity's buttons ───────────────────────────
// Actions older than this are not applied any more (a session left long ago).
export const ACTION_TTL_MS = 4 * 60 * 60 * 1000;

export type ActionTarget = {
  sessionId: string | null;
  loaded: boolean;
  paused: boolean;
  cursor: { position: number; setIndex: number } | null;
  resting: boolean;
  readiness: SetReadiness | null;
};

// What a button's action does with the session as it is now:
//   'logSet'   the set it was taken for is the one at the cursor and is a
//              complete set: it is logged as the app's "hecha" would;
//   'skipRest' there is a rest running;
//   'ignore'   anything else (another session, a set that is no longer the
//              current one — a second tap on the same button —, a pause, an
//              old action). The action is closed all the same.
export function actionDecision(
  action: LiveActivityButtonAction,
  target: ActionTarget,
  now: number,
): 'logSet' | 'skipRest' | 'ignore' {
  if (
    !target.loaded ||
    target.sessionId !== action.sessionId ||
    target.paused ||
    now - action.at > ACTION_TTL_MS
  ) {
    return 'ignore';
  }
  if (action.kind === 'skipRest') {
    return target.resting ? 'skipRest' : 'ignore';
  }
  const sameSet =
    target.cursor !== null &&
    target.cursor.position === action.position &&
    target.cursor.setIndex === action.setIndex;
  return sameSet && !target.resting && target.readiness?.ready === true ? 'logSet' : 'ignore';
}
