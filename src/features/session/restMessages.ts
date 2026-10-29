import type { SessionMessagesMode } from '@app/lib/feedbackPrefs';

// ELLIE's messages during the rest (§28.13 · SESSION_FEEDBACK_SHAPES sfb-1):
// which one shows when a rest starts. Pure rules, no UI and no backend.
//
// - At most 1 per rest, never in two rests in a row, at most 4 per session.
// - Never in rests shorter than 30 s. Each type once per session.
// - Priority: récord > molestia > check-in > agua > motivación.
// - "Solo esenciales": récords and molestias. "Ninguno": nothing.
// The caller asks only when a rest starts (never halfway through).

export type RestMessageKind =
  | 'record'
  | 'discomfortFollowUp'
  | 'checkIn'
  | 'water'
  | 'halfway'
  | 'lastExercise';

export const REST_MESSAGE_PRIORITY: readonly RestMessageKind[] = [
  'record',
  'discomfortFollowUp',
  'checkIn',
  'water',
  'halfway',
  'lastExercise',
];

const ESSENTIAL: readonly RestMessageKind[] = ['record', 'discomfortFollowUp'];

export const MIN_REST_SEC = 30;
export const MAX_PER_SESSION = 4;
// The card closes itself after this long; a confirmation stays ~1 s.
export const MESSAGE_AUTO_CLOSE_MS = 6000;
export const CONFIRMATION_MS = 1000;

export type RestMessageContext = {
  mode: SessionMessagesMode;
  // Planned length of the rest that starts.
  restSec: number;
  // 0-based number of this rest in the session.
  restIndex: number;
  // Between two exercises ('exercise') or two sets of one ('set').
  restKind: 'set' | 'exercise';
  // Exercises finished and in the plan.
  doneCount: number;
  total: number;
  // A new mark not shown yet (detect_session_prs), if any.
  record: { exerciseName: string; weightKg: number | null } | null;
  // Zone told in an earlier rest of this session ("Algo me molesta").
  discomfortZone: BodyZone | null;
  // Exercise the check-in asks about (the one just worked).
  checkInExercise: { id: string | null; name: string } | null;
};

export type RestMessageHistory = {
  shown: RestMessageKind[];
  lastRestIndex: number | null;
};

export const EMPTY_HISTORY: RestMessageHistory = { shown: [], lastRestIndex: null };

function available(kind: RestMessageKind, ctx: RestMessageContext): boolean {
  const betweenExercises = ctx.restKind === 'exercise';
  switch (kind) {
    case 'record':
      return ctx.record !== null;
    case 'discomfortFollowUp':
      return ctx.discomfortZone !== null;
    case 'checkIn':
      return ctx.checkInExercise !== null;
    case 'water':
      // From the third exercise on.
      return ctx.doneCount >= 2;
    case 'halfway':
      return betweenExercises && ctx.total >= 4 && ctx.doneCount >= Math.floor(ctx.total / 2) && ctx.doneCount < ctx.total - 1;
    case 'lastExercise':
      return betweenExercises && ctx.total >= 2 && ctx.doneCount === ctx.total - 1;
    default:
      return false;
  }
}

export function pickRestMessage(
  ctx: RestMessageContext,
  history: RestMessageHistory,
): RestMessageKind | null {
  if (ctx.mode === 'ninguno' || ctx.restSec < MIN_REST_SEC) {
    return null;
  }
  if (history.shown.length >= MAX_PER_SESSION) {
    return null;
  }
  if (history.lastRestIndex !== null && ctx.restIndex - history.lastRestIndex <= 1) {
    return null;
  }
  return (
    REST_MESSAGE_PRIORITY.find(
      kind =>
        !history.shown.includes(kind) &&
        (ctx.mode === 'todos' || ESSENTIAL.includes(kind)) &&
        available(kind, ctx),
    ) ?? null
  );
}

export function markShown(
  history: RestMessageHistory,
  kind: RestMessageKind,
  restIndex: number,
): RestMessageHistory {
  return { shown: [...history.shown, kind], lastRestIndex: restIndex };
}

// ── Answers (sfb-1) ─────────────────────────────────────────────────────────

export type Effort = 'facil' | 'bien' | 'duro' | 'al_limite';
export type BodyZone = 'hombro' | 'rodilla' | 'espalda' | 'codo' | 'otra';
export type DiscomfortTrend = 'mejor' | 'igual' | 'peor';

export const EFFORT_OPTIONS: { value: Effort; label: string }[] = [
  { value: 'facil', label: 'Fácil' },
  { value: 'bien', label: 'Bien' },
  { value: 'duro', label: 'Duro' },
  { value: 'al_limite', label: 'Al límite' },
];

export const ZONE_OPTIONS: { value: BodyZone; label: string }[] = [
  { value: 'hombro', label: 'Hombro' },
  { value: 'rodilla', label: 'Rodilla' },
  { value: 'espalda', label: 'Espalda' },
  { value: 'codo', label: 'Codo' },
  { value: 'otra', label: 'Otra' },
];

export const TREND_OPTIONS: { value: DiscomfortTrend; label: string }[] = [
  { value: 'mejor', label: 'Mejor' },
  { value: 'igual', label: 'Igual' },
  { value: 'peor', label: 'Peor' },
];

// "¿Cómo sigue la rodilla?" · "¿Cómo sigue la molestia?" for "otra".
const FOLLOW_UP: Record<BodyZone, string> = {
  hombro: '¿Cómo sigue el hombro?',
  rodilla: '¿Cómo sigue la rodilla?',
  espalda: '¿Cómo sigue la espalda?',
  codo: '¿Cómo sigue el codo?',
  otra: '¿Cómo sigue la molestia?',
};

export function followUpQuestion(zone: BodyZone): string {
  return FOLLOW_UP[zone];
}

// The follow-up has no kind of its own in sfb-1: it is a new discomfort in
// the same zone with the trend as its note.
export function trendNote(trend: DiscomfortTrend): string {
  return `Seguimiento: ${trend}`;
}

export const NOTE_MAX = 280;
export const RATING_NOTE_MAX = 500;
