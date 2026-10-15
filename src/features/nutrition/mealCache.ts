import type { Meal, NutritionDay } from '@app/services/nutrition/mealsService';
import type { MealTotals } from '@app/services/vision/visionService';

// Pure edits of the cached day (optimistic UI): the screen shows the change at
// once and goes back to the previous day if the server refuses it.

const add = (a: MealTotals, b: MealTotals, sign: 1 | -1): MealTotals => ({
  kcal: Math.max(0, a.kcal + sign * b.kcal),
  protein: Math.max(0, a.protein + sign * b.protein),
  carbs: Math.max(0, a.carbs + sign * b.carbs),
  fats: Math.max(0, a.fats + sign * b.fats),
});

const totalsOfMeal = (meal: Meal): MealTotals => ({
  kcal: meal.kcal,
  protein: meal.protein,
  carbs: meal.carbs,
  fats: meal.fats,
});

// The day with new totals; `remaining` follows the goal.
function withTotals(day: NutritionDay, meals: Meal[], totals: MealTotals): NutritionDay {
  const { goal } = day;
  return {
    ...day,
    meals,
    totals,
    remaining:
      goal.source === 'none' || goal.kcal === null
        ? null
        : {
            kcal: Math.max(0, goal.kcal - totals.kcal),
            protein: Math.max(0, (goal.protein ?? 0) - totals.protein),
            carbs: Math.max(0, (goal.carbs ?? 0) - totals.carbs),
            fats: Math.max(0, (goal.fats ?? 0) - totals.fats),
          },
  };
}

export function withMealAdded(day: NutritionDay, meal: Meal): NutritionDay {
  return withTotals(day, [...day.meals, meal], add(day.totals, totalsOfMeal(meal), 1));
}

export function withMealRemoved(day: NutritionDay, mealId: string): NutritionDay {
  const meal = day.meals.find(item => item.id === mealId);
  if (!meal) {
    return day;
  }
  return withTotals(
    day,
    day.meals.filter(item => item.id !== mealId),
    add(day.totals, totalsOfMeal(meal), -1),
  );
}

export function withMealReplaced(day: NutritionDay, next: Meal): NutritionDay {
  const previous = day.meals.find(item => item.id === next.id);
  if (!previous) {
    return day;
  }
  const without = add(day.totals, totalsOfMeal(previous), -1);
  return withTotals(
    day,
    day.meals.map(item => (item.id === next.id ? next : item)),
    add(without, totalsOfMeal(next), 1),
  );
}

// A meal that exists only on the phone until the server answers.
export function pendingMeal(input: Omit<Meal, 'id' | 'createdAt' | 'updatedAt'>): Meal {
  const now = new Date().toISOString();
  return { ...input, id: `pending-${now}-${Math.random().toString(36).slice(2, 8)}`, createdAt: now, updatedAt: now };
}

export const isPending = (meal: Meal) => meal.id.startsWith('pending-');

// Meals of a day by moment, in the order of the day; the moments without a
// meal are left out.
export const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

export function groupByMoment(meals: readonly Meal[]) {
  return MEAL_ORDER.flatMap(type => {
    const group = meals
      .filter(meal => meal.mealType === type)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return group.length
      ? [{ type, meals: group, kcal: group.reduce((sum, meal) => sum + meal.kcal, 0) }]
      : [];
  });
}
