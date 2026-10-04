import type { DailyNutritionLog, NutritionPlan } from '@app/shared';

// One model of the day's nutrition and water for the three places that show
// it: Nutrición, the rings of Inicio and the blocks of Progreso. Pure.

// ── Water: profiles.daily_water_goal is stored in 250 ml glasses (DA-39) ────
export const GLASS_ML = 250;
export const DEFAULT_WATER_GOAL_GLASSES = 14;

export function toGlasses(ml: number): number {
  return Math.round(Math.max(0, ml) / GLASS_ML);
}

export const formatThousands = (value: number) =>
  String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const clamp01 = (value: number) =>
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

// 0–1 progress of `consumed` towards `target`; no target → 0.
export function ratio(consumed: number, target: number | null | undefined) {
  return target && target > 0 ? clamp01(consumed / target) : 0;
}

// ── Totals of the day ───────────────────────────────────────────────────────
export type MacroKey = 'protein' | 'carbs' | 'fats';

export type MacroTotal = {
  key: MacroKey;
  label: string;
  value: number;
  goal: number | null;
  pct: number; // integer 0–100 (the label inside the column)
  fill: number; // 0–1 (the height of the column)
};

export type DayTotals = {
  hasPlan: boolean;
  kcal: {
    consumed: number;
    target: number | null;
    progress: number; // 0–1
    left: number; // never negative
    done: boolean;
  };
  macros: MacroTotal[];
  water: {
    glasses: number;
    goalGlasses: number;
    liters: number;
    progress: number; // 0–1
    pct: number;
    done: boolean;
  };
};

const MACRO_LABELS: Record<MacroKey, string> = {
  protein: 'Proteína',
  carbs: 'Carbohidratos',
  fats: 'Grasas',
};

export function buildDayTotals(input: {
  plan: NutritionPlan | null;
  log: Pick<
    DailyNutritionLog,
    'calories' | 'protein' | 'carbs' | 'fats'
  > | null;
  waterMl: number;
  goalGlasses?: number | null;
}): DayTotals {
  const { plan, log } = input;
  const consumed = Math.max(0, log?.calories ?? 0);
  const target = plan ? plan.targetCalories : null;
  const goalGlasses = Math.max(
    1,
    input.goalGlasses || DEFAULT_WATER_GOAL_GLASSES,
  );
  const glasses = toGlasses(input.waterMl);

  const goals: Record<MacroKey, number | null> = {
    protein: plan?.targetProtein ?? null,
    carbs: plan?.targetCarbs ?? null,
    fats: plan?.targetFats ?? null,
  };
  const values: Record<MacroKey, number> = {
    protein: Math.max(0, log?.protein ?? 0),
    carbs: Math.max(0, log?.carbs ?? 0),
    fats: Math.max(0, log?.fats ?? 0),
  };

  return {
    hasPlan: Boolean(plan),
    kcal: {
      consumed,
      target,
      progress: ratio(consumed, target),
      left: target ? Math.max(0, target - consumed) : 0,
      done: Boolean(target) && consumed >= (target as number),
    },
    macros: (['protein', 'carbs', 'fats'] as MacroKey[]).map(key => ({
      key,
      label: MACRO_LABELS[key],
      value: values[key],
      goal: goals[key],
      pct: Math.min(100, Math.round(ratio(values[key], goals[key]) * 100)),
      fill: ratio(values[key], goals[key]),
    })),
    water: {
      glasses,
      goalGlasses,
      liters: (glasses * GLASS_ML) / 1000,
      progress: clamp01(glasses / goalGlasses),
      pct: Math.round(clamp01(glasses / goalGlasses) * 100),
      done: glasses >= goalGlasses,
    },
  };
}

// ── Lines of text ───────────────────────────────────────────────────────────
export function kcalLine(totals: DayTotals): string {
  if (!totals.hasPlan) {
    return 'Sin plan activo. ELLIE calcula tu objetivo y tus macros.';
  }
  return totals.kcal.left > 0
    ? `Te quedan ${formatThousands(totals.kcal.left)} kcal`
    : 'Objetivo del día cumplido';
}

// "1,5" · "0,25": liters of water (comma, up to two decimals).
export function formatLiters(liters: number): string {
  return String(Math.round(liters * 100) / 100).replace('.', ',');
}

export const waterLine = (totals: DayTotals) =>
  `${formatLiters(totals.water.liters)} L · ${
    totals.water.done ? 'objetivo cumplido' : '1 vaso = 250 ml'
  }`;

// The ELLIE card under the macros: what is missing today.
export function ellieLine(totals: DayTotals): string {
  const protein = totals.macros[0];
  const missing = protein.goal ? Math.max(0, protein.goal - protein.value) : 0;
  if (missing > 0) {
    return `Te faltan ${missing} g de proteína. Una cena con huevos o pescado lo cierra.`;
  }
  if (totals.kcal.left > 0) {
    return `Te quedan ${formatThousands(
      totals.kcal.left,
    )} kcal para cerrar el día.`;
  }
  return 'Cerraste el día de nutrición. Si algo no te encaja, ELLIE ajusta tu plan.';
}

// 270° indicator (r = 118): length of the filled arc out of 556.
export const GAUGE_LENGTH = 556;
export const gaugeDash = (progress: number) =>
  Math.round(GAUGE_LENGTH * clamp01(progress) * 10) / 10;

// ── Registrar nutrición (the sheet) ─────────────────────────────────────────
export const KCAL_SHORTCUTS = [250, 500, 750] as const;
export const MACRO_STEP = 5;
export const MAX_KCAL_ENTRY = 5000;
export const MAX_MACRO_ENTRY = 500;

export type LogIncrements = {
  kcal: number;
  protein: number;
  carbs: number;
  fats: number;
};

export const emptyIncrements: LogIncrements = {
  kcal: 0,
  protein: 0,
  carbs: 0,
  fats: 0,
};

// "1.2a0" → 120: only digits, capped.
export function parseKcal(text: string): number {
  const digits = text.replace(/\D/g, '');
  return Math.min(MAX_KCAL_ENTRY, digits ? parseInt(digits, 10) : 0);
}

export function stepMacro(current: number, direction: 1 | -1): number {
  return Math.min(
    MAX_MACRO_ENTRY,
    Math.max(0, current + direction * MACRO_STEP),
  );
}

export const hasIncrements = (add: LogIncrements) =>
  add.kcal > 0 || add.protein > 0 || add.carbs > 0 || add.fats > 0;

export type LogTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
};

// New totals of the day: what was logged plus the increments.
export function applyIncrements(
  log: Pick<
    DailyNutritionLog,
    'calories' | 'protein' | 'carbs' | 'fats'
  > | null,
  add: LogIncrements,
): LogTotals {
  return {
    calories: Math.max(0, (log?.calories ?? 0) + add.kcal),
    protein: Math.max(0, (log?.protein ?? 0) + add.protein),
    carbs: Math.max(0, (log?.carbs ?? 0) + add.carbs),
    fats: Math.max(0, (log?.fats ?? 0) + add.fats),
  };
}

function scoreAgainst(value: number, target?: number | null) {
  if (!target || target <= 0) {
    return null;
  }
  const delta = Math.abs(value - target) / target;
  return Math.max(0, Math.round(100 - Math.min(delta, 1) * 100));
}

// Same score as the v1 sheet: how close the day is to the plan (0–100); null
// without a plan.
export function adherenceScore(
  plan: NutritionPlan | null,
  totals: LogTotals,
): number | null {
  if (!plan) {
    return null;
  }
  const scores = [
    scoreAgainst(totals.calories, plan.targetCalories),
    scoreAgainst(totals.protein, plan.targetProtein),
    scoreAgainst(totals.carbs, plan.targetCarbs),
    scoreAgainst(totals.fats, plan.targetFats),
  ].filter((score): score is number => score !== null);
  return scores.length
    ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    : 0;
}

// Percentage shown under "Adherencia de hoy" in the sheet's gauge.
export const sheetPct = (consumed: number, target: number | null) =>
  Math.min(100, Math.round(ratio(consumed, target) * 100));
