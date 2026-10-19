import type { EllieLanguage } from '@app/features/ellie/ellieCopy';
import type { Meal, SaveMealInput, UpdateMealInput } from '@app/services/nutrition/mealsService';
import type {
  MealAnalysis,
  MealItem,
  MealTotals,
  MealType,
  MealUnit,
} from '@app/services/vision/visionService';

// The editable draft of a meal (pure): what ELLIE estimated from the photo,
// corrected by the person (portion − / +, remove a food, moment of the day)
// until "Añadir al día". Nothing is saved before that.

export type DraftItem = {
  id: string;
  name: string;
  // A countable food ("2 huevos") is edited by units with its values per
  // unit; `unit.count` is the current number. null: edited by grams.
  unit: MealUnit | null;
  grams: number;
  // What the estimate said for `baseGrams`: other portions scale from it.
  baseGrams: number;
  baseKcal: number;
  baseProtein: number;
  baseCarbs: number;
  baseFats: number;
  step: number;
};

export type MealDraft = {
  title: string;
  mealType: MealType;
  // The moment came from the clock, not from ELLIE or the person.
  mealTypeFromClock: boolean;
  items: DraftItem[];
  // kcal of a meal without items ("kcal rápidas"): only used when `items` is empty.
  manualKcal: number;
  confidence: number | null;
  warnings: string[];
  imagePath: string | null;
};

// Moments by the clock: breakfast before 11:00, lunch 11:00–16:59, dinner
// 17:00–22:59, snack the rest.
export function mealTypeForTime(date: Date): MealType {
  const minutes = date.getHours() * 60 + date.getMinutes();
  if (minutes >= 5 * 60 && minutes < 11 * 60) {
    return 'breakfast';
  }
  if (minutes >= 11 * 60 && minutes < 17 * 60) {
    return 'lunch';
  }
  if (minutes >= 17 * 60 && minutes < 23 * 60) {
    return 'dinner';
  }
  return 'snack';
}

export function clockLabel(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

const LABELS: Record<EllieLanguage, Record<MealType, string>> = {
  es: { breakfast: 'Desayuno', lunch: 'Almuerzo', dinner: 'Cena', snack: 'Snack' },
  en: { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' },
};

export const mealTypeLabel = (type: MealType, language: EllieLanguage = 'es') => LABELS[language][type];

// 25 g for a plate-size food, finer for small ones.
export function stepFor(grams: number): number {
  return grams >= 100 ? 25 : grams >= 30 ? 10 : 5;
}

let counter = 0;
const nextId = () => `item-${(counter += 1)}`;

export function draftItem(item: MealItem): DraftItem {
  const unit = item.unit && item.unit.count > 0 ? { ...item.unit } : null;
  const grams = Math.max(0, unit ? unit.count * unit.gramsPer || item.grams : item.grams);
  return {
    id: nextId(),
    name: item.name,
    unit,
    grams,
    baseGrams: grams,
    baseKcal: item.kcal,
    baseProtein: item.protein,
    baseCarbs: item.carbs,
    baseFats: item.fats,
    step: stepFor(grams),
  };
}

export function draftFromAnalysis(analysis: MealAnalysis, now: Date): MealDraft {
  return {
    title: analysis.title,
    mealType: analysis.mealTypeSuggestion ?? mealTypeForTime(now),
    mealTypeFromClock: analysis.mealTypeSuggestion === null,
    items: analysis.items.map(draftItem),
    manualKcal: 0,
    confidence: analysis.confidence,
    warnings: analysis.warnings,
    imagePath: analysis.imagePath || null,
  };
}

// An existing meal opened to edit it. A meal without items (kcal rápidas) keeps
// its kcal as the manual figure.
export function draftFromMeal(meal: Meal): MealDraft {
  return {
    title: meal.title,
    mealType: meal.mealType,
    mealTypeFromClock: false,
    items: meal.items.map(draftItem),
    manualKcal: meal.items.length === 0 ? meal.kcal : 0,
    confidence: meal.confidence,
    warnings: [],
    imagePath: meal.imagePath,
  };
}

// Values of one item now: units × the values per unit for a countable food;
// otherwise proportional to the grams of the estimate.
export function itemValues(item: DraftItem): MealItem {
  if (item.unit) {
    const { count } = item.unit;
    return {
      name: item.name,
      grams: Math.round(count * item.unit.gramsPer),
      kcal: Math.round(count * item.unit.kcalPer),
      protein: Math.round(count * item.unit.proteinPer),
      carbs: Math.round(count * item.unit.carbsPer),
      fats: Math.round(count * item.unit.fatsPer),
      unit: { ...item.unit },
    };
  }
  const factor = item.baseGrams > 0 ? item.grams / item.baseGrams : 1;
  return {
    name: item.name,
    grams: item.grams,
    kcal: Math.round(item.baseKcal * factor),
    protein: Math.round(item.baseProtein * factor),
    carbs: Math.round(item.baseCarbs * factor),
    fats: Math.round(item.baseFats * factor),
    unit: null,
  };
}

export function draftItems(draft: MealDraft): MealItem[] {
  return draft.items.map(itemValues);
}

export function draftTotals(draft: MealDraft): MealTotals {
  if (draft.items.length === 0) {
    return { kcal: draft.manualKcal, protein: 0, carbs: 0, fats: 0 };
  }
  return draftItems(draft).reduce<MealTotals>(
    (total, item) => ({
      kcal: total.kcal + item.kcal,
      protein: total.protein + item.protein,
      carbs: total.carbs + item.carbs,
      fats: total.fats + item.fats,
    }),
    { kcal: 0, protein: 0, carbs: 0, fats: 0 },
  );
}

// − / +: one unit for a countable food (never below 1), else its gram step.
export function stepItem(draft: MealDraft, id: string, direction: 1 | -1): MealDraft {
  return {
    ...draft,
    items: draft.items.map(item => {
      if (item.id !== id) {
        return item;
      }
      if (item.unit) {
        const count = Math.max(1, item.unit.count + direction);
        return { ...item, unit: { ...item.unit, count }, grams: Math.round(count * item.unit.gramsPer) };
      }
      return { ...item, grams: Math.max(item.step, item.grams + direction * item.step) };
    }),
  };
}

// "huevo" → "huevos", "pan" → "panes" (es) / "slice" → "slices" (en).
export function unitLabel(label: string, count: number, language: EllieLanguage = 'es'): string {
  const word = label.trim();
  if (count === 1 || !word || /s$/i.test(word)) {
    return word;
  }
  if (language === 'en') {
    return `${word}s`;
  }
  return /[aeiouáéó]$/i.test(word) ? `${word}s` : `${word}es`;
}

// "4 huevos · 200 g · total"
export function unitLine(item: MealItem, language: EllieLanguage = 'es'): string {
  if (!item.unit) {
    return `${item.grams} g`;
  }
  return `${formatCount(item.unit.count)} ${unitLabel(item.unit.label, item.unit.count, language)} · ${item.grams} g · total`;
}

// "por unidad: 50 g · 70 kcal · P 6 g"
export function perUnitLine(unit: MealUnit, language: EllieLanguage = 'es'): string {
  return `${language === 'es' ? 'por unidad' : 'per unit'}: ${formatCount(unit.gramsPer)} g · ${formatCount(
    unit.kcalPer,
  )} kcal · P ${formatCount(unit.proteinPer)} g`;
}

// 2 → "2", 0.5 → "0,5" (es) / "0.5" (en is shown the same way in the app).
function formatCount(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace('.', ',');
}

export function removeItem(draft: MealDraft, id: string): MealDraft {
  return { ...draft, items: draft.items.filter(item => item.id !== id) };
}

export function setMealType(draft: MealDraft, mealType: MealType): MealDraft {
  return { ...draft, mealType, mealTypeFromClock: false };
}

// Under this ELLIE says she is not sure (design: "No estoy segura…").
export const LOW_CONFIDENCE = 0.6;
export const isLowConfidence = (draft: MealDraft) =>
  draft.confidence !== null && draft.confidence < LOW_CONFIDENCE;

export function canSave(draft: MealDraft): boolean {
  return draftTotals(draft).kcal > 0;
}

const FALLBACK_TITLE: Record<EllieLanguage, string> = { es: 'Comida', en: 'Meal' };

function titleOf(draft: MealDraft, language: EllieLanguage): string {
  const title = draft.title.trim();
  if (title) {
    return title.slice(0, 120);
  }
  return draft.items[0]?.name ?? FALLBACK_TITLE[language];
}

// What save_meal receives. Totals are the sum of the items as shown.
export function toSaveInput(
  draft: MealDraft,
  extras: {
    source: 'photo' | 'manual' | 'chat';
    chatMessageId?: string | null;
    localDate?: string;
    language?: EllieLanguage;
  },
): SaveMealInput {
  const totals = draftTotals(draft);
  const hasItems = draft.items.length > 0;
  return {
    source: extras.source,
    mealType: draft.mealType,
    title: titleOf(draft, extras.language ?? 'es'),
    items: hasItems ? draftItems(draft) : [],
    kcal: totals.kcal,
    ...(hasItems ? { protein: totals.protein, carbs: totals.carbs, fats: totals.fats } : {}),
    ...(extras.localDate ? { localDate: extras.localDate } : {}),
    imagePath: draft.imagePath,
    confidence: draft.confidence,
    chatMessageId: extras.chatMessageId ?? null,
  };
}

export function toUpdateInput(draft: MealDraft, language: EllieLanguage = 'es'): UpdateMealInput {
  const totals = draftTotals(draft);
  const hasItems = draft.items.length > 0;
  return {
    mealType: draft.mealType,
    title: titleOf(draft, language),
    items: hasItems ? draftItems(draft) : [],
    kcal: totals.kcal,
    ...(hasItems ? { protein: totals.protein, carbs: totals.carbs, fats: totals.fats } : {}),
  };
}

export const formatItemLine = (item: MealItem) => `P ${item.protein} · C ${item.carbs} · G ${item.fats} g`;
