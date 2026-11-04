import type {
  Allergy,
  Diet,
  FoodPrefs,
  NutritionProposal,
  PlanDay,
  PlanEdits,
  PlanIngredient,
  PlanMacros,
  PlanMeal,
} from '@app/services/ellie/nutritionProposals';
import { planEditKey } from '@app/services/ellie/nutritionProposals';

// ELLIE · plan nutricional (ELLIE_CARDS_FLOW §2, handoff 28.4): what the
// questions card, the plan card and its sheet show, without UI.

// Ajustar (sliders): the composer prefilled; what is sent adjusts that card.
export const PLAN_ADJUST_PREFIX = 'Ajusta el plan: ';

// "Otra versión": a user message that adjusts that card.
export const PLAN_ANOTHER_VERSION = 'Otra versión';

// ── Numbers ─────────────────────────────────────────────────────────────────
// "2.850" · "1,55" (es).
export function formatKcal(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

const decimal = (value: number, digits = 2) =>
  String(Number(value.toFixed(digits))).replace('.', ',');

// "840 g" · "1,2 kg" · "1,2 l" (kg / l from 1000, decimal comma).
export function formatQty(item: Pick<PlanIngredient, 'qty' | 'unit'>): string {
  if (item.qty === null) {
    return item.unit;
  }
  const unit = item.unit.toLowerCase();
  if (item.qty >= 1000 && (unit === 'g' || unit === 'ml')) {
    return `${decimal(item.qty / 1000, 1)} ${unit === 'g' ? 'kg' : 'l'}`;
  }
  return `${decimal(item.qty, 1)}${item.unit ? ` ${item.unit}` : ''}`;
}

export const macroLine = (meal: Pick<PlanMeal, 'p' | 'c' | 'g'>) =>
  `P ${Math.round(meal.p)} · C ${Math.round(meal.c)} · G ${Math.round(meal.g)} g`;

// ── Labels ──────────────────────────────────────────────────────────────────
const GOALS: Record<string, string> = {
  ganar_musculo: 'ganar músculo',
  perder_grasa: 'perder grasa',
  mantener: 'mantener',
  rendimiento: 'rendimiento',
};

export const goalLabel = (goal: string | null) =>
  goal ? GOALS[goal] ?? goal.replace(/_/g, ' ') : null;

const SLOTS: Record<string, string> = {
  desayuno: 'Desayuno',
  breakfast: 'Desayuno',
  media_manana: 'Media mañana',
  mid_morning: 'Media mañana',
  comida: 'Comida',
  almuerzo: 'Comida',
  lunch: 'Comida',
  merienda: 'Merienda',
  snack: 'Merienda',
  cena: 'Cena',
  dinner: 'Cena',
};

export function slotLabel(slot: string): string {
  const known = SLOTS[slot.toLowerCase()];
  if (known) {
    return known;
  }
  const text = slot.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const DAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const;
export const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const;

// Today, Monday = 0.
export const todayIndex = (now: Date = new Date()) => (now.getDay() + 6) % 7;

// NUEVA · AJUSTADA · <AJUSTE>, never the version number.
export function planBadge(proposal: Pick<NutritionProposal, 'version' | 'adjustLabel'>): string {
  if (proposal.version <= 1) {
    return 'NUEVA';
  }
  const label = proposal.adjustLabel?.trim().toUpperCase();
  return label ? `AJUSTADA · ${label}` : 'AJUSTADA';
}

// "PROPUESTA DE ELLIE · GANAR MÚSCULO" (· AJUSTADA in later versions).
export function planSheetEyebrow(proposal: NutritionProposal): string {
  const goal = goalLabel(proposal.goal);
  return ['PROPUESTA DE ELLIE', proposal.version > 1 ? 'AJUSTADA' : null, goal?.toUpperCase()]
    .filter(Boolean)
    .join(' · ');
}

// ── Cómo lo calculé ─────────────────────────────────────────────────────────
// "Metabolismo basal 1.780 · actividad ×1,55 (6 días) · +10 % para ganar
// músculo = 2.850 kcal."
export function calcLine(proposal: NutritionProposal): string {
  const { calc } = proposal;
  const parts: string[] = [];
  if (calc.bmr !== null) {
    parts.push(`Metabolismo basal ${formatKcal(calc.bmr)}`);
  }
  if (calc.activityFactor !== null) {
    parts.push(
      `actividad ×${decimal(calc.activityFactor)}${
        calc.trainingDays !== null ? ` (${calc.trainingDays} días)` : ''
      }`,
    );
  }
  if (calc.goalAdjustPct !== null) {
    const goal = goalLabel(proposal.goal);
    const sign = calc.goalAdjustPct > 0 ? '+' : calc.goalAdjustPct < 0 ? '−' : '';
    parts.push(`${sign}${Math.abs(calc.goalAdjustPct)} %${goal ? ` para ${goal}` : ''}`);
  }
  if (calc.safetyApplied && calc.safetyMin !== null) {
    parts.push(`mínimo de seguridad ${formatKcal(calc.safetyMin)}`);
  }
  return `${parts.join(' · ')}${parts.length > 0 ? ' = ' : ''}${formatKcal(proposal.kcal)} kcal.`;
}

// Key / value rows of the sheet.
export function calcRows(proposal: NutritionProposal): { label: string; value: string; strong?: boolean }[] {
  const { calc } = proposal;
  const goal = goalLabel(proposal.goal);
  const rows: { label: string; value: string; strong?: boolean }[] = [];
  if (calc.bmr !== null) {
    rows.push({ label: 'Metabolismo basal (BMR)', value: `${formatKcal(calc.bmr)} kcal` });
  }
  if (calc.activityFactor !== null) {
    rows.push({
      label: 'Factor de actividad',
      value: `×${decimal(calc.activityFactor)}${calc.trainingDays !== null ? ` · ${calc.trainingDays} días` : ''}`,
    });
  }
  if (calc.goalAdjustPct !== null) {
    const sign = calc.goalAdjustPct > 0 ? '+' : calc.goalAdjustPct < 0 ? '−' : '';
    rows.push({
      label: 'Ajuste por objetivo',
      value: `${sign}${Math.abs(calc.goalAdjustPct)} %${goal ? ` · ${goal}` : ''}`,
    });
  }
  if (calc.safetyMin !== null) {
    rows.push({
      label: 'Mínimo de seguridad',
      value: calc.safetyApplied
        ? `Aplicado · ${formatKcal(calc.safetyMin)}`
        : `No aplica · por encima de ${formatKcal(calc.safetyMin)}`,
    });
  }
  rows.push({ label: 'Objetivo diario', value: `${formatKcal(proposal.kcal)} kcal`, strong: true });
  return rows;
}

export const SAFETY_NOTE = 'Estimación orientativa. No reemplaza a un profesional.';

// ── Preferences ─────────────────────────────────────────────────────────────
export const ALLERGY_LABELS: Record<Allergy, string> = {
  lactosa: 'Lactosa',
  gluten: 'Gluten',
  frutos_secos: 'Frutos secos',
  mariscos: 'Mariscos',
  otra: 'Otra',
};

export const DIET_LABELS: Record<Diet, string> = {
  omnivora: 'Omnívora',
  vegetariana: 'Vegetariana',
  vegana: 'Vegana',
  sin_cerdo: 'Sin cerdo',
  otra: 'Otra',
};

// "Sin lactosa" · "Con restricciones" (Otra).
const allergyChip = (allergy: Allergy) =>
  allergy === 'otra' ? 'Con restricciones' : `Sin ${ALLERGY_LABELS[allergy].toLowerCase()}`;

// Chips of the preferences: allergies · diet · meals.
export function prefsChips(prefs: FoodPrefs): string[] {
  return [
    ...prefs.allergies.map(allergyChip),
    DIET_LABELS[prefs.diet],
    `${prefs.mealsPerDay} comidas`,
  ];
}

// The user's message after Listo: "Sin lactosa · Omnívora · 4 comidas · No
// me gusta: champiñones" (without allergies, "Sin alergias").
export function prefsSummary(prefs: FoodPrefs): string {
  const allergies = prefs.allergies.length > 0 ? prefs.allergies.map(allergyChip) : ['Sin alergias'];
  const dislikes = prefs.dislikes.trim();
  return [
    ...allergies,
    DIET_LABELS[prefs.diet],
    `${prefs.mealsPerDay} comidas`,
    ...(dislikes ? [`No me gusta: ${dislikes}`] : []),
  ].join(' · ');
}

// "Ninguna" is exclusive: choosing it clears the rest; choosing another
// clears "Ninguna" ([] = Ninguna).
export function toggleAllergy(current: Allergy[], allergy: Allergy | null): Allergy[] {
  if (allergy === null) {
    return [];
  }
  return current.includes(allergy) ? current.filter(item => item !== allergy) : [...current, allergy];
}

// ── Week ────────────────────────────────────────────────────────────────────
export const QUICK_PLAN_ADJUSTMENTS = ['Más proteína', 'Más económico', 'Menos cocina', 'Otra cena'];

export const planQuickAdjustments = (proposal: NutritionProposal) =>
  proposal.quickAdjustments.length > 0 ? proposal.quickAdjustments : QUICK_PLAN_ADJUSTMENTS;

// The example day of the card: today, or the first day of the week.
export function exampleDay(proposal: NutritionProposal, now: Date = new Date()): PlanDay | null {
  return proposal.week.find(day => day.index === todayIndex(now)) ?? proposal.week[0] ?? null;
}

// The line under the week strip.
export function dayHeadline(proposal: NutritionProposal, day: PlanDay): { title: string; note: string } {
  const train = day.type === 'train';
  const title = `${DAY_NAMES[day.index]} · ${train ? 'Entreno' : 'Descanso'} · ${formatKcal(day.kcal)} kcal`;
  if (!proposal.trainingAdjust.enabled) {
    return { title, note: 'Mismo objetivo todos los días' };
  }
  return {
    title,
    note: (train ? proposal.trainingAdjust.trainNote : proposal.trainingAdjust.restNote) ?? '',
  };
}

// The goals of the day in the sheet: with trainingAdjust, those of a training
// or rest day (targets.train / targets.rest); otherwise the plan's.
export function dayGoals(proposal: NutritionProposal, day: PlanDay | null): PlanMacros {
  if (!day || !proposal.trainingAdjust.enabled) {
    return proposal.macros;
  }
  return proposal.dayTargets[day.type] ?? proposal.macros;
}

// A meal as the sheet shows it, with the chosen equivalent (only that day).
export type ShownMeal = PlanMeal & { changed: boolean; key: string };

export function dayMeals(day: PlanDay, edits: PlanEdits): ShownMeal[] {
  return day.meals.map(meal => {
    const key = planEditKey(day, meal);
    const chosen = edits[key];
    const equivalent = chosen === undefined ? null : meal.equivalents[chosen];
    return equivalent
      ? { ...meal, ...equivalent, slot: meal.slot, time: meal.time, equivalents: meal.equivalents, changed: true, key }
      : { ...meal, changed: false, key };
  });
}

// The shopping list of the week with the changes applied: the server's list
// without changes; with changes, summed again from the ingredients of the
// seven days (when the meals carry them), largest first.
export function shoppingList(proposal: NutritionProposal, edits: PlanEdits): PlanIngredient[] {
  const changed = Object.keys(edits).length > 0;
  const hasIngredients = proposal.week.some(day => day.meals.some(meal => meal.ingredients.length > 0));
  if (!changed || !hasIngredients) {
    return proposal.shopping;
  }
  const totals = new Map<string, PlanIngredient>();
  proposal.week.forEach(day =>
    dayMeals(day, edits).forEach(meal =>
      meal.ingredients.forEach(item => {
        const key = `${item.name.toLowerCase()}|${item.unit}`;
        const current = totals.get(key);
        totals.set(key, {
          name: current?.name ?? item.name,
          unit: item.unit,
          qty: (current?.qty ?? 0) + (item.qty ?? 0),
        });
      }),
    ),
  );
  return [...totals.values()].sort((a, b) => (b.qty ?? 0) - (a.qty ?? 0));
}

export const SHOPPING_PREVIEW = 6;
