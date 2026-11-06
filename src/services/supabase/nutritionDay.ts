import { isNetworkError } from '@app/features/session/sessionOutbox';
import { getSupabaseClient } from '@app/services/supabase/client';
import {
  AI_REQUEST_TIMEOUT_MS,
  EllieError,
  invokeFunction,
} from '@app/services/ellie/ellieService';
import { parseVisionError } from '@app/services/vision/visionService';

// Nutrición v2 · Hoy (contract nut-1, docs/backend/NUTRITION_SHAPES.md). The
// server computes every figure (targets, remaining, water, adherence): the
// app only shows them. Signatures checked against the deployed functions;
// errors come as `{ ok: false, error: "code" }` (a string) or as
// `{ error: { code, message } }`: both are read.

export type NutritionSlot = 'desayuno' | 'almuerzo' | 'cena' | 'snacks';
export const NUTRITION_SLOTS: readonly NutritionSlot[] = ['desayuno', 'almuerzo', 'cena', 'snacks'];

export type DayType = 'training' | 'rest';
export type MomentTag = 'pre_entreno' | 'post_entreno' | null;
export type EntrySource = 'foto' | 'texto' | 'codigo' | 'plan' | 'reciente' | 'kcal_rapidas';
export type SupplementMoment = 'manana' | 'tarde' | 'noche';
export const SUPPLEMENT_MOMENTS: readonly SupplementMoment[] = ['manana', 'tarde', 'noche'];
export type SupplementType = 'vitamina' | 'mineral' | 'creatina' | 'omega' | 'proteina' | 'otro';
export const SUPPLEMENT_TYPES: readonly SupplementType[] = [
  'vitamina',
  'mineral',
  'creatina',
  'omega',
  'proteina',
  'otro',
];

export type Macros = { kcal: number; p: number; c: number; g: number };

export type NutritionTargets = {
  source: 'plan' | 'profile_estimate';
  // coach-1: the active plan is the coach's (target_source = 'coach').
  fromCoach?: boolean;
  coachName?: string | null;
  dayType: DayType;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  water: { ml: number; glasses: number };
  calc: {
    bmr: number | null;
    activityFactor: number | null;
    trainingDays: number | null;
    goal: string | null;
    goalAdjustPct: number | null;
    safetyApplied: boolean;
    minorProtection: boolean;
  } | null;
  trainingAdjust: { enabled: boolean; trainKcal: number | null; restKcal: number | null };
};

export type MealEntry = Macros & {
  id: string;
  name: string;
  time: string | null;
  source: EntrySource | null;
  photoUrl: string | null;
};

export type PlannedMeal = Macros & { name: string; logged: boolean };

export type NutritionMoment = {
  slot: NutritionSlot;
  kcal: number;
  entries: MealEntry[];
  planned: PlannedMeal | null;
  tag: MomentTag;
};

export type SupplementStatus = 'taken' | 'pending' | 'upcoming';

export type SupplementDose = {
  supplementId: string;
  name: string;
  type: SupplementType | null;
  dose: string | null;
  status: SupplementStatus;
  takenAt: string | null;
};

export type SupplementMomentDay = {
  moment: SupplementMoment;
  reminderTime: string | null;
  items: SupplementDose[];
};

export type SupplementsDay = {
  moments: SupplementMomentDay[];
  taken: number;
  total: number;
  adherence: { daysComplete: number; days: number } | null;
};

export type NutritionDay = {
  date: string;
  dayType: DayType;
  targets: NutritionTargets;
  consumed: Macros;
  remaining: Macros;
  moments: NutritionMoment[];
  water: { glasses: number; target: number; ml: number };
  supplements: SupplementsDay | null;
  plan: { active: boolean; weekNumber: number | null };
  // targets_outdated: the plan's saved targets differ more than 5 % from
  // the current calculation (Hoy shows "Tus objetivos cambiaron").
  targetsOutdated: boolean;
};

export type FoodItem = {
  name: string;
  grams: number | null;
  kcal: number;
  p: number;
  c: number;
  g: number;
  estimate?: boolean;
};

export type SavedFood = FoodItem & { id: string | null; entryId: string | null; favorite: boolean };

export type Supplement = {
  id: string;
  name: string;
  type: SupplementType;
  dose: string;
  moments: SupplementMoment[];
  reminderTimes: Partial<Record<SupplementMoment, string>>;
  remind: boolean;
  countsAsMeal: boolean;
  kcal: number | null;
  p: number | null;
  c: number | null;
  g: number | null;
};

export type SupplementInput = Omit<Supplement, 'id'> & { id: string | null };

export type NutritionErrorCode =
  | 'unauthorized'
  | 'offline'
  | 'not_found'
  | 'invalid'
  | 'no_plan'
  | 'unknown';

export class NutritionError extends Error {
  code: NutritionErrorCode;
  detail: string | null;
  // The code exactly as the server sent it (invalid_input, plan_not_active…),
  // for calls whose codes need their own message. null: not an ok:false.
  serverCode: string | null;
  constructor(code: NutritionErrorCode, detail: string | null = null, serverCode: string | null = null) {
    super(detail ?? code);
    this.name = 'NutritionError';
    this.code = code;
    this.detail = detail;
    this.serverCode = serverCode;
  }
}

type Raw = Record<string, unknown>;

const rec = (value: unknown): Raw | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Raw) : null;
const arr = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const str = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value : null;
const num = (value: unknown): number | null => {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};
const n0 = (value: unknown): number => num(value) ?? 0;
const bool = (value: unknown): boolean => value === true;

function errorCode(raw: string | null): NutritionErrorCode {
  switch (raw) {
    case 'unauthorized':
    case 'not_found':
    case 'no_plan':
      return raw;
    case 'not_authenticated':
      return 'unauthorized';
    case 'entry_not_found':
    case 'supplement_not_found':
      return 'not_found';
    case null:
      return 'unknown';
    default:
      return 'invalid';
  }
}

export async function call(name: string, args: Raw): Promise<Raw> {
  const client = getSupabaseClient() as unknown as {
    rpc: (
      rpc: string,
      params: object,
    ) => Promise<{ data: unknown; error: { message?: string; code?: string } | null }>;
  } | null;
  if (!client) {
    throw new NutritionError('unknown', 'Supabase no está configurado.');
  }
  let response: Awaited<ReturnType<typeof client.rpc>>;
  try {
    response = await client.rpc(name, args);
  } catch (thrown) {
    throw new NutritionError(isNetworkError(thrown) ? 'offline' : 'unknown', String(thrown));
  }
  const { data, error } = response;
  if (error) {
    throw new NutritionError(
      error.code === '42501' ? 'unauthorized' : isNetworkError(error) ? 'offline' : 'unknown',
      error.message ?? null,
    );
  }
  const body = rec(data) ?? {};
  if (body.ok !== true) {
    const nested = rec(body.error);
    const raw = str(body.error) ?? str(nested?.code);
    throw new NutritionError(errorCode(raw), str(nested?.message) ?? raw, raw);
  }
  return body;
}

// ── Parsers ─────────────────────────────────────────────────────────────────

const SLOT_ALIASES: Record<string, NutritionSlot> = {
  desayuno: 'desayuno',
  breakfast: 'desayuno',
  almuerzo: 'almuerzo',
  comida: 'almuerzo',
  lunch: 'almuerzo',
  cena: 'cena',
  dinner: 'cena',
  snacks: 'snacks',
  snack: 'snacks',
  merienda: 'snacks',
  // Plans of 5 meals (nut-1 week[].meals[].slot): the mid-morning meal goes
  // with the snacks, never dropped.
  media_manana: 'snacks',
  mid_morning: 'snacks',
};

// Several server moments can land on the same section (comida + almuerzo,
// merienda + snacks, media_manana + snacks). Hoy shows ONE section per slot
// and used to keep only the first of them: the other entries were counted in
// "N registros" but never shown. They are merged into one moment.
function mergeMoments(moments: NutritionMoment[]): NutritionMoment[] {
  const bySlot = new Map<NutritionSlot, NutritionMoment>();
  moments.forEach(moment => {
    const current = bySlot.get(moment.slot);
    if (!current) {
      bySlot.set(moment.slot, { ...moment, entries: [...moment.entries] });
      return;
    }
    bySlot.set(moment.slot, {
      slot: moment.slot,
      kcal: current.kcal + moment.kcal,
      entries: [...current.entries, ...moment.entries],
      planned: current.planned ?? moment.planned,
      tag: current.tag ?? moment.tag,
    });
  });
  return [...bySlot.values()];
}

const slotOf = (value: unknown): NutritionSlot | null => SLOT_ALIASES[String(value ?? '').toLowerCase()] ?? null;

const SOURCES: readonly EntrySource[] = ['foto', 'texto', 'codigo', 'plan', 'reciente', 'kcal_rapidas'];
const sourceOf = (value: unknown): EntrySource | null =>
  (SOURCES as readonly string[]).includes(String(value)) ? (value as EntrySource) : null;

const momentOf = (value: unknown): SupplementMoment | null =>
  (SUPPLEMENT_MOMENTS as readonly string[]).includes(String(value)) ? (value as SupplementMoment) : null;

function macrosOf(value: unknown): Macros {
  const r = rec(value) ?? {};
  return {
    kcal: n0(r.kcal),
    p: n0(r.p ?? r.protein ?? r.protein_g),
    c: n0(r.c ?? r.carbs ?? r.carbs_g),
    g: n0(r.g ?? r.fat ?? r.fat_g ?? r.fats),
  };
}

export function parseTargets(value: unknown): NutritionTargets {
  const r = rec(value) ?? {};
  const water = rec(r.water) ?? {};
  const calc = rec(r.calc);
  const adjust = rec(r.training_adjust) ?? {};
  const fromCoach = r.target_source === 'coach' || r.source === 'coach';
  return {
    source: r.source === 'plan' || fromCoach ? 'plan' : 'profile_estimate',
    fromCoach,
    coachName: str(r.coach_name),
    dayType: r.day_type === 'training' ? 'training' : 'rest',
    kcal: n0(r.kcal),
    protein: n0(r.protein_g),
    carbs: n0(r.carbs_g),
    fat: n0(r.fat_g),
    water: { ml: n0(water.ml), glasses: n0(water.glasses) },
    calc: calc
      ? {
          bmr: num(calc.bmr),
          activityFactor: num(calc.activity_factor),
          trainingDays: num(calc.training_days),
          goal: str(calc.goal),
          goalAdjustPct: num(calc.goal_adjust_pct),
          safetyApplied: bool(calc.safety_applied),
          minorProtection: bool(calc.minor_protection),
        }
      : null,
    trainingAdjust: {
      enabled: bool(adjust.enabled),
      trainKcal: num(adjust.train_kcal),
      restKcal: num(adjust.rest_kcal),
    },
  };
}

function parseEntry(value: unknown): MealEntry | null {
  const r = rec(value);
  const id = str(r?.id);
  if (!r || !id) {
    return null;
  }
  return {
    id,
    name: str(r.name) ?? '',
    ...macrosOf(r),
    time: str(r.time),
    source: sourceOf(r.source),
    photoUrl: str(r.photo_url),
  };
}

function parseMoment(value: unknown): NutritionMoment | null {
  const r = rec(value);
  const slot = slotOf(r?.slot);
  if (!r || !slot) {
    return null;
  }
  const planned = rec(r.planned);
  return {
    slot,
    kcal: n0(r.kcal),
    entries: arr(r.entries).map(parseEntry).filter((e): e is MealEntry => e !== null),
    planned: planned
      ? { name: str(planned.name) ?? '', ...macrosOf(planned), logged: bool(planned.logged) }
      : null,
    tag: r.tag === 'pre_entreno' || r.tag === 'post_entreno' ? r.tag : null,
  };
}

const STATUSES: readonly SupplementStatus[] = ['taken', 'pending', 'upcoming'];

function parseDose(value: unknown): SupplementDose | null {
  const r = rec(value);
  const supplementId = str(r?.supplement_id) ?? str(r?.id);
  if (!r || !supplementId) {
    return null;
  }
  const raw = r.status ?? r.state;
  const takenAt = str(r.taken_at) ?? str(r.time);
  return {
    supplementId,
    name: str(r.name) ?? '',
    type: (SUPPLEMENT_TYPES as readonly unknown[]).includes(r.type) ? (r.type as SupplementType) : null,
    dose: str(r.dose),
    status: (STATUSES as readonly unknown[]).includes(raw)
      ? (raw as SupplementStatus)
      : r.taken === true
      ? 'taken'
      : 'pending',
    takenAt,
  };
}

// get_supplements_day, or the `supplements` block of get_nutrition_day.
export function parseSupplementsDay(value: unknown): SupplementsDay | null {
  const r = rec(value);
  if (!r) {
    return null;
  }
  const list = arr(r.moments ?? r.by_moment);
  const moments = list
    .map(item => {
      const m = rec(item);
      const moment = momentOf(m?.moment);
      if (!m || !moment) {
        return null;
      }
      return {
        moment,
        reminderTime: str(m.reminder_time) ?? str(m.time),
        items: arr(m.items ?? m.supplements)
          .map(parseDose)
          .filter((d): d is SupplementDose => d !== null),
      };
    })
    .filter((m): m is SupplementMomentDay => m !== null && m.items.length > 0);
  const all = moments.flatMap(m => m.items);
  const summary = rec(r.summary);
  const adherence = rec(r.adherence ?? r.adherence_7d);
  return {
    moments,
    taken: num(summary?.taken) ?? all.filter(d => d.status === 'taken').length,
    total: num(summary?.total) ?? all.length,
    adherence: adherence
      ? { daysComplete: n0(adherence.days_complete), days: n0(adherence.days) || 7 }
      : null,
  };
}

export function parseNutritionDay(body: Raw): NutritionDay {
  const parsed = parseTargets(body.targets);
  // target_source / coach_name may come at the top of the day too.
  const coachTop = body.target_source === 'coach';
  const targets =
    coachTop || str(body.coach_name)
      ? {
          ...parsed,
          source: coachTop ? ('plan' as const) : parsed.source,
          fromCoach: parsed.fromCoach || coachTop,
          coachName: parsed.coachName ?? str(body.coach_name),
        }
      : parsed;
  const water = rec(body.water) ?? {};
  const plan = rec(body.plan) ?? {};
  return {
    date: str(body.date) ?? '',
    dayType: body.day_type === 'training' ? 'training' : body.day_type === 'rest' ? 'rest' : targets.dayType,
    targets,
    consumed: macrosOf(body.consumed),
    remaining: macrosOf(body.remaining),
    moments: mergeMoments(
      arr(body.moments)
        .map(parseMoment)
        .filter((m): m is NutritionMoment => m !== null),
    ),
    water: {
      glasses: n0(water.glasses),
      target: n0(water.target) || targets.water.glasses,
      ml: n0(water.ml),
    },
    supplements: parseSupplementsDay(body.supplements),
    plan: { active: bool(plan.active), weekNumber: num(plan.week_number) },
    targetsOutdated: body.targets_outdated === true,
  };
}

function parseFood(value: unknown, favorite: boolean): SavedFood | null {
  const r = rec(value);
  const name = str(r?.name);
  if (!r || !name) {
    return null;
  }
  return {
    id: str(r.id) ?? str(r.food_id),
    entryId: str(r.entry_id),
    name,
    grams: num(r.grams),
    ...macrosOf(r),
    favorite: favorite || bool(r.favorite) || bool(r.is_favorite),
  };
}

function parseSupplement(value: unknown): Supplement | null {
  const r = rec(value);
  const id = str(r?.id);
  if (!r || !id) {
    return null;
  }
  const times = rec(r.reminder_times) ?? {};
  const reminderTimes: Partial<Record<SupplementMoment, string>> = {};
  SUPPLEMENT_MOMENTS.forEach(moment => {
    const time = str(times[moment]);
    if (time) {
      reminderTimes[moment] = time.slice(0, 5);
    }
  });
  return {
    id,
    name: str(r.name) ?? '',
    type: (SUPPLEMENT_TYPES as readonly unknown[]).includes(r.type) ? (r.type as SupplementType) : 'otro',
    dose: str(r.dose) ?? '',
    moments: arr(r.moments).map(momentOf).filter((m): m is SupplementMoment => m !== null),
    reminderTimes,
    remind: bool(r.remind),
    countsAsMeal: bool(r.counts_as_meal),
    kcal: num(r.kcal),
    p: num(r.p),
    c: num(r.c),
    g: num(r.g),
  };
}

// ── Calls ───────────────────────────────────────────────────────────────────

export async function fetchNutritionDay(date: string, tz: string): Promise<NutritionDay> {
  return parseNutritionDay(await call('get_nutrition_day', { p_date: date, p_tz: tz }));
}

// Only for the breakdown ("Cómo lo calculé"); get_nutrition_day has the rest.
export async function fetchNutritionTargets(date: string, tz: string): Promise<NutritionTargets> {
  return parseTargets(await call('compute_nutrition_targets', { p_date: date, p_tz: tz }));
}

const itemsPayload = (items: FoodItem[]) =>
  items.map(item => ({
    name: item.name,
    ...(item.grams !== null ? { grams: item.grams } : {}),
    kcal: Math.round(item.kcal),
    p: Math.round(item.p),
    c: Math.round(item.c),
    g: Math.round(item.g),
  }));

// Idempotent by clientId: a retry of the same confirmation never logs twice.
export async function logMealEntry(input: {
  date: string;
  slot: NutritionSlot;
  items: FoodItem[];
  source: EntrySource;
  clientId: string;
}): Promise<void> {
  await call('log_meal_entry', {
    p_date: input.date,
    p_slot: input.slot,
    p_items: itemsPayload(input.items),
    p_source: input.source,
    p_client_id: input.clientId,
  });
}

export async function logPlannedMeal(date: string, slot: NutritionSlot): Promise<void> {
  await call('log_planned_meal', { p_date: date, p_slot: slot });
}

export async function updateMealEntry(input: {
  entryId: string;
  date: string;
  slot: NutritionSlot;
  items: FoodItem[];
}): Promise<void> {
  await call('update_meal_entry', {
    p_entry_id: input.entryId,
    p_date: input.date,
    p_slot: input.slot,
    p_items: itemsPayload(input.items),
  });
}

export async function deleteMealEntry(entryId: string): Promise<void> {
  await call('delete_meal_entry', { p_entry_id: entryId });
}

export async function fetchRecentAndFavorites(): Promise<{ recent: SavedFood[]; favorites: SavedFood[] }> {
  const body = await call('get_recent_and_favorite_foods', {});
  const favorites = arr(body.favorites)
    .map(item => parseFood(item, true))
    .filter((f): f is SavedFood => f !== null);
  const recent = arr(body.recent ?? body.recents)
    .map(item => parseFood(item, false))
    .filter((f): f is SavedFood => f !== null)
    .map(food => ({ ...food, favorite: food.favorite || favorites.some(fav => fav.name === food.name) }));
  return { recent, favorites };
}

// By the entry it came from, or by the food itself (a confirmation not saved
// yet). The server answers with the new state when it gives one.
export async function toggleFavoriteFood(
  target: { entryId: string } | { item: FoodItem },
): Promise<boolean | null> {
  const body = await call(
    'toggle_favorite_food',
    'entryId' in target ? { p_entry_id: target.entryId } : { p_item: itemsPayload([target.item])[0] },
  );
  return typeof body.favorite === 'boolean' ? body.favorite : typeof body.is_favorite === 'boolean' ? body.is_favorite : null;
}

export async function fetchSupplementsDay(date: string, tz: string): Promise<SupplementsDay> {
  return parseSupplementsDay(await call('get_supplements_day', { p_date: date, p_tz: tz })) ?? {
    moments: [],
    taken: 0,
    total: 0,
    adherence: null,
  };
}

export async function listSupplements(): Promise<Supplement[]> {
  const body = await call('list_supplements', {});
  return arr(body.supplements ?? body.items)
    .map(parseSupplement)
    .filter((s): s is Supplement => s !== null);
}

export async function upsertSupplement(input: SupplementInput): Promise<void> {
  const counts = input.type === 'proteina' && input.countsAsMeal;
  await call('upsert_supplement', {
    p_id: input.id,
    p_name: input.name.trim(),
    p_type: input.type,
    p_dose: input.dose.trim(),
    p_moments: input.moments,
    p_reminder_times: input.reminderTimes,
    p_remind: input.remind,
    p_counts_as_meal: counts,
    p_kcal: counts ? input.kcal : null,
    p_p: counts ? input.p : null,
    p_c: counts ? input.c : null,
    p_g: counts ? input.g : null,
  });
}

export async function deleteSupplement(id: string): Promise<void> {
  await call('delete_supplement', { p_id: id });
}

export async function markSupplement(input: {
  supplementId: string;
  date: string;
  moment: SupplementMoment;
  taken: boolean;
  source: 'app' | 'notification';
  clientId: string;
}): Promise<void> {
  await call('mark_supplement', {
    p_supplement_id: input.supplementId,
    p_date: input.date,
    p_moment: input.moment,
    p_taken: input.taken,
    p_source: input.source,
    p_client_id: input.clientId,
  });
}

export async function snoozeSupplementReminder(localDate: string, moment: SupplementMoment): Promise<void> {
  await call('snooze_supplement_reminder', { p_local_date: localDate, p_moment: moment });
}

// ── parse-meal-text ─────────────────────────────────────────────────────────

const invokeParseMealText = invokeFunction('parse-meal-text', { timeoutMs: AI_REQUEST_TIMEOUT_MS });

// "2 huevos y una arepa con queso" → estimated items. Nothing is saved: the
// confirmation calls log_meal_entry. Failures are VisionError / EllieError
// (ai_timeout, quota…), shown with the sheet of Visión.
export async function parseMealText(text: string): Promise<FoodItem[]> {
  let result: { status: number; body: unknown };
  try {
    result = await invokeParseMealText({ text });
  } catch (error) {
    throw error instanceof EllieError ? error : new EllieError('offline', { message: String(error) });
  }
  if (result.status < 200 || result.status >= 300) {
    throw parseVisionError(result.status, result.body);
  }
  const body = rec(result.body) ?? {};
  if (body.ok === false) {
    throw parseVisionError(422, body);
  }
  return arr(body.items)
    .map(item => {
      const r = rec(item);
      const name = str(r?.name);
      if (!r || !name) {
        return null;
      }
      return { name, grams: num(r.grams), ...macrosOf(r), estimate: r.estimate !== false };
    })
    .filter((item): item is FoodItem & { estimate: boolean } => item !== null);
}
