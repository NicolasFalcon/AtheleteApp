import {
  EllieError,
  invokeFunction,
  parseEllieError,
  type EllieInvoke,
  type InvokeResult,
} from '@app/services/ellie/ellieService';
import { getSupabaseClient } from '@app/services/supabase/client';

// ellie-vision (docs/backend/VISION_SHAPES.md): photo of a meal → editable
// draft (nothing is saved), photo of a machine → equipment and exercises.

export type VisionUsage = {
  kind: string;
  used: number;
  limit: number;
  remaining: number;
};

export type MealItem = {
  name: string;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
};

export type MealTotals = { kcal: number; protein: number; carbs: number; fats: number };

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export const MEAL_TYPES: readonly MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export type MealAnalysis = {
  title: string;
  mealTypeSuggestion: MealType | null;
  items: MealItem[];
  totals: MealTotals;
  confidence: number;
  warnings: string[];
  imagePath: string;
};

export type MachineEquipment = { id: string; slug: string; name: string };
export type MachineCandidate = { equipmentId: string; slug: string; name: string; confidence: number };
export type MachineExercise = { id: string; slug: string; name: string };

export type MachineScan = {
  scanId: string;
  replayed: boolean;
  match: 'confident' | 'ambiguous';
  equipment: MachineEquipment | null;
  confidence: number;
  candidates: MachineCandidate[];
  exerciseIds: string[];
  exercises: MachineExercise[];
  usage: VisionUsage | null;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
const num = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const str = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);

export function parseVisionUsage(value: unknown): VisionUsage | null {
  const record = asRecord(value);
  if (!record || typeof record.used !== 'number' || typeof record.limit !== 'number') {
    return null;
  }
  return {
    kind: str(record.kind),
    used: record.used,
    limit: record.limit,
    remaining: num(record.remaining, Math.max(0, record.limit - record.used)),
  };
}

export function parseMealType(value: unknown): MealType | null {
  return MEAL_TYPES.includes(value as MealType) ? (value as MealType) : null;
}

export function parseMealItems(value: unknown): MealItem[] {
  return (Array.isArray(value) ? value : []).flatMap((raw): MealItem[] => {
    const item = asRecord(raw);
    const name = str(item?.name).trim();
    if (!item || !name) {
      return [];
    }
    return [
      {
        name,
        grams: num(item.grams),
        kcal: num(item.kcal),
        protein: num(item.protein),
        carbs: num(item.carbs),
        fats: num(item.fats),
      },
    ];
  });
}

export function sumItems(items: readonly MealItem[]): MealTotals {
  return items.reduce<MealTotals>(
    (total, item) => ({
      kcal: total.kcal + item.kcal,
      protein: total.protein + item.protein,
      carbs: total.carbs + item.carbs,
      fats: total.fats + item.fats,
    }),
    { kcal: 0, protein: 0, carbs: 0, fats: 0 },
  );
}

// The `draft` of ellie-vision (mode meal) and the `data` of the chat's
// meal_analysis tool share this shape.
export function parseMealAnalysis(value: unknown): MealAnalysis | null {
  const draft = asRecord(value);
  if (!draft) {
    return null;
  }
  const items = parseMealItems(draft.items);
  const totals = asRecord(draft.totals);
  return {
    title: str(draft.title),
    mealTypeSuggestion: parseMealType(draft.meal_type_suggestion),
    items,
    totals: totals
      ? {
          kcal: num(totals.kcal),
          protein: num(totals.protein),
          carbs: num(totals.carbs),
          fats: num(totals.fats),
        }
      : sumItems(items),
    confidence: num(draft.confidence, 1),
    warnings: (Array.isArray(draft.warnings) ? draft.warnings : []).filter(
      (warning): warning is string => typeof warning === 'string',
    ),
    imagePath: str(draft.image_path),
  };
}

export function parseMachineScan(body: unknown): MachineScan {
  const record = asRecord(body);
  if (!record || record.ok !== true || typeof record.scan_id !== 'string') {
    throw new EllieError('unknown', { message: 'Unreadable ellie-vision response' });
  }
  const equipment = asRecord(record.equipment);
  const list = <T,>(value: unknown, map: (row: Record<string, unknown>) => T | null): T[] =>
    (Array.isArray(value) ? value : []).flatMap(raw => {
      const row = asRecord(raw);
      const mapped = row ? map(row) : null;
      return mapped ? [mapped] : [];
    });
  return {
    scanId: record.scan_id,
    replayed: record.replayed === true,
    match: record.match === 'ambiguous' ? 'ambiguous' : 'confident',
    equipment:
      equipment && typeof equipment.id === 'string'
        ? { id: equipment.id, slug: str(equipment.slug), name: str(equipment.name) }
        : null,
    confidence: num(record.confidence),
    candidates: list(record.candidates, row =>
      typeof row.equipment_id === 'string'
        ? { equipmentId: row.equipment_id, slug: str(row.slug), name: str(row.name), confidence: num(row.confidence) }
        : null,
    ),
    exerciseIds: (Array.isArray(record.exercise_ids) ? record.exercise_ids : []).filter(
      (id): id is string => typeof id === 'string',
    ),
    exercises: list(record.exercises, row =>
      typeof row.id === 'string' ? { id: row.id, slug: str(row.slug), name: str(row.name) } : null,
    ),
    usage: parseVisionUsage(record.usage),
  };
}

// ── Errors ──────────────────────────────────────────────────────────────────
// The contract's errors, plus the `usage` that not_food / low_confidence carry
// (the quota is given back, and the screens say how many are left).
export class VisionError extends EllieError {
  readonly usage: VisionUsage | null;

  constructor(base: EllieError, usage: VisionUsage | null) {
    super(base.code, { status: base.status, used: base.used, limit: base.limit, message: base.message });
    this.name = 'VisionError';
    this.usage = usage;
  }
}

export function parseVisionError(status: number, body: unknown): VisionError {
  return new VisionError(parseEllieError(status, body), parseVisionUsage(asRecord(body)?.usage));
}

const invokeVision = invokeFunction('ellie-vision');

async function call(body: Record<string, unknown>, invoke: EllieInvoke): Promise<InvokeResult> {
  let result: InvokeResult;
  try {
    result = await invoke(body);
  } catch (error) {
    throw error instanceof EllieError ? error : new EllieError('offline', { message: String(error) });
  }
  if (result.status < 200 || result.status >= 300) {
    throw parseVisionError(result.status, result.body);
  }
  return result;
}

export type VisionDeps = { invoke?: EllieInvoke };

export async function analyzeMeal(
  input: { imagePath: string; hint?: string | null },
  deps: VisionDeps = {},
): Promise<{ draft: MealAnalysis; usage: VisionUsage | null }> {
  const { body } = await call(
    { mode: 'meal', image_path: input.imagePath, client_request_id: null, hint: input.hint ?? null },
    deps.invoke ?? invokeVision,
  );
  const record = asRecord(body);
  const draft = parseMealAnalysis(record?.draft);
  if (!record || record.ok !== true || !draft) {
    throw new EllieError('unknown', { message: 'Unreadable ellie-vision response' });
  }
  return { draft: { ...draft, imagePath: draft.imagePath || input.imagePath }, usage: parseVisionUsage(record.usage) };
}

// `clientRequestId` is the same on every retry of the same photo: the server
// returns the same scan (replayed) and charges nothing again.
export async function scanMachine(
  input: { imagePath: string; clientRequestId: string },
  deps: VisionDeps = {},
): Promise<MachineScan> {
  const { body } = await call(
    { mode: 'machine', image_path: input.imagePath, client_request_id: input.clientRequestId, hint: null },
    deps.invoke ?? invokeVision,
  );
  return parseMachineScan(body);
}

// The person picked one of the candidates of an ambiguous scan.
export async function chooseMachineCandidate(
  scanId: string,
  equipmentId: string,
): Promise<{ equipmentId: string; exerciseIds: string[] }> {
  const client = getSupabaseClient() as unknown as {
    rpc: (name: string, args: object) => Promise<{ data: unknown; error: { message?: string } | null }>;
  } | null;
  if (!client) {
    throw new EllieError('unknown', { message: 'Supabase no está configurado.' });
  }
  const { data, error } = await client.rpc('choose_machine_candidate', {
    _scan_id: scanId,
    _equipment_id: equipmentId,
  });
  const record = asRecord(data);
  if (error) {
    throw new EllieError('offline', { message: error.message });
  }
  if (!record || record.ok !== true) {
    throw new EllieError(record?.error === 'unauthorized' ? 'unauthorized' : 'invalid_input');
  }
  return {
    equipmentId: str(record.equipment_id, equipmentId),
    exerciseIds: (Array.isArray(record.exercise_ids) ? record.exercise_ids : []).filter(
      (id): id is string => typeof id === 'string',
    ),
  };
}
