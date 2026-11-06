import { parseIngredient, parseMeal, type PlanIngredient, type PlanMeal } from '@app/services/ellie/nutritionProposals';
import { call, NutritionError } from '@app/services/supabase/nutritionDay';

// Nutrición · Plan y Compras (contract nut-1 §3): get_nutrition_plan of the
// active plan. Real shape (checked against the deployed function):
//   { ok, week_start, plan: {…}, days: [7 × { date, kcal, type, meals[] }],
//     shopping: [{ name, qty, unit }], recalibration: null | {…},
//     logged_from_plan: [] }
// Each day is identified by days[].date, never by its position. Macros come
// as p / c / g. "No plan": ok false with no_plan, plan null or days empty.

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
const isDate = (value: string | null): value is string => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));

export type ActivePlanMeal = PlanMeal & {
  // Registered already (meals[].logged or logged_from_plan).
  logged: boolean;
  // Server index (0-based) of each shown equivalent: p_equivalent_index.
  // Kept apart because the parser skips malformed rows and shows at most 3.
  equivalentIndexes: number[];
};

// Goals of ONE day (days[].targets), the same figures get_nutrition_day
// shows in Hoy for that date. kcal falls back to days[].kcal.
export type DayTargets = { kcal: number; protein: number | null; carbs: number | null; fat: number | null };

export type ActivePlanDay = {
  date: string;
  // ISO weekday, 1 = Monday … 7 = Sunday (days[].weekday when sent, else
  // from the date): what swap_plan_meal receives as p_weekday.
  weekday: number;
  type: 'train' | 'rest';
  kcal: number;
  targets: DayTargets;
  meals: ActivePlanMeal[];
};

export type ShoppingItem = PlanIngredient & { category: string | null };

export type ActivePlan = {
  weekStart: string | null;
  plan: {
    id: string;
    status: string | null;
    version: number | null;
    goal: string | null;
    activatedAt: string | null;
    // Daily goals of the plan, when the object brings them.
    targets: { kcal: number | null; p: number | null; c: number | null; g: number | null } | null;
  };
  days: ActivePlanDay[];
  shopping: ShoppingItem[];
  // null when there is none (and then nothing is shown).
  recalibration: { text: string | null } | null;
  // targets_outdated: saved targets differ more than 5 % from the current
  // calculation (Plan shows "Tus objetivos cambiaron").
  targetsOutdated: boolean;
};

function isoWeekday(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  const day = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
  return day === 0 ? 7 : day;
}

function dayTargetsOf(row: Raw): DayTargets {
  const t = rec(row.targets) ?? {};
  return {
    kcal: num(t.kcal) ?? num(row.kcal) ?? 0,
    protein: num(t.protein_g ?? t.p),
    carbs: num(t.carbs_g ?? t.c),
    fat: num(t.fat_g ?? t.g),
  };
}

// A meal of the plan (days[].meals[] or the `meal` of swap_plan_meal).
function planMealOf(row: Raw, logged: boolean): ActivePlanMeal {
  const rawEquivalents = Array.isArray(row.equivalents) ? row.equivalents : [];
  const equivalentIndexes = rawEquivalents
    .map((item, index) => (rec(item) ? index : -1))
    .filter(index => index >= 0)
    .slice(0, 3);
  return { ...parseMeal(row), logged, equivalentIndexes };
}

function targetsOf(plan: Raw): ActivePlan['plan']['targets'] {
  const t = rec(plan.targets) ?? rec(plan.goals);
  if (!t) {
    return null;
  }
  return {
    kcal: num(t.kcal),
    p: num(t.p ?? t.protein_g ?? t.protein),
    c: num(t.c ?? t.carbs_g ?? t.carbs),
    g: num(t.g ?? t.fat_g ?? t.fat),
  };
}

// logged_from_plan: `{ date, slot }` rows (or "date:slot" strings).
function loggedKeys(value: unknown): Set<string> {
  const keys = new Set<string>();
  if (!Array.isArray(value)) {
    return keys;
  }
  value.forEach(item => {
    if (typeof item === 'string') {
      keys.add(item);
      return;
    }
    const row = rec(item);
    const date = str(row?.date) ?? str(row?.local_date);
    const slot = str(row?.slot);
    if (date && slot) {
      keys.add(`${date}:${slot}`);
    }
  });
  return keys;
}

function shoppingOf(value: unknown): ShoppingItem[] {
  return list(value)
    .map(row => ({ ...parseIngredient(row), category: str(row.category) ?? str(row.group) }))
    .filter(item => item.name);
}

export function parseActivePlan(body: Raw): ActivePlan | null {
  const plan = rec(body.plan);
  const planId = str(plan?.id) ?? str(plan?.plan_id);
  const logged = loggedKeys(body.logged_from_plan);
  const days = list(body.days)
    .map((row): ActivePlanDay | null => {
      const date = str(row.date);
      if (!isDate(date)) {
        return null;
      }
      const weekday = num(row.weekday);
      return {
        date,
        weekday: weekday !== null && weekday >= 1 && weekday <= 7 ? weekday : isoWeekday(date),
        type: row.type === 'train' ? 'train' : 'rest',
        kcal: num(row.kcal) ?? 0,
        targets: dayTargetsOf(row),
        meals: list(row.meals).map(meal =>
          planMealOf(meal, meal.logged === true || logged.has(`${date}:${str(meal.slot) ?? ''}`)),
        ),
      };
    })
    .filter((day): day is ActivePlanDay => day !== null)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!plan || !planId || days.length === 0) {
    return null;
  }

  const recalibration = rec(body.recalibration);
  return {
    weekStart: str(body.week_start),
    plan: {
      id: planId,
      status: str(plan.status),
      version: num(plan.version),
      goal: str(plan.goal) ?? str(rec(plan.targets)?.goal),
      activatedAt: str(plan.activated_at),
      targets: targetsOf(plan),
    },
    days,
    shopping: shoppingOf(body.shopping),
    targetsOutdated: body.targets_outdated === true,
    recalibration: recalibration
      ? { text: str(recalibration.text) ?? str(recalibration.message) ?? str(recalibration.copy) }
      : null,
  };
}

// The active plan of the week that starts on `weekStart` (local Monday).
// null: no plan (no_plan, plan null or no days). Other failures throw.
export async function fetchNutritionPlan(weekStart: string, tz: string): Promise<ActivePlan | null> {
  let body: Raw;
  try {
    body = await call('get_nutrition_plan', { p_week_start: weekStart, p_tz: tz });
  } catch (error) {
    if (error instanceof NutritionError) {
      console.warn(`[nutrition] get_nutrition_plan failed (${error.code}${error.detail ? `: ${error.detail}` : ''})`);
      if (error.code === 'no_plan') {
        return null;
      }
    }
    throw error;
  }
  const parsed = parseActivePlan(body);
  if (parsed?.weekStart && parsed.weekStart !== weekStart) {
    console.warn(`[nutrition] get_nutrition_plan week_start ${parsed.weekStart} ≠ requested ${weekStart}`);
  }
  return parsed;
}

// Cambiar a un equivalente, solo ese día. The server finds the day by
// weekday (ISO, 1 = Monday … 7 = Sunday, days[].weekday) and counts
// p_equivalent_index from 0. It answers the new `meal` and the recomputed
// `shopping`, which update the screen without reloading the plan.
export type SwapResult = { meal: ActivePlanMeal | null; shopping: ShoppingItem[] | null };

export async function swapPlanMeal(params: {
  planId: string;
  weekday: number;
  slot: string;
  equivalentIndex: number;
}): Promise<SwapResult> {
  const body = await call('swap_plan_meal', {
    p_plan_id: params.planId,
    p_weekday: params.weekday,
    p_slot: params.slot,
    p_equivalent_index: params.equivalentIndex,
  });
  const meal = rec(body.meal);
  return {
    meal: meal ? planMealOf(meal, false) : null,
    shopping: Array.isArray(body.shopping) ? shoppingOf(body.shopping) : null,
  };
}

// swap_plan_meal errors (read from the function): invalid_input (also the
// equivalent of another time of day), unauthorized, not_found and
// plan_not_active. Anything else is 'other' (generic message).
export type SwapErrorKind = 'invalid_input' | 'plan_not_active' | 'not_found' | 'other';

export function swapErrorKind(error: unknown): SwapErrorKind {
  const code = error instanceof NutritionError ? error.serverCode : null;
  return code === 'invalid_input' || code === 'plan_not_active' || code === 'not_found' ? code : 'other';
}

// The plan with one day's meal replaced (and the new shopping list).
export function applySwap(plan: ActivePlan, date: string, slot: string, result: SwapResult): ActivePlan {
  return {
    ...plan,
    days: result.meal
      ? plan.days.map(day =>
          day.date !== date
            ? day
            : {
                ...day,
                meals: day.meals.map(meal =>
                  meal.slot === slot ? { ...(result.meal as ActivePlanMeal), slot: meal.slot } : meal,
                ),
              },
        )
      : plan.days,
    shopping: result.shopping ?? plan.shopping,
  };
}
