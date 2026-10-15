import {
  groupByMoment,
  isPending,
  pendingMeal,
  withMealAdded,
  withMealRemoved,
  withMealReplaced,
} from '../src/features/nutrition/mealCache';
import type { Meal, NutritionDay } from '../src/services/nutrition/mealsService';

const meal = (id: string, kcal: number, mealType: Meal['mealType'] = 'lunch', createdAt = '2026-10-15T12:00:00Z'): Meal => ({
  id, localDate: '2026-10-15', mealType, source: 'photo', title: id, items: [], kcal, protein: 10, carbs: 20, fats: 5,
  imagePath: null, confidence: null, repeatedFrom: null, chatMessageId: null, createdAt, updatedAt: createdAt,
});
const day = (): NutritionDay => ({
  date: '2026-10-15',
  isToday: true,
  meals: [meal('a', 500)],
  totals: { kcal: 500, protein: 10, carbs: 20, fats: 5 },
  goal: { source: 'plan', planId: 'p', kcal: 2000, protein: 100, carbs: 250, fats: 60 },
  remaining: { kcal: 1500, protein: 90, carbs: 230, fats: 55 },
});

describe('optimistic edits of the cached day', () => {
  it('adding a meal adds to the totals and subtracts from what is left', () => {
    const next = withMealAdded(day(), meal('b', 300));
    expect(next.meals.map(item => item.id)).toEqual(['a', 'b']);
    expect(next.totals.kcal).toBe(800);
    expect(next.remaining?.kcal).toBe(1200);
  });

  it('removing a meal takes it out and gives its kcal back; an unknown id changes nothing', () => {
    const base = withMealAdded(day(), meal('b', 300));
    const next = withMealRemoved(base, 'b');
    expect(next).toMatchObject({ totals: { kcal: 500 }, remaining: { kcal: 1500 } });
    expect(withMealRemoved(base, 'nope')).toBe(base);
  });

  it('replacing a meal swaps its figures', () => {
    const next = withMealReplaced(day(), { ...meal('a', 650), protein: 40 });
    expect(next.totals).toMatchObject({ kcal: 650, protein: 40 });
    expect(next.remaining?.kcal).toBe(1350);
  });

  it('without a goal there is never a "remaining"', () => {
    const none: NutritionDay = { ...day(), goal: { source: 'none', planId: null, kcal: null, protein: null, carbs: null, fats: null }, remaining: null };
    expect(withMealAdded(none, meal('b', 100)).remaining).toBeNull();
  });

  it('never goes below zero', () => {
    const next = withMealRemoved({ ...day(), meals: [meal('a', 900)] }, 'a');
    expect(next.totals.kcal).toBe(0);
  });

  it('a meal that only exists on the phone is marked as pending', () => {
    const base = meal('x', 100);
    expect(isPending(pendingMeal({ ...base, title: 'new' }))).toBe(true);
    expect(isPending(meal('server-id', 1))).toBe(false);
  });

  it('meals are grouped by moment in the order of the day, with each total', () => {
    const groups = groupByMoment([
      meal('s', 200, 'snack'),
      meal('l2', 100, 'lunch', '2026-10-15T14:00:00Z'),
      meal('b', 400, 'breakfast'),
      meal('l1', 300, 'lunch', '2026-10-15T13:00:00Z'),
    ]);
    expect(groups.map(group => group.type)).toEqual(['breakfast', 'lunch', 'snack']);
    expect(groups[1].meals.map(item => item.id)).toEqual(['l1', 'l2']);
    expect(groups[1].kcal).toBe(400);
  });
});
