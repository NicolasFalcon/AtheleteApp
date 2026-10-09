import { firstName } from '@app/features/social/socialModel';
import type {
  BoardEntry,
  ChallengeHead,
  ChallengeMetric,
  ChallengeMine,
  CreateChallengeResult,
  ManualContributionResult,
  RespondInviteResult,
} from '@app/features/social/challengeTypes';

// Pure model of Comunidad · tanda C (retos). Rules: SOCIAL_SCHEMA_PROPOSAL
// §4.10 (metrics, durations, invitations, manual entries, points only in the
// official challenge) and the handoff §11.

const DAY_MS = 86_400_000;

// ── Metrics (the six types of SOCIAL_11 paso 1) ────────────────────────────
export type MetricInfo = {
  metric: ChallengeMetric;
  title: string;
  subtitle: string;
  // "entrenamientos esta semana", "min de movilidad…" (title of the challenge).
  unit: string;
  // Short unit for "Te faltan 1 entreno".
  short: string;
  initial: number;
  step: number;
  min: number;
  max: number;
};

export const METRICS: readonly MetricInfo[] = [
  { metric: 'workouts', title: 'Entrenamientos', subtitle: 'Sesiones completadas', unit: 'entrenamientos', short: 'entreno', initial: 4, step: 1, min: 1, max: 14 },
  { metric: 'strength_sessions', title: 'Sesiones de fuerza', subtitle: 'Solo entrenos de fuerza', unit: 'sesiones de fuerza', short: 'sesión', initial: 3, step: 1, min: 1, max: 10 },
  { metric: 'minutes_trained', title: 'Minutos entrenados', subtitle: 'Tiempo total en sesión', unit: 'min entrenados', short: 'min', initial: 150, step: 30, min: 30, max: 900 },
  { metric: 'exercise_reps', title: 'Repeticiones de un ejercicio', subtitle: 'Acumuladas durante el reto', unit: 'repeticiones', short: 'repetición', initial: 100, step: 10, min: 20, max: 1000 },
  { metric: 'core33_habit_days', title: 'Core 33 · hábitos', subtitle: 'Días con los 3 hábitos cerrados', unit: 'días de hábitos', short: 'día', initial: 5, step: 1, min: 1, max: 14 },
  { metric: 'mobility_minutes', title: 'Movilidad', subtitle: 'Minutos de sesiones de movilidad', unit: 'min de movilidad', short: 'min', initial: 60, step: 15, min: 15, max: 300 },
];

export function metricInfo(metric: ChallengeMetric): MetricInfo {
  return METRICS.find(item => item.metric === metric) ?? METRICS[0];
}

// Between friends the repetitions challenge is not offered (Q6: BT-45 is a
// product decision); only the official challenge counts repetitions.
export function friendMetrics(): readonly MetricInfo[] {
  return METRICS.filter(item => item.metric !== 'exercise_reps');
}

export function isFriendMetric(metric: ChallengeMetric): boolean {
  return metric !== 'exercise_reps';
}

export const DURATIONS = [
  { days: 3, label: '3 días', phrase: 'en 3 días' },
  { days: 7, label: '1 semana', phrase: 'esta semana' },
  { days: 14, label: '2 semanas', phrase: 'en 2 semanas' },
] as const;

export function durationInfo(days: number) {
  return DURATIONS.find(item => item.days === days) ?? null;
}

export function clampGoal(metric: ChallengeMetric, goal: number): number {
  const info = metricInfo(metric);
  return Math.min(info.max, Math.max(info.min, goal));
}

export function stepGoal(
  metric: ChallengeMetric,
  goal: number,
  direction: 1 | -1,
): number {
  return clampGoal(metric, goal + direction * metricInfo(metric).step);
}

// "4 entrenamientos esta semana": generated, never typed (SOCIAL_SCHEMA §4.10).
export function challengeTitle(
  metric: ChallengeMetric,
  goal: number,
  durationDays: number,
): string {
  const duration = durationInfo(durationDays);
  return `${goal} ${metricInfo(metric).unit} ${duration ? duration.phrase : ''}`.trim();
}

// ── Crear reto: five steps ─────────────────────────────────────────────────
export const CREATE_STEPS = [
  { key: 'type', label: 'Tipo', question: '¿Qué vais a sumar?' },
  { key: 'goal', label: 'Objetivo', question: 'Define el objetivo' },
  { key: 'duration', label: 'Duración', question: '¿Cuánto dura?' },
  { key: 'friends', label: 'Amigos', question: 'Invita a tus amigos' },
  { key: 'review', label: 'Revisar', question: 'Revisa y crea' },
] as const;

export const MAX_INVITEES = 10;

export type CreateDraft = {
  metric: ChallengeMetric | null;
  goal: number;
  durationDays: number | null;
  inviteeIds: string[];
};

export type StepError =
  | 'no_metric'
  | 'metric_not_allowed'
  | 'goal_out_of_range'
  | 'no_duration'
  | 'no_invitees'
  | 'too_many_invitees'
  | 'not_a_friend';

export const STEP_ERRORS: Record<StepError, string> = {
  no_metric: 'Elige qué vais a sumar.',
  metric_not_allowed: 'Las repeticiones solo están en el reto oficial.',
  goal_out_of_range: 'El objetivo está fuera del rango de este tipo.',
  no_duration: 'Elige cuánto dura el reto.',
  no_invitees: 'Invita al menos a un amigo.',
  too_many_invitees: `Máximo ${MAX_INVITEES} amigos por reto.`,
  not_a_friend: 'Solo puedes invitar a tus amigos.',
};

export function initialDraft(inviteeId?: string): CreateDraft {
  return {
    metric: null,
    goal: 0,
    durationDays: null,
    inviteeIds: inviteeId ? [inviteeId] : [],
  };
}

export function selectMetric(draft: CreateDraft, metric: ChallengeMetric): CreateDraft {
  return { ...draft, metric, goal: metricInfo(metric).initial };
}

export function toggleInvitee(draft: CreateDraft, id: string): CreateDraft {
  return draft.inviteeIds.includes(id)
    ? { ...draft, inviteeIds: draft.inviteeIds.filter(item => item !== id) }
    : { ...draft, inviteeIds: [...draft.inviteeIds, id] };
}

export type StepCheck = { ok: true } | { ok: false; error: StepError };

// Each step is valid on its own; the review needs all of them.
export function validateStep(
  step: number,
  draft: CreateDraft,
  friendIds: readonly string[],
): StepCheck {
  switch (step) {
    case 0:
      if (!draft.metric) {
        return { ok: false, error: 'no_metric' };
      }
      return isFriendMetric(draft.metric)
        ? { ok: true }
        : { ok: false, error: 'metric_not_allowed' };
    case 1: {
      if (!draft.metric) {
        return { ok: false, error: 'no_metric' };
      }
      const info = metricInfo(draft.metric);
      return Number.isInteger(draft.goal) &&
        draft.goal >= info.min &&
        draft.goal <= info.max
        ? { ok: true }
        : { ok: false, error: 'goal_out_of_range' };
    }
    case 2:
      return draft.durationDays !== null && durationInfo(draft.durationDays)
        ? { ok: true }
        : { ok: false, error: 'no_duration' };
    case 3:
      if (draft.inviteeIds.length === 0) {
        return { ok: false, error: 'no_invitees' };
      }
      if (draft.inviteeIds.length > MAX_INVITEES) {
        return { ok: false, error: 'too_many_invitees' };
      }
      return draft.inviteeIds.every(id => friendIds.includes(id))
        ? { ok: true }
        : { ok: false, error: 'not_a_friend' };
    default:
      for (let index = 0; index < 4; index += 1) {
        const check = validateStep(index, draft, friendIds);
        if (!check.ok) {
          return check;
        }
      }
      return { ok: true };
  }
}

export function canCreate(draft: CreateDraft, friendIds: readonly string[]): boolean {
  return validateStep(4, draft, friendIds).ok;
}

// ── Dates ──────────────────────────────────────────────────────────────────
// The challenge starts when the first invitee accepts; until then there are no
// dates and the invitation expires 7 days after it was created (Q16).
export function inviteExpiresAt(createdAt: Date): Date {
  return new Date(createdAt.getTime() + 7 * DAY_MS);
}

export function challengeEndsAt(startsAt: Date, durationDays: number): Date {
  return new Date(startsAt.getTime() + durationDays * DAY_MS);
}

export function daysLeftLabel(
  endsAt: string | null,
  durationDays: number,
  now: Date = new Date(),
): string {
  if (!endsAt) {
    return `${durationDays} días`;
  }
  const left = Math.ceil((new Date(endsAt).getTime() - now.getTime()) / DAY_MS);
  if (left <= 0) {
    return 'Terminado';
  }
  return left === 1 ? 'Último día' : `${left} días restantes`;
}

// ── State of a challenge for the user ──────────────────────────────────────
export type ChallengeViewState =
  | 'notJoined' // official challenge not joined yet
  | 'invited'
  | 'waiting' // friends challenge, nobody accepted yet
  | 'active'
  | 'completed'
  | 'expired'
  | 'cancelled'
  | 'declined'
  | 'left';

export function challengeViewState(
  challenge: Pick<
    ChallengeHead,
    'status' | 'goal' | 'ends_at' | 'invite_expires_at'
  >,
  mine: Pick<ChallengeMine, 'status' | 'progress'> | null,
  now: Date = new Date(),
): ChallengeViewState {
  if (challenge.status === 'cancelled') {
    return 'cancelled';
  }
  if (!mine) {
    return 'notJoined';
  }
  if (mine.status === 'declined') {
    return 'declined';
  }
  if (mine.status === 'left') {
    return 'left';
  }
  if (mine.status === 'completed' || mine.progress >= challenge.goal) {
    return 'completed';
  }
  const inviteExpired =
    challenge.invite_expires_at !== null &&
    new Date(challenge.invite_expires_at).getTime() <= now.getTime();
  const ended =
    challenge.ends_at !== null &&
    new Date(challenge.ends_at).getTime() <= now.getTime();
  if (
    challenge.status === 'expired' ||
    mine.status === 'expired' ||
    ended ||
    (mine.status === 'invited' && inviteExpired)
  ) {
    return 'expired';
  }
  if (mine.status === 'invited') {
    return 'invited';
  }
  return challenge.status === 'pending' ? 'waiting' : 'active';
}

export type ChallengeActions = {
  canAccept: boolean;
  canDecline: boolean;
  canJoin: boolean;
  canLeave: boolean;
  canCancel: boolean;
  canAddManual: boolean;
  canShare: boolean;
};

// What the detail offers: accept / decline an invitation, join the official
// challenge, leave (active only), cancel (the creator, only while `pending`;
// an active challenge shows no cancel option), add repetitions
// by hand (only the official one) and share when it is completed.
export function challengeActions(
  state: ChallengeViewState,
  challenge: Pick<ChallengeHead, 'kind' | 'allow_manual'>,
  isCreator: boolean,
): ChallengeActions {
  return {
    canAccept: state === 'invited',
    canDecline: state === 'invited',
    canJoin: state === 'notJoined' && challenge.kind === 'official',
    // leave_challenge only works on an active participation: the creator of a
    // challenge nobody accepted yet cancels it instead.
    canLeave: state === 'active',
    canCancel: state === 'waiting' && isCreator && challenge.kind === 'friends',
    canAddManual:
      state === 'active' && challenge.kind === 'official' && challenge.allow_manual,
    canShare: state === 'completed',
  };
}

// ── Ranking ────────────────────────────────────────────────────────────────
export type RankedEntry = BoardEntry & { position: number; done: boolean };

// Most progress first; a tie shares its position (1, 1, 3); inside a tie the
// one who finished first, then the user, then the name.
export function rankBoard(
  entries: BoardEntry[],
  goal: number,
): RankedEntry[] {
  const sorted = [...entries].sort((a, b) => {
    if (b.progress !== a.progress) {
      return b.progress - a.progress;
    }
    if (a.completed_at && b.completed_at && a.completed_at !== b.completed_at) {
      return a.completed_at.localeCompare(b.completed_at);
    }
    if (a.isMe !== b.isMe) {
      return a.isMe ? -1 : 1;
    }
    return (a.profile?.name ?? '').localeCompare(b.profile?.name ?? '');
  });
  let lastProgress = -1;
  let lastPosition = 0;

  return sorted.map((entry, index) => {
    const position = entry.progress === lastProgress ? lastPosition : index + 1;
    lastProgress = entry.progress;
    lastPosition = position;
    return { ...entry, position, done: entry.progress >= goal };
  });
}

export function progressPct(progress: number, goal: number): number {
  return goal > 0 ? Math.min(100, Math.max(0, (progress / goal) * 100)) : 0;
}

const UNIT_PLURAL: Record<string, string> = {
  entreno: 'entrenos',
  sesión: 'sesiones',
  día: 'días',
  repetición: 'repeticiones',
  min: 'min',
};

// The sentence under the ranking, with data and no pressure (SOCIAL_09).
export function distanceLine(
  ranked: RankedEntry[],
  goal: number,
  metric: ChallengeMetric,
  waiting: boolean,
): string {
  if (waiting) {
    return 'Invitaciones enviadas. El reto empieza cuando acepte alguien.';
  }
  const me = ranked.find(entry => entry.isMe);
  if (!me) {
    return '';
  }
  const unit = metricInfo(metric).short;
  const missing = Math.max(0, goal - me.progress);
  const plural = (count: number) =>
    count === 1 ? unit : UNIT_PLURAL[unit] ?? unit;
  const others = ranked.filter(entry => !entry.isMe);
  const finishedOthers = others.filter(entry => entry.done);

  if (me.done) {
    if (finishedOthers.length === 0) {
      return 'Completado. Eres el primero.';
    }
    return finishedOthers.length === 1
      ? `Completado. ${firstName(finishedOthers[0].profile?.name ?? 'Un amigo')} también lo terminó.`
      : `Completado. ${finishedOthers.length} amigos también lo terminaron.`;
  }
  const leader = ranked[0];
  if (leader.isMe || (leader.progress === me.progress && others.every(entry => entry.progress <= me.progress))) {
    return `Vas en cabeza. Te ${missing === 1 ? 'falta' : 'faltan'} ${missing} ${plural(missing)}.`;
  }
  const who = firstName(leader.profile?.name ?? 'Un amigo');
  return `${who} ${leader.done ? 'ya terminó' : 'va por delante'}. Te ${
    missing === 1 ? 'falta' : 'faltan'
  } ${missing} ${plural(missing)} para completarlo.`;
}

// ── Official challenge: manual entries and the week ────────────────────────
export const MANUAL_ADDS = [5, 10, 15] as const;
export const MANUAL_MAX_PER_ENTRY = 100;
export const MANUAL_MAX_PER_DAY = 300;

export type ManualCheck =
  | { ok: true }
  | { ok: false; error: 'amount_out_of_range' | 'daily_limit' };

// 1–100 per entry and 300 per day and challenge (DA-S7).
export function validateManualAmount(
  amount: number,
  manualToday: number,
): ManualCheck {
  if (!Number.isInteger(amount) || amount < 1 || amount > MANUAL_MAX_PER_ENTRY) {
    return { ok: false, error: 'amount_out_of_range' };
  }
  if (manualToday + amount > MANUAL_MAX_PER_DAY) {
    return { ok: false, error: 'daily_limit' };
  }
  return { ok: true };
}

// Height of each bar of the week: a stub for a day without activity, a flat
// outline for a day to come, and a height that grows with the figure.
export function weekBarHeight(value: number | null): number {
  if (value === null) {
    return 6;
  }
  return value === 0 ? 4 : Math.min(60, 8 + value * 1.6);
}

export function officialLeftLine(progress: number, goal: number): string {
  return progress >= goal
    ? 'Completado'
    : `Te faltan ${goal - progress} para completar el reto.`;
}

// ── One line per challenge in the list (SOCIAL_07) ─────────────────────────
export const STATE_TAG: Partial<Record<ChallengeViewState, string>> = {
  active: 'ENTRE AMIGOS',
  waiting: 'ENTRE AMIGOS · NUEVO',
  expired: 'EXPIRADO',
  completed: 'COMPLETADO',
  invited: 'INVITACIÓN',
};

export function rowLine(input: {
  state: ChallengeViewState;
  metric: ChallengeMetric;
  goal: number;
  progress: number;
  leader: { name: string; progress: number } | null;
}): string {
  const { state, metric, goal, progress, leader } = input;

  if (state === 'waiting') {
    return 'Esperando a que acepten';
  }
  if (state === 'expired') {
    return 'Nadie aceptó a tiempo';
  }
  if (state === 'completed') {
    return progress >= goal ? 'Completado' : 'Completado entre amigos';
  }
  if (leader && leader.progress > progress) {
    const diff = leader.progress - progress;
    const unit = metricInfo(metric).short;
    const word = diff === 1 ? unit : UNIT_PLURAL[unit] ?? unit;
    return `${firstName(leader.name)} va ${diff} ${word} por delante`;
  }
  return 'Vas en cabeza';
}

// ── Messages for the errors of the challenge RPCs ──────────────────────────
type CreateFailure = Extract<CreateChallengeResult, { ok: false }>;

export function createErrorMessage(failure: CreateFailure): string {
  switch (failure.error) {
    case 'invalid_metric':
      return 'Ese tipo de reto no está disponible entre amigos.';
    case 'goal_out_of_range':
      return failure.min !== undefined && failure.max !== undefined
        ? `El objetivo debe estar entre ${failure.min} y ${failure.max}.`
        : STEP_ERRORS.goal_out_of_range;
    case 'invalid_duration':
      return 'La duración debe ser de 3, 7 o 14 días.';
    case 'no_invitees':
      return STEP_ERRORS.no_invitees;
    case 'invitee_not_friend':
      return STEP_ERRORS.not_a_friend;
    default:
      return 'No se pudo crear el reto. Inténtalo de nuevo.';
  }
}

// The step of Crear reto to go back to for each server error.
export function createErrorStep(failure: CreateFailure): number | null {
  switch (failure.error) {
    case 'invalid_metric':
      return 0;
    case 'goal_out_of_range':
      return 1;
    case 'invalid_duration':
      return 2;
    case 'no_invitees':
    case 'invitee_not_friend':
      return 3;
    default:
      return null;
  }
}

export function respondErrorMessage(
  error: Extract<RespondInviteResult, { ok: false }>['error'],
): string {
  switch (error) {
    case 'no_invite':
      return 'Esta invitación ya no existe.';
    case 'invite_expired':
      return 'La invitación caducó.';
    default:
      return 'No se pudo responder a la invitación';
  }
}

export function manualErrorMessage(
  failure: Extract<ManualContributionResult, { ok: false }>,
): string {
  switch (failure.error) {
    case 'daily_limit':
      return failure.remaining !== undefined && failure.remaining > 0
        ? `Hoy solo puedes registrar ${failure.remaining} más`
        : 'Has llegado al máximo de registros de hoy';
    case 'amount_out_of_range':
      return 'Cantidad no válida';
    case 'not_allowed':
      return 'Este reto no admite registro manual';
    default:
      return 'No se pudo registrar el aporte';
  }
}

// A response that says the invitation is gone (so the list must refresh).
export function inviteIsGone(
  error: Extract<RespondInviteResult, { ok: false }>['error'],
): boolean {
  return error === 'no_invite' || error === 'invite_expired';
}
