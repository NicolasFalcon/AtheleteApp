import { isNetworkError } from '@app/features/session/sessionOutbox';
import { EllieError } from '@app/services/ellie/ellieService';
import { getSupabaseClient } from '@app/services/supabase/client';
import {
  MEAL_TYPES,
  parseMealItems,
  parseMealType,
  type MealItem,
  type MealTotals,
  type MealType,
} from '@app/services/vision/visionService';

// Meals of Calorías (docs/backend/VISION_SHAPES.md §4). Everything is written
// through RPCs (never to daily_nutrition_logs: the server keeps the day's
// total from the meals).

export type MealSource = 'photo' | 'repeat' | 'manual' | 'chat';

export type Meal = {
  id: string;
  localDate: string;
  mealType: MealType;
  source: MealSource;
  title: string;
  items: MealItem[];
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
  imagePath: string | null;
  confidence: number | null;
  repeatedFrom: string | null;
  chatMessageId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GoalSource = 'plan' | 'profile' | 'none';

export type DayGoal = {
  source: GoalSource;
  planId: string | null;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
};

export type NutritionDay = {
  date: string;
  isToday: boolean;
  meals: Meal[];
  totals: MealTotals;
  goal: DayGoal;
  // null when there is no goal.
  remaining: MealTotals | null;
};

export type SaveMealInput = {
  source: 'photo' | 'manual' | 'chat';
  mealType: MealType;
  title: string;
  items?: MealItem[];
  kcal: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  localDate?: string;
  imagePath?: string | null;
  confidence?: number | null;
  chatMessageId?: string | null;
};

export type UpdateMealInput = Partial<{
  mealType: MealType;
  localDate: string;
  title: string;
  items: MealItem[];
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
}>;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
const num = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const nullableNum = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;
const str = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);
const nullableStr = (value: unknown): string | null => (typeof value === 'string' && value ? value : null);

export function parseMeal(value: unknown): Meal | null {
  const row = asRecord(value);
  if (!row || typeof row.id !== 'string') {
    return null;
  }
  const source = row.source;
  return {
    id: row.id,
    localDate: str(row.local_date),
    mealType: parseMealType(row.meal_type) ?? 'snack',
    source: source === 'photo' || source === 'repeat' || source === 'chat' ? source : 'manual',
    title: str(row.title),
    items: parseMealItems(row.items),
    kcal: num(row.kcal),
    protein: num(row.protein),
    carbs: num(row.carbs),
    fats: num(row.fats),
    imagePath: nullableStr(row.image_path),
    confidence: nullableNum(row.confidence),
    repeatedFrom: nullableStr(row.repeated_from),
    chatMessageId: nullableStr(row.chat_message_id),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

const parseMeals = (value: unknown): Meal[] =>
  (Array.isArray(value) ? value : []).flatMap(raw => {
    const meal = parseMeal(raw);
    return meal ? [meal] : [];
  });

const parseTotals = (value: unknown): MealTotals => {
  const row = asRecord(value);
  return { kcal: num(row?.kcal), protein: num(row?.protein), carbs: num(row?.carbs), fats: num(row?.fats) };
};

export function parseNutritionDay(body: unknown): NutritionDay {
  const record = asRecord(body);
  if (!record || record.ok !== true) {
    throw failure(record);
  }
  const goal = asRecord(record.goal);
  const source: GoalSource = goal?.source === 'plan' || goal?.source === 'profile' ? goal.source : 'none';
  const remaining = asRecord(record.remaining);
  return {
    date: str(record.date),
    isToday: record.is_today === true,
    meals: parseMeals(record.meals),
    totals: parseTotals(record.totals),
    goal: {
      source,
      planId: nullableStr(goal?.plan_id),
      kcal: source === 'none' ? null : nullableNum(goal?.kcal),
      protein: source === 'none' ? null : nullableNum(goal?.protein),
      carbs: source === 'none' ? null : nullableNum(goal?.carbs),
      fats: source === 'none' ? null : nullableNum(goal?.fats),
    },
    remaining:
      source === 'none' || !remaining || remaining.kcal === null || remaining.kcal === undefined
        ? null
        : parseTotals(remaining),
  };
}

// `{ ok:false, error, field? }` → an EllieError with the same code.
function failure(record: Record<string, unknown> | null): EllieError {
  const code = record?.error;
  return new EllieError(
    code === 'unauthorized' || code === 'invalid_input' || code === 'image_forbidden' || code === 'not_found'
      ? code
      : 'unknown',
    { message: typeof record?.field === 'string' ? `field:${record.field}` : undefined },
  );
}

type RpcClient = {
  rpc: (name: string, args?: object) => Promise<{ data: unknown; error: { message?: string; code?: string } | null }>;
};

export type MealsRpc = (name: string, args?: object) => Promise<unknown>;

const supabaseRpc: MealsRpc = async (name, args) => {
  const client = getSupabaseClient() as unknown as RpcClient | null;
  if (!client) {
    throw new EllieError('unknown', { message: 'Supabase no está configurado.' });
  }
  const { data, error } = await client.rpc(name, args);
  if (error) {
    throw new EllieError(isNetworkError(error) ? 'offline' : 'unknown', { message: error.message });
  }
  return data;
};

const itemPayload = (item: MealItem) => ({
  name: item.name,
  grams: Math.round(item.grams),
  kcal: Math.round(item.kcal),
  protein: Math.round(item.protein),
  carbs: Math.round(item.carbs),
  fats: Math.round(item.fats),
});

export function savePayload(input: SaveMealInput) {
  return {
    source: input.source,
    meal_type: input.mealType,
    title: input.title,
    ...(input.items ? { items: input.items.map(itemPayload) } : {}),
    kcal: Math.round(input.kcal),
    ...(input.protein !== undefined ? { protein: Math.round(input.protein) } : {}),
    ...(input.carbs !== undefined ? { carbs: Math.round(input.carbs) } : {}),
    ...(input.fats !== undefined ? { fats: Math.round(input.fats) } : {}),
    ...(input.localDate ? { local_date: input.localDate } : {}),
    ...(input.imagePath ? { image_path: input.imagePath } : {}),
    ...(input.confidence !== undefined && input.confidence !== null ? { confidence: input.confidence } : {}),
    ...(input.chatMessageId ? { chat_message_id: input.chatMessageId } : {}),
  };
}

export function updatePayload(input: UpdateMealInput) {
  return {
    ...(input.mealType ? { meal_type: input.mealType } : {}),
    ...(input.localDate ? { local_date: input.localDate } : {}),
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.items ? { items: input.items.map(itemPayload) } : {}),
    ...(input.kcal !== undefined ? { kcal: Math.round(input.kcal) } : {}),
    ...(input.protein !== undefined ? { protein: Math.round(input.protein) } : {}),
    ...(input.carbs !== undefined ? { carbs: Math.round(input.carbs) } : {}),
    ...(input.fats !== undefined ? { fats: Math.round(input.fats) } : {}),
  };
}

function mealOf(data: unknown): Meal {
  const record = asRecord(data);
  const meal = record?.ok === true ? parseMeal(record.meal) : null;
  if (!meal) {
    throw failure(record);
  }
  return meal;
}

export function createMealsService(rpc: MealsRpc = supabaseRpc) {
  return {
    async getDay(date?: string): Promise<NutritionDay> {
      return parseNutritionDay(await rpc('get_nutrition_day', date ? { _date: date } : {}));
    },

    async getRecent(limit = 20): Promise<Meal[]> {
      const record = asRecord(await rpc('get_recent_meals', { _limit: limit }));
      if (record?.ok !== true) {
        throw failure(record);
      }
      return parseMeals(record.meals);
    },

    async save(input: SaveMealInput): Promise<Meal> {
      return mealOf(await rpc('save_meal', { _payload: savePayload(input) }));
    },

    async update(id: string, input: UpdateMealInput): Promise<Meal> {
      return mealOf(await rpc('update_meal', { _id: id, _payload: updatePayload(input) }));
    },

    async remove(id: string): Promise<void> {
      const record = asRecord(await rpc('delete_meal', { _id: id }));
      if (record?.ok !== true) {
        throw failure(record);
      }
    },

    async repeat(id: string, options: { localDate?: string; mealType?: MealType } = {}): Promise<Meal> {
      return mealOf(
        await rpc('repeat_meal', {
          _id: id,
          ...(options.localDate ? { _local_date: options.localDate } : {}),
          ...(options.mealType ? { _meal_type: options.mealType } : {}),
        }),
      );
    },
  };
}

export const mealsService = createMealsService();
export { MEAL_TYPES };

// Which chat messages already became a meal (a card never registers twice,
// also after the app restarts). The owner can read the table directly.
export async function fetchMealsByChatMessage(
  messageIds: readonly string[],
): Promise<Record<string, { id: string; mealType: MealType }>> {
  if (messageIds.length === 0) {
    return {};
  }
  const client = getSupabaseClient() as unknown as {
    from: (table: string) => any;
  } | null;
  if (!client) {
    return {};
  }
  const { data, error } = await client
    .from('nutrition_meals')
    .select('id, meal_type, chat_message_id')
    .in('chat_message_id', [...messageIds]);
  if (error) {
    return {};
  }
  const found: Record<string, { id: string; mealType: MealType }> = {};
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    if (typeof row.chat_message_id === 'string' && typeof row.id === 'string') {
      found[row.chat_message_id] = { id: row.id, mealType: parseMealType(row.meal_type) ?? 'snack' };
    }
  }
  return found;
}
