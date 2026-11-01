import type { MealDraft } from '@app/features/nutrition/mealDraft';
import { draftItem, draftItems } from '@app/features/nutrition/mealDraft';
import { formatThousands } from '@app/features/nutrition/nutritionModel';
import type {
  EntrySource,
  FoodItem,
  MealEntry,
  MomentTag,
  NutritionDay,
  NutritionSlot,
  SupplementDose,
  SupplementMoment,
  SupplementType,
  SupplementsDay,
} from '@app/services/supabase/nutritionDay';
import type { MealType } from '@app/services/vision/visionService';

// Nutrición · Hoy (nut-1), pure. Every figure comes from get_nutrition_day:
// these helpers only word and arrange them (never compute a target or what
// is left).

export const SLOT_LABELS: Record<NutritionSlot, string> = {
  desayuno: 'Desayuno',
  almuerzo: 'Almuerzo',
  cena: 'Cena',
  snacks: 'Snacks',
};

const SLOT_TO_TYPE: Record<NutritionSlot, MealType> = {
  desayuno: 'breakfast',
  almuerzo: 'lunch',
  cena: 'dinner',
  snacks: 'snack',
};
const TYPE_TO_SLOT: Record<MealType, NutritionSlot> = {
  breakfast: 'desayuno',
  lunch: 'almuerzo',
  dinner: 'cena',
  snack: 'snacks',
};

export const slotToMealType = (slot: NutritionSlot): MealType => SLOT_TO_TYPE[slot];
export const mealTypeToSlot = (type: MealType): NutritionSlot => TYPE_TO_SLOT[type];

// The moment preselected by the clock (same bands as the photo flow).
export function slotForTime(date: Date): NutritionSlot {
  const minutes = date.getHours() * 60 + date.getMinutes();
  if (minutes >= 5 * 60 && minutes < 11 * 60) {
    return 'desayuno';
  }
  if (minutes >= 11 * 60 && minutes < 17 * 60) {
    return 'almuerzo';
  }
  if (minutes >= 17 * 60 && minutes < 23 * 60) {
    return 'cena';
  }
  return 'snacks';
}

// ── Ring ────────────────────────────────────────────────────────────────────

export type RingCopy = {
  // 0–1 of the arc (kcal consumed against the target, capped).
  progress: number;
  over: boolean;
  // "TE QUEDAN" / "TE PASASTE" over the figure.
  eyebrow: string;
  figure: string;
  // "1.240 de 2.600" + "consumidas".
  consumed: string;
  // The whole sentence, for VoiceOver.
  headline: string;
};

export function ringCopy(day: NutritionDay): RingCopy {
  const target = day.targets.kcal;
  const consumed = day.consumed.kcal;
  const remaining = day.remaining.kcal;
  const over = remaining < 0;
  const figure = formatThousands(Math.abs(remaining));
  return {
    progress: target > 0 ? Math.min(1, Math.max(0, consumed / target)) : 0,
    over,
    eyebrow: over ? 'TE PASASTE' : 'TE QUEDAN',
    figure,
    consumed: `${formatThousands(consumed)} de ${formatThousands(target)}`,
    headline: over ? `Te pasaste ${figure} kcal` : `Te quedan ${figure} kcal`,
  };
}

// "Día de entreno" / "Descanso", with the figure only when the plan adjusts
// the kcal by training.
export function dayTypeChip(day: NutritionDay): string {
  const name = day.dayType === 'training' ? 'Día de entreno' : 'Descanso';
  const adjust = day.targets.trainingAdjust;
  if (!adjust.enabled) {
    return name;
  }
  const kcal = day.dayType === 'training' ? adjust.trainKcal : adjust.restKcal;
  return kcal ? `${name} · ${formatThousands(kcal)} kcal` : name;
}

export const ESTIMATE_NOTE = 'Meta estimada por tu perfil, sin plan activo.';
export const FOOTER_NOTE = 'Estimaciones orientativas. No reemplazan a un profesional de la nutrición.';
export const SUPPLEMENT_NOTE = 'ATHELETE solo te recuerda y registra; consulta dosis con un profesional.';

// ── Macros ──────────────────────────────────────────────────────────────────

export type MacroKey = 'protein' | 'carbs' | 'fat';

export type MacroTank = {
  key: MacroKey;
  label: string;
  value: number;
  goal: number;
  // 0–1 of the tank (capped).
  fill: number;
  // "+12 g" when past the goal, else null.
  excess: string | null;
};

export function macroTanks(day: NutritionDay): MacroTank[] {
  const rows: { key: MacroKey; label: string; value: number; goal: number }[] = [
    { key: 'protein', label: 'Proteína', value: day.consumed.p, goal: day.targets.protein },
    { key: 'carbs', label: 'Carbohidratos', value: day.consumed.c, goal: day.targets.carbs },
    { key: 'fat', label: 'Grasas', value: day.consumed.g, goal: day.targets.fat },
  ];
  const left: Record<MacroKey, number> = { protein: day.remaining.p, carbs: day.remaining.c, fat: day.remaining.g };
  return rows.map(row => ({
    ...row,
    value: Math.round(row.value),
    goal: Math.round(row.goal),
    fill: row.goal > 0 ? Math.min(1, Math.max(0, row.value / row.goal)) : 0,
    excess: left[row.key] < 0 ? `+${Math.round(Math.abs(left[row.key]))} g` : null,
  }));
}

// ── Meals ───────────────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<EntrySource, string> = {
  foto: 'foto',
  texto: 'texto',
  codigo: 'código',
  plan: 'plan',
  reciente: 'reciente',
  kcal_rapidas: 'kcal rápidas',
};

// "08:12 · foto"
export function entryMeta(entry: MealEntry): string {
  const time = entry.time ? clockOf(entry.time) : null;
  const source = entry.source ? SOURCE_LABELS[entry.source] : null;
  return [time, source].filter(Boolean).join(' · ');
}

export const macroLine = (m: { p: number; c: number; g: number }) =>
  `P ${Math.round(m.p)} · C ${Math.round(m.c)} · G ${Math.round(m.g)} g`;

export function tagLabel(tag: MomentTag): string | null {
  return tag === 'pre_entreno' ? 'Pre-entreno' : tag === 'post_entreno' ? 'Post-entreno' : null;
}

// "08:00" from "08:00", "08:00:00" or an ISO timestamp (local clock).
export function clockOf(value: string): string {
  if (/^\d{1,2}:\d{2}/.test(value)) {
    return value.slice(0, 5).padStart(5, '0');
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// ── Confirmation (texto · foto · editar) ───────────────────────────────────

// Estimated foods of parse-meal-text as an editable draft (by grams; a food
// without grams is edited as one portion).
export function draftFromFoods(items: FoodItem[], slot: NutritionSlot, title = ''): MealDraft {
  return {
    title,
    mealType: slotToMealType(slot),
    mealTypeFromClock: false,
    items: items.map(item =>
      draftItem({
        name: item.name,
        grams: item.grams ?? 0,
        kcal: item.kcal,
        protein: item.p,
        carbs: item.c,
        fats: item.g,
        unit:
          item.grams && item.grams > 0
            ? null
            : { count: 1, label: 'ración', gramsPer: 0, kcalPer: item.kcal, proteinPer: item.p, carbsPer: item.c, fatsPer: item.g },
      }),
    ),
    manualKcal: 0,
    confidence: null,
    warnings: [],
    imagePath: null,
  };
}

// An entry of the day opened to edit it (one food with its figures).
export function draftFromEntry(entry: MealEntry, slot: NutritionSlot): MealDraft {
  return draftFromFoods(
    [{ name: entry.name, grams: null, kcal: entry.kcal, p: entry.p, c: entry.c, g: entry.g }],
    slot,
    entry.name,
  );
}

// What log_meal_entry / update_meal_entry receive. A draft without foods
// (kcal rápidas) is one item with only its kcal.
export function foodsFromDraft(draft: MealDraft, fallbackName: string): FoodItem[] {
  if (draft.items.length === 0) {
    return [{ name: draft.title.trim() || fallbackName, grams: null, kcal: draft.manualKcal, p: 0, c: 0, g: 0 }];
  }
  return draftItems(draft).map(item => ({
    name: item.name,
    grams: item.grams > 0 ? item.grams : null,
    kcal: item.kcal,
    p: item.protein,
    c: item.carbs,
    g: item.fats,
  }));
}

// ── Water ───────────────────────────────────────────────────────────────────

// "6 de 13 vasos · 1,5 L"
export function waterLine(water: NutritionDay['water']): string {
  const liters = (water.ml / 1000).toFixed(1).replace('.', ',');
  return `${water.glasses} de ${water.target} vasos · ${liters} L`;
}

// ── Supplements ─────────────────────────────────────────────────────────────

export const MOMENT_LABELS: Record<SupplementMoment, string> = {
  manana: 'Mañana',
  tarde: 'Tarde',
  noche: 'Noche',
};

export const TYPE_LABELS: Record<SupplementType, string> = {
  vitamina: 'Vitamina',
  mineral: 'Mineral',
  creatina: 'Creatina',
  omega: 'Omega',
  proteina: 'Proteína',
  otro: 'Otro',
};

// "Tomado 08:12" · "Recordatorio 21:00" · "Pendiente"
export function doseStatus(dose: SupplementDose, reminderTime: string | null): string {
  if (dose.status === 'taken') {
    return dose.takenAt ? `Tomado ${clockOf(dose.takenAt)}` : 'Tomado';
  }
  if (dose.status === 'upcoming' && reminderTime) {
    return `Recordatorio ${clockOf(reminderTime)}`;
  }
  return 'Pendiente';
}

export const supplementsSummary = (day: SupplementsDay) => `${day.taken} de ${day.total} hoy`;

// "6/7 días"
export function adherenceLine(day: SupplementsDay): string | null {
  return day.adherence ? `${day.adherence.daysComplete}/${day.adherence.days} días` : null;
}

// "2 registros · estimación"
export function mealsCountLine(day: NutritionDay): string {
  const count = day.moments.reduce((total, moment) => total + moment.entries.length, 0);
  return `${count} ${count === 1 ? 'registro' : 'registros'} · estimación`;
}

// mark_supplement: one client id per tap (a retry of the same tap reuses it).
export const supplementClientId = (supplementId: string, date: string, moment: SupplementMoment, taken: boolean) =>
  `sup:${supplementId}:${date}:${moment}:${taken ? 1 : 0}:${Date.now()}`;

// "08:00" typed by hand, or null.
export function parseClock(value: string): string | null {
  const match = /^(\d{1,2}):?(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours < 24 && minutes < 60 ? `${String(hours).padStart(2, '0')}:${match[2]}` : null;
}
