import { call } from '@app/services/ellie/ellieProposals';

// ELLIE · plan nutricional (ELLIE_PROPOSALS_SHAPES §3, NUTRITION_SHAPES nut-1):
// the payload of a nutrition_plan_proposal card, the food preferences of the
// questions card and the activation of the plan. The payload follows
// ELLIE_CARDS_FLOW §4; it is read in camelCase or snake_case.

// ── Food preferences (nut-1 §2) ─────────────────────────────────────────────
export type Allergy = 'lactosa' | 'gluten' | 'frutos_secos' | 'mariscos' | 'otra';
export type Diet = 'omnivora' | 'vegetariana' | 'vegana' | 'sin_cerdo' | 'otra';
export type MealsPerDay = 3 | 4 | 5;

export const ALLERGIES: readonly Allergy[] = ['lactosa', 'gluten', 'frutos_secos', 'mariscos', 'otra'];
export const DIETS: readonly Diet[] = ['omnivora', 'vegetariana', 'vegana', 'sin_cerdo', 'otra'];
export const MEALS_PER_DAY: readonly MealsPerDay[] = [3, 4, 5];

// allergies [] = Ninguna.
export type FoodPrefs = {
  allergies: Allergy[];
  diet: Diet;
  dislikes: string;
  mealsPerDay: MealsPerDay;
};

export const DEFAULT_FOOD_PREFS: FoodPrefs = {
  allergies: [],
  diet: 'omnivora',
  dislikes: '',
  mealsPerDay: 4,
};

// ── Plan payload ────────────────────────────────────────────────────────────
export type PlanIngredient = { name: string; qty: number | null; unit: string };

export type PlanEquivalent = {
  name: string;
  kcal: number;
  p: number;
  c: number;
  g: number;
  ingredients: PlanIngredient[];
};

export type PlanMeal = {
  slot: string;
  time: string | null;
  name: string;
  kcal: number;
  p: number;
  c: number;
  g: number;
  tag: string | null;
  ingredients: PlanIngredient[];
  equivalents: PlanEquivalent[];
};

export type PlanDay = {
  // As the server sends it (the key of p_edits).
  weekday: number;
  // 0 = Monday … 6 = Sunday.
  index: number;
  type: 'train' | 'rest';
  kcal: number;
  meals: PlanMeal[];
};

// Grams and their share of the kcal (P×4, C×4, G×9).
export type PlanMacros = {
  kcal: number;
  p: number;
  c: number;
  g: number;
  pct: { p: number; c: number; g: number };
};

export type NutritionProposal = {
  id: string;
  version: number;
  adjustLabel: string | null;
  // nutrition_plans.id in draft: what activate_nutrition_plan receives.
  planId: string | null;
  goal: string | null;
  kcal: number;
  macros: PlanMacros;
  // With trainingAdjust: the targets of a training / rest day.
  dayTargets: { train: PlanMacros | null; rest: PlanMacros | null };
  calc: {
    bmr: number | null;
    activityFactor: number | null;
    trainingDays: number | null;
    goalAdjustPct: number | null;
    safetyMin: number | null;
    safetyApplied: boolean;
  };
  prefs: FoodPrefs | null;
  reasoning: string | null;
  trainingAdjust: {
    enabled: boolean;
    trainKcal: number | null;
    restKcal: number | null;
    trainNote: string | null;
    restNote: string | null;
  };
  week: PlanDay[];
  shopping: PlanIngredient[];
  quickAdjustments: string[];
};

type Raw = Record<string, unknown>;

const rec = (value: unknown): Raw | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Raw) : null;
const list = (value: unknown): Raw[] =>
  Array.isArray(value) ? value.map(rec).filter((item): item is Raw => item !== null) : [];
const str = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
const num = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
};
const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item !== '') : [];

// The first of the keys present (camelCase or snake_case).
const pick = (row: Raw | null, ...keys: string[]): unknown => {
  if (!row) {
    return undefined;
  }
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) {
      return row[key];
    }
  }
  return undefined;
};

export function parseFoodPrefs(value: unknown): FoodPrefs | null {
  const row = rec(value);
  if (!row) {
    return null;
  }
  const meals = num(pick(row, 'mealsPerDay', 'meals_per_day'));
  return {
    allergies: strings(row.allergies).filter((item): item is Allergy =>
      (ALLERGIES as readonly string[]).includes(item),
    ),
    diet: DIETS.find(item => item === row.diet) ?? 'omnivora',
    dislikes: str(row.dislikes) ?? '',
    mealsPerDay: MEALS_PER_DAY.find(item => item === meals) ?? 4,
  };
}

export function parseIngredient(row: Raw): PlanIngredient {
  return { name: str(row.name) ?? '', qty: num(row.qty), unit: str(row.unit) ?? '' };
}

function parseEquivalent(row: Raw): PlanEquivalent {
  return {
    name: str(row.name) ?? 'Equivalente',
    kcal: num(row.kcal) ?? 0,
    p: num(pick(row, 'p', 'protein_g')) ?? 0,
    c: num(pick(row, 'c', 'carbs_g')) ?? 0,
    g: num(pick(row, 'g', 'fat_g')) ?? 0,
    ingredients: list(row.ingredients).map(parseIngredient).filter(item => item.name),
  };
}

// Also the meals of the active plan (get_nutrition_plan · days[].meals).
export function parseMeal(row: Raw): PlanMeal {
  return {
    ...parseEquivalent(row),
    name: str(row.name) ?? 'Comida',
    slot: str(row.slot) ?? '',
    time: str(row.time),
    tag: str(row.tag),
    equivalents: list(row.equivalents).map(parseEquivalent).slice(0, 3),
  };
}

// weekday as the server numbers it: ISO 1–7 (Monday = 1) or 0–6 with
// Sunday = 0; without it, the position in the week.
function dayIndexes(rows: Raw[]): number[] {
  const values = rows.map(row => num(row.weekday));
  const sundayZero = values.some(value => value === 0);
  return values.map((value, position) => {
    if (value === null || value < 0 || value > 7) {
      return position % 7;
    }
    return sundayZero ? (value + 6) % 7 : (value - 1 + 7) % 7;
  });
}

// The first row that carries each gram (p / protein_g …); the % of the kcal
// when the row does not send it.
function parseMacros(kcal: number, ...rows: (Raw | null)[]): PlanMacros {
  const grams = (...keys: string[]) => {
    for (const row of rows) {
      const value = num(pick(row, ...keys));
      if (value !== null) {
        return value;
      }
    }
    return 0;
  };
  const p = grams('p', 'protein_g');
  const c = grams('c', 'carbs_g');
  const g = grams('g', 'fat_g');
  const pct = rec(pick(rows[0], 'pct', 'percent'));
  const share = (value: number, perGram: number) =>
    kcal > 0 ? Math.round((value * perGram * 100) / kcal) : 0;
  return {
    kcal,
    p,
    c,
    g,
    pct: {
      p: num(pct?.p) ?? share(p, 4),
      c: num(pct?.c) ?? share(c, 4),
      g: num(pct?.g) ?? share(g, 9),
    },
  };
}

export function parseNutritionProposal(
  id: string,
  payloadValue: unknown,
  meta: { version?: number | null; adjustLabel?: string | null } = {},
): NutritionProposal | null {
  const payload = rec(payloadValue);
  if (!payload) {
    return null;
  }
  const weekRows = list(payload.week);
  const indexes = dayIndexes(weekRows);
  const week = weekRows
    .map((row, position): PlanDay => ({
      weekday: num(row.weekday) ?? position + 1,
      index: indexes[position],
      type: row.type === 'rest' ? 'rest' : 'train',
      kcal: num(row.kcal) ?? 0,
      meals: list(row.meals).map(parseMeal),
    }))
    .sort((a, b) => a.index - b.index);

  const kcal = num(pick(payload, 'kcal', 'target_kcal')) ?? week[0]?.kcal ?? 0;
  const calc = rec(payload.calc);
  const targets = rec(payload.targets);
  const adjust = rec(pick(payload, 'trainingAdjust', 'training_adjust'));
  // Grams from payload.macros, payload.calc, payload.targets or the payload.
  const macros = parseMacros(kcal, rec(payload.macros), calc, targets, payload);
  const targetsFor = (type: 'train' | 'rest', adjustKcal: number | null) => {
    const row = rec(targets?.[type]);
    return row ? parseMacros(num(row.kcal) ?? adjustKcal ?? kcal, row) : null;
  };
  const quick = strings(pick(payload, 'quick_adjustments', 'quickAdjustments'));

  return {
    id,
    version: meta.version ?? 1,
    adjustLabel: meta.adjustLabel ?? null,
    planId: str(pick(payload, 'plan_id', 'planId')),
    goal: str(pick(payload, 'goal')) ?? str(calc?.goal),
    kcal,
    macros,
    dayTargets: {
      train: targetsFor('train', num(pick(adjust, 'trainKcal', 'train_kcal'))),
      rest: targetsFor('rest', num(pick(adjust, 'restKcal', 'rest_kcal'))),
    },
    calc: {
      bmr: num(calc?.bmr),
      activityFactor: num(pick(calc, 'activityFactor', 'activity_factor')),
      trainingDays: num(pick(calc, 'trainingDays', 'training_days')),
      goalAdjustPct: num(pick(calc, 'goalAdjustPct', 'goal_adjust_pct')),
      safetyMin: num(pick(calc, 'safetyMin', 'safety_min')),
      safetyApplied: pick(calc, 'safetyApplied', 'safety_applied') === true,
    },
    prefs: parseFoodPrefs(payload.prefs),
    reasoning: str(payload.reasoning),
    trainingAdjust: {
      enabled: pick(adjust, 'enabled') === true,
      trainKcal: num(pick(adjust, 'trainKcal', 'train_kcal')),
      restKcal: num(pick(adjust, 'restKcal', 'rest_kcal')),
      trainNote: str(pick(adjust, 'trainNote', 'train_note')),
      restNote: str(pick(adjust, 'restNote', 'rest_note')),
    },
    week,
    shopping: list(payload.shopping).map(parseIngredient).filter(item => item.name),
    quickAdjustments: quick,
  };
}

// ── Edits of the sheet ──────────────────────────────────────────────────────
// `${weekday}:${slot}` → the chosen equivalent (only that day).
export type PlanEdits = Record<string, number>;

export const planEditKey = (day: PlanDay, meal: PlanMeal) => `${day.weekday}:${meal.slot}`;

export function planEditsPayload(edits: PlanEdits) {
  return Object.entries(edits).map(([key, equivalentIndex]) => {
    const separator = key.indexOf(':');
    return {
      weekday: Number(key.slice(0, separator)),
      slot: key.slice(separator + 1),
      equivalent_index: equivalentIndex,
    };
  });
}

// ── RPC ─────────────────────────────────────────────────────────────────────
export async function getFoodPreferences(): Promise<FoodPrefs | null> {
  const body = await call('get_food_preferences', {});
  return parseFoodPrefs(body.prefs);
}

export async function setFoodPreferences(prefs: FoodPrefs): Promise<void> {
  await call('set_food_preferences', {
    p_allergies: prefs.allergies,
    p_diet: prefs.diet,
    p_dislikes: prefs.dislikes.trim() ? prefs.dislikes.trim() : null,
    p_meals_per_day: prefs.mealsPerDay,
  });
}

// plan_active_exists (another plan is active): confirm and call again with
// confirmReplace = true.
export async function activateNutritionPlan(
  planId: string,
  edits: PlanEdits,
  confirmReplace: boolean,
): Promise<{ planId: string | null }> {
  const body = await call('activate_nutrition_plan', {
    p_plan_id: planId,
    p_edits: planEditsPayload(edits),
    p_confirm_replace: confirmReplace,
  });
  return { planId: str(body.plan_id) };
}
