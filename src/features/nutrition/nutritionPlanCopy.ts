import type { EllieLanguage } from '@app/features/ellie/ellieCopy';
import { useProfileLanguage } from '@app/hooks/useProfileLanguage';

// Nutrición · Plan y Compras (the active plan of get_nutrition_plan), by
// i18n key (es/en, profiles.language). "{n}" placeholders as workoutsCopy.
const COPY = {
  'plan.title': { es: 'Tu plan', en: 'Your plan' },
  'plan.status.active': { es: 'Activo', en: 'Active' },
  'plan.goals': { es: '{kcal} kcal · P {p} · C {c} · G {g} g', en: '{kcal} kcal · P {p} · C {c} · F {g} g' },
  'plan.dayTrain': { es: 'Día de entreno', en: 'Training day' },
  'plan.dayRest': { es: 'Día de descanso', en: 'Rest day' },
  'plan.dayKcal': { es: '{kcal} kcal', en: '{kcal} kcal' },
  'plan.logged': { es: 'Registrada', en: 'Logged' },
  'plan.change': { es: 'Cambiar', en: 'Change' },
  'plan.equivalents': {
    es: 'Equivalentes · mismas kcal (±5 %) y proteína similar',
    en: 'Equivalents · same kcal (±5 %) and similar protein',
  },
  'plan.swapped': { es: 'Comida cambiada para ese día', en: 'Meal changed for that day' },
  'plan.swapError': { es: 'No pudimos cambiar la comida.', en: "We couldn't change the meal." },
  'swap.invalidInput': {
    es: 'Esa alternativa no está disponible para este momento del día.',
    en: "That alternative isn't available for this time of day.",
  },
  'swap.planNotActive': { es: 'Este plan ya no está activo.', en: 'This plan is no longer active.' },
  'swap.notFound': { es: 'No encontramos tu plan. Vuelve a cargar.', en: "We couldn't find your plan. Reload." },
  'plan.error': { es: 'No pudimos cargar tu plan.', en: "We couldn't load your plan." },
  'plan.noMeals': { es: 'Este día no tiene comidas en el plan.', en: 'This day has no meals in the plan.' },
  'plan.recalibration': { es: 'Ajuste propuesto', en: 'Proposed adjustment' },
  'outdated.text': {
    es: 'Tus objetivos cambiaron. Crea un plan nuevo con ELLIE para ajustar las comidas',
    en: 'Your targets changed. Create a new plan with ELLIE to adjust your meals',
  },
  'outdated.cta': { es: 'Crear plan nuevo', en: 'Create new plan' },
  'shopping.title': { es: 'Compra de la semana', en: "This week's shopping" },
  'shopping.count.one': { es: '1 producto', en: '1 item' },
  'shopping.count.other': { es: '{n} productos', en: '{n} items' },
  'shopping.other': { es: 'Otros', en: 'Other' },
  'shopping.error': { es: 'No pudimos cargar tu lista.', en: "We couldn't load your list." },
  'shopping.empty': { es: 'Tu plan no tiene productos esta semana.', en: 'Your plan has no items this week.' },
} as const satisfies Record<string, Record<EllieLanguage, string>>;

export type NutritionPlanKey = keyof typeof COPY;
export type NutritionPlanT = (key: NutritionPlanKey, vars?: Record<string, string | number>) => string;

export function nutritionPlanText(
  language: EllieLanguage,
  key: NutritionPlanKey,
  vars: Record<string, string | number> = {},
): string {
  return COPY[key][language].replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export function useNutritionPlanText(): { t: NutritionPlanT; language: EllieLanguage } {
  const language = useProfileLanguage();
  return { t: (key, vars) => nutritionPlanText(language, key, vars), language };
}
