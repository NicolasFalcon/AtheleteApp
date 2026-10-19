import {
  AI_REQUEST_TIMEOUT_MS,
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

// A countable food ("2 huevos") also carries its values per unit; then
// grams, kcal and macros are the item's totals (VISION_SHAPES.md §6).
export type MealUnit = {
  count: number;
  label: string;
  gramsPer: number;
  kcalPer: number;
  proteinPer: number;
  carbsPer: number;
  fatsPer: number;
};

export type MealItem = {
  name: string;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
  // null: not countable (by grams).
  unit?: MealUnit | null;
  // The server recalculated the kcal from the macros (not saved).
  kcalAdjusted?: boolean;
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
// The concrete machine (machine_types): "Prensa de piernas".
export type MachineType = { id: string; slug: string; name: string };
export type MachineCandidate = {
  equipmentId: string;
  slug: string;
  name: string;
  confidence: number;
  machineTypeId?: string | null;
  machineTypeName?: string | null;
};
export type MachineExercise = { id: string; slug: string; name: string };

export type MachineScan = {
  scanId: string;
  replayed: boolean;
  match: 'confident' | 'ambiguous';
  // null when ambiguous.
  machineType: MachineType | null;
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

// The per-unit values of a countable food; null when it is by grams.
export function parseMealUnit(item: Record<string, unknown>): MealUnit | null {
  const count = typeof item.unit_count === 'number' && Number.isFinite(item.unit_count) ? item.unit_count : 0;
  const label = str(item.unit_label).trim();
  if (count <= 0 || !label) {
    return null;
  }
  return {
    count,
    label,
    gramsPer: num(item.grams_per_unit),
    kcalPer: num(item.kcal_per_unit),
    proteinPer: num(item.protein_per_unit),
    carbsPer: num(item.carbs_per_unit),
    fatsPer: num(item.fats_per_unit),
  };
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
        unit: parseMealUnit(item),
        kcalAdjusted: item.kcal_adjusted === true,
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
  const machineType = asRecord(record.machine_type);
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
    machineType:
      machineType && typeof machineType.id === 'string'
        ? { id: machineType.id, slug: str(machineType.slug), name: str(machineType.name) }
        : null,
    equipment:
      equipment && typeof equipment.id === 'string'
        ? { id: equipment.id, slug: str(equipment.slug), name: str(equipment.name) }
        : null,
    confidence: num(record.confidence),
    candidates: list(record.candidates, row =>
      typeof row.equipment_id === 'string'
        ? {
            equipmentId: row.equipment_id,
            slug: str(row.slug),
            name: str(row.name),
            confidence: num(row.confidence),
            machineTypeId: typeof row.machine_type_id === 'string' ? row.machine_type_id : null,
            machineTypeName: typeof row.machine_type_name === 'string' ? row.machine_type_name : null,
          }
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

// Waits longer than the server's AI limit (see AI_REQUEST_TIMEOUT_MS).
const invokeVision = invokeFunction('ellie-vision', { timeoutMs: AI_REQUEST_TIMEOUT_MS });

// 409 duplicate_in_progress: the same request (client_request_id) is still
// being answered. Wait and ask again silently, at most 3 times, longer each
// time.
export const VISION_DUPLICATE_WAITS_MS = [2000, 4000, 8000] as const;

export type VisionDeps = { invoke?: EllieInvoke; sleep?: (ms: number) => Promise<void> };

async function call(body: Record<string, unknown>, deps: VisionDeps): Promise<InvokeResult> {
  const invoke = deps.invoke ?? invokeVision;
  const sleep = deps.sleep ?? (ms => new Promise<void>(resolve => setTimeout(resolve, ms)));
  for (let attempt = 0; ; attempt += 1) {
    let result: InvokeResult;
    try {
      result = await invoke(body);
    } catch (error) {
      throw error instanceof EllieError ? error : new EllieError('offline', { message: String(error) });
    }
    if (result.status >= 200 && result.status < 300) {
      return result;
    }
    const failure = parseVisionError(result.status, result.body);
    if (failure.code === 'duplicate_in_progress' && attempt < VISION_DUPLICATE_WAITS_MS.length) {
      await sleep(VISION_DUPLICATE_WAITS_MS[attempt]);
      continue;
    }
    throw failure;
  }
}

// `clientRequestId` is created once per photo (and per note to ELLIE) and
// reused on every retry: the server answers the same draft (replayed) and
// charges nothing again.
export async function analyzeMeal(
  input: { imagePath: string; clientRequestId: string; hint?: string | null },
  deps: VisionDeps = {},
): Promise<{ draft: MealAnalysis; usage: VisionUsage | null }> {
  const { body } = await call(
    {
      mode: 'meal',
      image_path: input.imagePath,
      client_request_id: input.clientRequestId,
      hint: input.hint ?? null,
    },
    deps,
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
    deps,
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
