import type {NutritionPlan} from '@app/shared';

export type NutritionMealBlock = {
  name: string;
  kcalRange: string;
  guideline: string;
};

function formatRange(value: number) {
  const lower = Math.max(0, Math.round(value - 50));
  const upper = Math.max(lower, Math.round(value + 50));
  return `${lower}–${upper} kcal`;
}

export function buildMealStructure(
  targetCalories: number,
  goalLabel: string,
): NutritionMealBlock[] {
  const breakfast = targetCalories * 0.22;
  const lunch = targetCalories * 0.32;
  const dinner = targetCalories * 0.26;
  const snacks = targetCalories * 0.2;

  return [
    {
      name: 'Desayuno',
      kcalRange: formatRange(breakfast),
      guideline:
        goalLabel === 'Perder peso'
          ? 'Proteína alta y carbohidratos moderados para arrancar con saciedad.'
          : 'Proteína alta y carbohidratos suficientes para empezar con energía.',
    },
    {
      name: 'Almuerzo',
      kcalRange: formatRange(lunch),
      guideline:
        'Proteína magra, verduras y una fuente de carbohidratos de buena calidad.',
    },
    {
      name: 'Cena',
      kcalRange: formatRange(dinner),
      guideline:
        goalLabel === 'Ganar músculo'
          ? 'Cena completa con proteína y carbohidratos para sostener la recuperación.'
          : 'Cena ligera, rica en proteína y con grasas saludables.',
    },
    {
      name: 'Snacks',
      kcalRange: formatRange(snacks),
      guideline:
        'Fruta, yogur, frutos secos o proteína para mantenerte constante.',
    },
  ];
}

export function buildNutritionGuidelines(params: {
  plan: NutritionPlan;
  goalLabel: string;
  trainingDaysPerWeek?: number | null;
  dailyWaterGoal?: number | null;
}) {
  const waterLiters =
    params.dailyWaterGoal && params.dailyWaterGoal > 0
      ? (params.dailyWaterGoal * 250) / 1000
      : 2;

  const items = [
    'Prioriza alimentos integrales y una fuente de proteína en cada comida.',
    'Mantén verduras en almuerzo y cena para mejorar saciedad y adherencia.',
    `Apunta a ${waterLiters.toFixed(1).replace('.0', '')} L de agua al día para sostener el plan.`,
  ];

  if (params.goalLabel === 'Ganar músculo') {
    items.push(
      'Usa carbohidratos alrededor del entrenamiento para apoyar rendimiento y recuperación.',
    );
  } else if (params.goalLabel === 'Perder peso') {
    items.push(
      'Asegura proteína alta y comidas simples para sostener el déficit sin perder consistencia.',
    );
  } else if (params.goalLabel === 'Mejorar salud') {
    items.push(
      'Mantén horarios regulares y porciones simples para hacer el plan sostenible.',
    );
  }

  if ((params.trainingDaysPerWeek || 0) >= 5) {
    items.push(
      'Con tu frecuencia actual de entrenamiento, evita saltarte la comida posterior a la sesión.',
    );
  }

  return items.slice(0, 5);
}

export function buildNutritionSummary(params: {
  plan: NutritionPlan;
  goalLabel: string;
  trainingDaysPerWeek?: number | null;
}) {
  if (params.plan.notes?.trim()) {
    return params.plan.notes.trim();
  }

  const cadence =
    params.trainingDaysPerWeek && params.trainingDaysPerWeek > 0
      ? `tu ritmo actual de ${params.trainingDaysPerWeek} días por semana`
      : 'tu objetivo actual';

  return `Este plan está ajustado a ${params.goalLabel.toLowerCase()} y pensado para sostener ${cadence} con macros claras, comidas simples y adherencia diaria.`;
}
