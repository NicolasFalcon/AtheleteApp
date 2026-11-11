import { getSupabaseClient } from '@app/services/supabase/client';
import { isSessionType, type SessionType } from '@app/components/v2/SessionTypeChip';
import { focusFromTargetGroups, parseRoutineFocus } from '@app/features/workouts/routineFocus';
import {
  parseNutritionProposal,
  type NutritionProposal,
} from '@app/services/ellie/nutritionProposals';
import type { RoutineFocus } from '@app/shared/domain/types';
import {
  parseTrainingPlanProposal,
  type TrainingPlanProposal,
} from '@app/services/supabase/trainingPlan';
import { muscleLabel } from '@app/services/catalog/catalogService';
import {
  bodyPartLabels,
  equipmentLabels,
  equipmentToFilter,
  levelLabels,
  muscleGroupToBodyPart,
} from '@app/shared/data/exercises';

// ELLIE's proposals (docs/backend/ELLIE_PROPOSALS_SHAPES.md, prop-1): the
// cards ellie-chat emits with cards_v2, read again with get_proposal, and the
// actions on a routine proposal. Nothing is saved until the user confirms.

export type ProposalCardType =
  | 'routine_proposal'
  | 'nutrition_plan_proposal'
  | 'nutrition_prefs_request'
  // Before a routine, when a discomfort is active and not confirmed.
  | 'discomfort_check'
  // prop-2: an existing routine (official or the user's), and the receipt of
  // a routine added to a day of the week.
  | 'routine_library'
  | 'week_plan_added'
  | 'week_plan_conflict'
  // tp-1.2: the training plan of 1 to 3 months (ellie_proposals.kind =
  // 'training_plan').
  | 'training_plan_proposal'
  // tp-1.2 §8: an adjustment of the training plan (31.8) in the chat.
  | 'plan_adjustment'
  // ELLIE_CARDS_FLOW "Tarjetas del plan de entrenamiento": the last closed
  // week's review, and an action of the plan the athlete must confirm.
  | 'plan_review'
  | 'plan_action_confirm';

export const PROPOSAL_CARD_TYPES: readonly ProposalCardType[] = [
  'routine_proposal',
  'nutrition_plan_proposal',
  'nutrition_prefs_request',
  'discomfort_check',
  'routine_library',
  'week_plan_added',
  'week_plan_conflict',
  'plan_adjustment',
  'plan_review',
  'plan_action_confirm',
  'training_plan_proposal',
];

export const isProposalCardType = (value: unknown): value is ProposalCardType =>
  typeof value === 'string' && (PROPOSAL_CARD_TYPES as readonly string[]).includes(value);

// A card as ellie-chat sends it (SSE `card` or JSON `cards[]`).
export type ProposalCard = {
  type: ProposalCardType;
  proposalId: string | null;
  version: number;
  adjustLabel: string | null;
  payload: unknown;
};

export type ProposalStatus = 'open' | 'saved' | 'started' | 'active' | 'replaced' | 'discarded';

export type ProposalChangeTag = 'ajustado' | 'añadido' | 'cambiado';

export type ProposalStep = { exerciseId: string; name: string; detail: string | null };

export type ProposalVariant = { exerciseId: string; name: string; image: string | null };

export type ProposalExercise = {
  exerciseId: string;
  name: string;
  // Media keys of the catalog (signed when shown).
  image: string | null;
  video: string | null;
  sets: number;
  reps: number;
  units: number;
  kg: number | null;
  restS: number;
  tag: ProposalChangeTag | null;
  // Labels, already translated from the catalog slugs.
  muscleGroup: string;
  primaryMuscle: string | null;
  tips: string[];
  variants: ProposalVariant[];
};

export type RoutineProposal = {
  id: string;
  version: number;
  adjustLabel: string | null;
  status: ProposalStatus;
  mode: 'nueva' | 'ajustada';
  sourceRoutineName: string | null;
  title: string;
  minutes: number;
  level: string;
  muscles: string[];
  equipment: string[];
  // Cover word, from payload.target_groups (null: no word).
  focus: RoutineFocus | null;
  reasoning: string;
  // One discreet line about sleep, nutrition or recent training (or null).
  readinessNote: string | null;
  // The chips under the open card, in the server's order.
  quickAdjustments: string[];
  warmup: ProposalStep[];
  main: ProposalExercise[];
  cooldown: ProposalStep[];
  removed: { exerciseId: string; name: string }[];
  totals: { minutes: number; exercises: number; sets: number };
};

// ── Labels of the catalog slugs (same names the app uses everywhere) ────────
const EXTRA_EQUIPMENT: Record<string, string> = {
  bench: 'Banco',
  machine: 'Máquina',
  pull_up_bar: 'Barra de dominadas',
  'pull-up-bar': 'Barra de dominadas',
  box: 'Cajón',
  mat: 'Esterilla',
};

const humanize = (slug: string) => {
  const text = slug.replace(/[-_]+/g, ' ').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : slug;
};

export function muscleSlugLabel(slug: string): string {
  const muscle = muscleLabel(slug, 'es');
  if (muscle && muscle !== slug) {
    return muscle;
  }
  const part = bodyPartLabels[slug] ?? bodyPartLabels[muscleGroupToBodyPart[slug] ?? ''];
  return part ?? humanize(slug);
}

export function equipmentSlugLabel(slug: string): string {
  return (
    EXTRA_EQUIPMENT[slug] ??
    equipmentLabels[equipmentToFilter[slug] ?? slug] ??
    humanize(slug)
  );
}

const LEVELS: Record<string, string> = {
  principiante: 'Principiante',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
  ...levelLabels,
};

export const levelLabel = (value: string): string => LEVELS[value] ?? humanize(value);

// ── Parsing ─────────────────────────────────────────────────────────────────
type Raw = Record<string, unknown>;

const rec = (value: unknown): Raw | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Raw) : null;
const str = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null;
const num = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
};
const list = (value: unknown): Raw[] =>
  Array.isArray(value) ? value.map(rec).filter((item): item is Raw => item !== null) : [];
const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item !== '') : [];

const TAGS: readonly ProposalChangeTag[] = ['ajustado', 'añadido', 'cambiado'];
const STATUSES: readonly ProposalStatus[] = ['open', 'saved', 'started', 'active', 'replaced', 'discarded'];

export function parseProposalCard(value: unknown): ProposalCard | null {
  const row = rec(value);
  if (!row || !isProposalCardType(row.type)) {
    return null;
  }
  return {
    type: row.type,
    proposalId: str(row.proposal_id),
    version: num(row.version) ?? 1,
    adjustLabel: str(row.adjust_label),
    payload: row.payload ?? null,
  };
}

function parseStep(row: Raw): ProposalStep {
  return {
    exerciseId: str(row.exercise_id) ?? '',
    name: str(row.name) ?? 'Ejercicio',
    detail: str(row.detail),
  };
}

function parseExercise(row: Raw): ProposalExercise {
  const tag = TAGS.find(item => item === row.tag) ?? null;
  const group = str(row.muscle_group);
  const primary = str(row.primary_muscle);
  return {
    exerciseId: str(row.exercise_id) ?? '',
    name: str(row.name) ?? 'Ejercicio',
    image: str(row.image),
    video: str(row.video),
    sets: num(row.sets) ?? 3,
    reps: num(row.reps) ?? 10,
    units: num(row.units) ?? 1,
    kg: num(row.kg),
    restS: num(row.rest_s) ?? 60,
    tag,
    muscleGroup: group ? muscleSlugLabel(group) : '',
    primaryMuscle: primary ? muscleSlugLabel(primary) : null,
    tips: strings(row.tips),
    variants: list(row.variants).flatMap(variant => {
      const exerciseId = str(variant.exercise_id);
      return exerciseId
        ? [{ exerciseId, name: str(variant.name) ?? 'Variante', image: str(variant.image) }]
        : [];
    }),
  };
}

// A routine proposal from its card (stream / cards[]) or from get_proposal.
export function parseRoutineProposal(
  id: string,
  payloadValue: unknown,
  meta: { version?: number | null; adjustLabel?: string | null; status?: unknown } = {},
): RoutineProposal | null {
  const payload = rec(payloadValue);
  if (!payload) {
    return null;
  }
  const main = list(payload.main).map(parseExercise).filter(item => item.exerciseId);
  const totals = rec(payload.totals);
  const minutes = num(payload.minutes) ?? num(totals?.minutes) ?? 0;
  return {
    id,
    version: meta.version ?? 1,
    adjustLabel: meta.adjustLabel ?? null,
    status: STATUSES.find(item => item === meta.status) ?? 'open',
    mode: payload.mode === 'ajustada' ? 'ajustada' : 'nueva',
    sourceRoutineName: str(payload.source_routine_name),
    title: str(payload.title) ?? 'Rutina de ELLIE',
    minutes,
    level: levelLabel(str(payload.level) ?? 'intermedio'),
    muscles: strings(payload.muscles).map(muscleSlugLabel),
    equipment: strings(payload.equipment).map(equipmentSlugLabel),
    focus: focusFromTargetGroups(strings(payload.target_groups)),
    reasoning: str(payload.reasoning) ?? '',
    readinessNote: str(payload.readiness_note),
    quickAdjustments: strings(payload.quick_adjustments),
    warmup: list(payload.warmup).map(parseStep),
    main,
    cooldown: list(payload.cooldown).map(parseStep),
    removed: list(payload.removed).map(row => ({
      exerciseId: str(row.exercise_id) ?? '',
      name: str(row.name) ?? 'Ejercicio',
    })),
    totals: {
      minutes: num(totals?.minutes) ?? minutes,
      exercises: num(totals?.exercises) ?? main.length,
      sets: num(totals?.sets) ?? main.reduce((sum, item) => sum + item.sets, 0),
    },
  };
}

// ── routine_library (prop-2 §2.1): an existing routine, no ellie_proposals row ──
export type LibrarySource = 'official' | 'user';

export type RoutineLibrary = {
  routineId: string;
  source: LibrarySource;
  name: string;
  categoryName: string | null;
  focus: RoutineFocus | null;
  minutes: number;
  level: string;
  // From the exercises' muscle groups (the payload has no muscles list).
  muscles: string[];
  reasoning: string;
  readinessNote: string | null;
  warmup: ProposalStep[];
  main: ProposalExercise[];
  cooldown: ProposalStep[];
};

export function parseRoutineLibrary(payloadValue: unknown): RoutineLibrary | null {
  const payload = rec(payloadValue);
  const routineId = str(payload?.routine_id);
  if (!payload || !routineId) {
    return null;
  }
  const rows = list(payload.exercises);
  const block = (name: string) => rows.filter(row => (str(row.block) ?? 'main') === name);
  const step = (row: Raw): ProposalStep => {
    const sets = num(row.sets);
    const reps = num(row.reps);
    return { ...parseStep(row), detail: sets && reps ? `${sets} × ${reps}` : null };
  };
  const main = block('main').map(parseExercise).filter(item => item.exerciseId);
  const muscles = Array.from(new Set(main.map(item => item.muscleGroup).filter(Boolean)));
  return {
    routineId,
    source: payload.source === 'user' ? 'user' : 'official',
    name: str(payload.name) ?? 'Rutina',
    categoryName: str(rec(payload.category)?.name),
    focus: parseRoutineFocus(payload.focus),
    minutes: num(payload.minutes) ?? 0,
    level: levelLabel(str(payload.level) ?? 'intermedio'),
    muscles,
    reasoning: str(payload.reasoning) ?? '',
    readinessNote: str(payload.readiness_note),
    warmup: block('warmup').map(step),
    main,
    cooldown: block('cooldown').map(step),
  };
}

// ── week_plan_added (prop-2 §2.2) ───────────────────────────────────────────
export type WeekPlanAdded = {
  date: string;
  routineId: string | null;
  name: string;
  replaced: boolean;
  // The session of the training plan it replaced ("Sustituye a … en tu
  // plan"); null: none. Only the app's own confirmation sets it.
  substitutes?: string | null;
  // A plan is on: "El resto de tu semana no cambia". Only set by the app.
  planOn?: boolean;
};

export function parseWeekPlanAdded(payloadValue: unknown): WeekPlanAdded | null {
  const payload = rec(payloadValue);
  const date = str(payload?.date);
  if (!payload || !date) {
    return null;
  }
  return {
    date,
    routineId: str(payload.routine_id),
    name: str(payload.name) ?? '',
    replaced: payload.replaced === true,
  };
}

// ── week_plan_conflict (prop-2 · ELLIE_CARDS_FLOW) ─────────────────────────
export type WeekPlanConflict = {
  date: string;
  routineId: string | null;
  proposalId: string | null;
  routineName: string;
  planSession: {
    id: string;
    title: string;
    sessionType: SessionType | null;
  };
};

export function parseWeekPlanConflict(payloadValue: unknown): WeekPlanConflict | null {
  const payload = rec(payloadValue);
  const planSession = rec(payload?.plan_session);
  const date = str(payload?.date);
  const routineId = str(payload?.routine_id);
  const proposalId = str(payload?.proposal_id);
  const planSessionId = str(planSession?.id);
  if (
    !payload ||
    !date ||
    (!routineId && !proposalId) ||
    (routineId && proposalId) ||
    !planSession ||
    !planSessionId
  ) {
    return null;
  }
  return {
    date,
    routineId,
    proposalId,
    routineName: str(payload.routine_name) ?? '',
    planSession: {
      id: planSessionId,
      title: str(planSession.title) ?? '',
      sessionType: isSessionType(planSession.session_type) ? planSession.session_type : null,
    },
  };
}

// discomfort_check's payload: `{ zones, chips }`.
export type DiscomfortCheck = { zones: string[]; chips: string[] };

export function parseDiscomfortCheck(payloadValue: unknown): DiscomfortCheck {
  const payload = rec(payloadValue);
  return { zones: strings(payload?.zones), chips: strings(payload?.chips) };
}

// get_proposal's row: `{ proposal: { id, kind, version, adjust_label, payload, status } }`.
export type StoredProposal = {
  kind: 'routine' | 'nutrition_plan' | 'training_plan';
  routine: RoutineProposal | null;
  nutrition: NutritionProposal | null;
  training: TrainingPlanProposal | null;
  status: ProposalStatus;
  version: number;
};

export function parseStoredProposal(id: string, body: unknown): StoredProposal | null {
  const row = rec(rec(body)?.proposal) ?? rec(body);
  if (!row) {
    return null;
  }
  const status = STATUSES.find(item => item === row.status) ?? 'open';
  const version = num(row.version) ?? 1;
  const kind =
    row.kind === 'nutrition_plan' || row.kind === 'training_plan' ? row.kind : 'routine';
  return {
    kind,
    status,
    version,
    routine:
      kind === 'routine'
        ? parseRoutineProposal(str(row.id) ?? id, row.payload, {
            version,
            adjustLabel: str(row.adjust_label),
            status,
          })
        : null,
    nutrition:
      kind === 'nutrition_plan'
        ? parseNutritionProposal(str(row.id) ?? id, row.payload, {
            version,
            adjustLabel: str(row.adjust_label),
          })
        : null,
    training:
      kind === 'training_plan'
        ? parseTrainingPlanProposal(str(row.id) ?? id, row.payload, {
            version,
            adjustLabel: str(row.adjust_label),
          })
        : null,
  };
}

// The card type of a stored v2 card: tool_type keeps the old tool name
// (generate_workout_plan…) or the card type itself.
const STORED_CARD_TYPE: Record<string, ProposalCardType> = {
  generate_workout_plan: 'routine_proposal',
  generate_nutrition_plan: 'nutrition_plan_proposal',
};

// The cards a stored assistant message carries: the history keeps only the
// proposal_id (tool_data = { proposal_id } or { cards: [...] }). Any row with
// tool_data.proposal_id is a v2 card, whatever its tool_type.
export function storedCards(toolType: string | null, toolData: unknown): ProposalCard[] {
  const data = rec(toolData);
  const fromList = (Array.isArray(toolData) ? toolData : Array.isArray(data?.cards) ? data?.cards : [])
    .map(parseProposalCard)
    .filter((card): card is ProposalCard => card !== null);
  if (fromList.length > 0) {
    return fromList;
  }
  // Several cards of one type (plan_adjustment): tool_data = { type, payloads }.
  const many = Array.isArray(data?.payloads) ? data.payloads : null;
  const manyType = isProposalCardType(data?.type)
    ? data?.type
    : isProposalCardType(toolType)
      ? toolType
      : null;
  if (many && manyType) {
    return many.map(payload => ({
      type: manyType,
      proposalId: null,
      version: 1,
      adjustLabel: null,
      payload,
    }));
  }
  const proposalId = str(data?.proposal_id);
  const type = isProposalCardType(toolType)
    ? toolType
    : isProposalCardType(data?.type)
      ? data?.type
      : proposalId
        ? STORED_CARD_TYPE[toolType ?? ''] ?? 'routine_proposal'
        : null;
  if (!type) {
    return [];
  }
  return [
    {
      type,
      proposalId,
      version: num(data?.version) ?? 1,
      adjustLabel: str(data?.adjust_label),
      // Proposals keep only their id; discomfort_check keeps its payload.
      payload: data?.payload ?? null,
    },
  ];
}

// ── Edits of the detail sheet ───────────────────────────────────────────────
export type RoutineEdits = {
  // Original exercise_id → chosen variant.
  replace: Record<string, ProposalVariant>;
  remove: string[];
};

export const NO_EDITS: RoutineEdits = { replace: {}, remove: [] };

export const hasEdits = (edits: RoutineEdits) =>
  edits.remove.length > 0 || Object.keys(edits.replace).length > 0;

export function editsPayload(edits: RoutineEdits) {
  return {
    replace: Object.entries(edits.replace).map(([from, to]) => ({
      from_exercise_id: from,
      to_exercise_id: to.exerciseId,
    })),
    remove: edits.remove,
  };
}

// ── Actions ─────────────────────────────────────────────────────────────────
export type ProposalErrorCode =
  | 'proposal_not_open'
  | 'invalid_edits'
  | 'min_one_exercise'
  | 'version_limit'
  | 'not_found'
  | 'unauthorized'
  // activate_nutrition_plan (nut-1): another plan is active (confirm to
  // replace it) · the plan does not pass the server's checks.
  | 'plan_active_exists'
  | 'plan_invalid'
  // plan_routine_for_day / unplan_routine_for_day (prop-2).
  | 'day_has_routine'
  // tp-1.2: the day holds a session of the training plan.
  | 'day_has_plan_session'
  | 'past_day'
  | 'routine_not_found'
  | 'offline'
  | 'unknown';

const KNOWN: readonly ProposalErrorCode[] = [
  'proposal_not_open',
  'invalid_edits',
  'min_one_exercise',
  'version_limit',
  'not_found',
  'unauthorized',
  'plan_active_exists',
  'plan_invalid',
  'day_has_routine',
  'day_has_plan_session',
  'past_day',
  'routine_not_found',
];

export class ProposalError extends Error {
  readonly code: ProposalErrorCode;
  // day_has_routine: the routine the day already has.
  readonly existing: { routineId: string | null; name: string } | null;
  // day_has_plan_session: `{ plan_session_id, title, session_type }`, flat.
  readonly planSession: { id: string | null; title: string; type: string | null } | null;
  constructor(
    code: ProposalErrorCode,
    message?: string | null,
    existing: { routineId: string | null; name: string } | null = null,
    planSession: { id: string | null; title: string; type: string | null } | null = null,
  ) {
    super(message ?? code);
    this.name = 'ProposalError';
    this.code = code;
    this.existing = existing;
    this.planSession = planSession;
  }
}

const isNetworkError = (error: unknown) =>
  /network|fetch|timed? ?out|offline/i.test(
    error instanceof Error ? error.message : String((error as { message?: unknown })?.message ?? error),
  );

// An RPC of the proposals and nut-1: `{ ok, … }` or a ProposalError.
export async function call(name: string, args: Raw): Promise<Raw> {
  const client = getSupabaseClient() as unknown as {
    rpc: (
      rpc: string,
      params: object,
    ) => Promise<{ data: unknown; error: { message?: string; code?: string } | null }>;
  } | null;
  if (!client) {
    throw new ProposalError('unknown', 'Supabase no está configurado.');
  }
  let response: Awaited<ReturnType<typeof client.rpc>>;
  try {
    response = await client.rpc(name, args);
  } catch (thrown) {
    throw new ProposalError(isNetworkError(thrown) ? 'offline' : 'unknown', String(thrown));
  }
  const { data, error } = response;
  if (error) {
    throw new ProposalError(
      error.code === '42501' ? 'unauthorized' : isNetworkError(error) ? 'offline' : 'unknown',
      error.message ?? null,
    );
  }
  const body = rec(data) ?? {};
  if (body.ok !== true) {
    // Flat ({ ok:false, error:"code" }) or nested ({ error: { code, message } }).
    const nested = rec(body.error);
    const raw = str(body.error) ?? str(nested?.code);
    const code = KNOWN.find(item => item === raw) ?? 'unknown';
    const found = rec(body.existing) ?? rec(nested?.existing);
    throw new ProposalError(
      code,
      str(nested?.message) ?? raw,
      found ? { routineId: str(found.routine_id), name: str(found.name) ?? '' } : null,
      code === 'day_has_plan_session'
        ? {
            id: str(body.plan_session_id),
            title: str(body.title) ?? '',
            type: str(body.session_type),
          }
        : null,
    );
  }
  return body;
}

export async function getProposal(id: string): Promise<StoredProposal | null> {
  return parseStoredProposal(id, await call('get_proposal', { p_id: id }));
}

export async function saveRoutineProposal(
  id: string,
  edits: RoutineEdits,
  clientId: string,
): Promise<{ routineId: string | null }> {
  const body = await call('save_routine_proposal', {
    p_id: id,
    p_edits: editsPayload(edits),
    p_client_id: clientId,
  });
  return { routineId: str(body.routine_id) };
}

export async function startRoutineProposal(
  id: string,
  edits: RoutineEdits,
  clientId: string,
): Promise<{ sessionId: string | null; workoutId: string | null }> {
  const body = await call('start_routine_proposal', {
    p_id: id,
    p_edits: editsPayload(edits),
    p_client_id: clientId,
  });
  return { sessionId: str(body.session_id), workoutId: str(rec(body.workout)?.id) };
}

export async function discardProposal(id: string): Promise<void> {
  await call('discard_proposal', { p_id: id });
}

// plan_routine_for_day (prop-2): exactly one reference (a library routine or
// an open proposal) and a client id, so a retry never plans twice. A day that
// has a routine fails with day_has_routine (`existing`) until replace is true.
export async function planRoutineForDay(args: {
  date: string;
  routineId?: string | null;
  proposalId?: string | null;
  replace?: boolean;
  clientId: string;
}): Promise<{ date: string; routineId: string | null; name: string }> {
  const body = await call('plan_routine_for_day', {
    p_date: args.date,
    p_routine_id: args.routineId ?? null,
    p_proposal_id: args.proposalId ?? null,
    p_replace: args.replace ?? false,
    p_client_id: args.clientId,
  });
  return {
    date: str(body.date) ?? args.date,
    routineId: str(body.routine_id),
    name: str(body.name) ?? '',
  };
}

export async function unplanRoutineForDay(date: string): Promise<void> {
  await call('unplan_routine_for_day', { p_date: date });
}
