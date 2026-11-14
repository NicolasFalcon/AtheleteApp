import { setsFor, type LoggedSet, type PlannedExercise, type RestKind } from '@app/features/session/sessionModel';
import { activePlan, isNoLoadBlock } from '@app/features/session/sessionModel';
import type {
  LiveActivityButton,
  LiveActivityButtonAction,
  LiveActivityLabels,
  LiveActivityState,
} from '@app/lib/liveActivity';

// What the workout Live Activity shows, from the session's state. Pure.
//
// Three situations (and "paused"):
//   rest      the countdown, "Siguiente: …" with the set that follows and its
//             "Serie hecha ✓" button (iOS does not redraw on time, so the
//             flow never depends on the switch to "Ahora");
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
export type SetReadiness = { ready: true } | { ready: false; needs: 'weight' };

// "Serie hecha" saves exactly what the card of the app would save with no
// editing (draft). It is offered only when that is a complete set:
//   · the reps never block it: they are the runner's, else the routine's or
//     plan's target (a range loads its lower end);
//   · the weight is the one loaded; without one, the set is still complete
//     for a timed or distance set, for a bodyweight exercise of a plan, and
//     for a warm-up or cool-down row (no external load), for an exercise whose earlier set of this session was logged with no
//     weight on purpose. A calibration set or an exercise with no weight to
//     start from is not: the athlete picks it in the app.
export function setReadiness(
  exercise: PlannedExercise,
  draft: { reps: number | null; weightKg: number | null },
  sets: LoggedSet[],
): SetReadiness {
  if (draft.weightKg !== null || exercise.unit === 'sec' || exercise.unit === 'm' || isNoLoadBlock(exercise)) {
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

// The amount of one set: "10" · "40 s" · "40 m" · "máx" / "max". The reps are
// the runner's, else the target of the routine or plan.
function amountText(
  exercise: PlannedExercise,
  draftReps: number | null,
  language: LiveActivityLanguage,
): { text: string; isReps: boolean } | null {
  switch (exercise.unit) {
    case 'sec':
      return exercise.amount !== null ? { text: `${exercise.amount} s`, isReps: false } : null;
    case 'm':
      return exercise.amount !== null ? { text: `${exercise.amount} m`, isReps: false } : null;
    case 'max':
      return { text: COPY[language].max, isReps: false };
    default: {
      const reps = draftReps ?? exercise.reps ?? exercise.amount;
      return reps !== null && reps !== undefined ? { text: String(reps), isReps: true } : null;
    }
  }
}

// The set: "Serie 2 de 3 · 10 × 40 kg" · bodyweight "Serie 2 de 3 · 10 reps".
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
  const amountPart = amount ? (amount.isReps && !weight ? `${amount.text} ${copy.reps}` : amount.text) : null;
  const tail = [amountPart, weight].filter(Boolean).join(' × ');
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

  // The set that follows (during a rest) or the one in course.
  const scheme = current ? setLine(current, input.setIndex, input.draft, language) : '';

  // The set that follows (or the one in course): can it be logged without
  // opening the app?
  const readiness: SetReadiness =
    current && !input.paused ? setReadiness(current, input.draft, input.sets) : { ready: true };
  const setAction: LiveActivityButton =
    !current || input.paused ? 'none' : readiness.ready ? 'completeSet' : 'chooseInApp';

  // What the button of the activity does now (iOS 17+).
  let action: LiveActivityButton = 'none';
  if (phase === 'done') {
    action = 'openApp';
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
    progress: `${input.doneCount} ${copy.of} ${input.total}`,
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
    hint: readiness.ready ? '' : copy.needsWeight,
    position: current?.position ?? 0,
    setIndex: input.setIndex,
    labels: copy.labels,
    nowHeadline: copy.now,
    setScheme: scheme,
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
//              complete set: it is logged as the app's "hecha" would (during
//              a rest too: the card shows the set that follows);
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
  return sameSet && target.readiness?.ready === true ? 'logSet' : 'ignore';
}
