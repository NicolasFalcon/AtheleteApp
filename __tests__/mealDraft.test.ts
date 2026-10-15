import {
  canSave,
  clockLabel,
  draftFromAnalysis,
  draftFromMeal,
  draftTotals,
  isLowConfidence,
  itemValues,
  mealTypeForTime,
  removeItem,
  setMealType,
  stepItem,
  toSaveInput,
  toUpdateInput,
} from '../src/features/nutrition/mealDraft';
import { createMealsService, parseNutritionDay, savePayload, type MealsRpc } from '../src/services/nutrition/mealsService';
import type { MealAnalysis } from '../src/services/vision/visionService';

const analysis: MealAnalysis = {
  title: 'Pollo con arroz',
  mealTypeSuggestion: null,
  items: [
    { name: 'Pechuga', grams: 150, kcal: 248, protein: 46, carbs: 0, fats: 6 },
    { name: 'Arroz', grams: 100, kcal: 130, protein: 3, carbs: 28, fats: 0 },
    { name: 'Brócoli', grams: 80, kcal: 28, protein: 2, carbs: 5, fats: 0 },
  ],
  totals: { kcal: 406, protein: 51, carbs: 33, fats: 6 },
  confidence: 0.9,
  warnings: [],
  imagePath: 'u/meals/a.jpg',
};
const at = (hour: number, minute = 0) => new Date(2026, 9, 15, hour, minute);

describe('moment of the day by the clock', () => {
  it('breakfast before 11:00, lunch to 16:59, dinner to 22:59, snack the rest', () => {
    expect(mealTypeForTime(at(8))).toBe('breakfast');
    expect(mealTypeForTime(at(10, 59))).toBe('breakfast');
    expect(mealTypeForTime(at(11))).toBe('lunch');
    expect(mealTypeForTime(at(16, 59))).toBe('lunch');
    expect(mealTypeForTime(at(17))).toBe('dinner');
    expect(mealTypeForTime(at(22, 59))).toBe('dinner');
    expect(mealTypeForTime(at(23, 30))).toBe('snack');
    expect(mealTypeForTime(at(2))).toBe('snack');
    expect(clockLabel(at(21, 5))).toBe('21:05');
  });

  it('the draft takes ELLIE\'s suggestion, or the clock when there is none', () => {
    expect(draftFromAnalysis(analysis, at(21))).toMatchObject({ mealType: 'dinner', mealTypeFromClock: true });
    expect(draftFromAnalysis({ ...analysis, mealTypeSuggestion: 'breakfast' }, at(21))).toMatchObject({
      mealType: 'breakfast',
      mealTypeFromClock: false,
    });
  });
});

describe('editing the draft', () => {
  it('a portion scales kcal and macros proportionally, in the item\'s step', () => {
    let draft = draftFromAnalysis(analysis, at(14));
    const chicken = draft.items[0];
    expect(chicken.step).toBe(25);
    draft = stepItem(draft, chicken.id, 1);
    expect(itemValues(draft.items[0])).toMatchObject({ grams: 175, kcal: 289, protein: 54 });
    draft = stepItem(stepItem(draft, chicken.id, -1), chicken.id, -1);
    expect(draft.items[0].grams).toBe(125);
    expect(draftTotals(draft).kcal).toBe(207 + 130 + 28);
  });

  it('a portion never goes under one step', () => {
    let draft = draftFromAnalysis(analysis, at(14));
    for (let i = 0; i < 20; i += 1) {
      draft = stepItem(draft, draft.items[2].id, -1);
    }
    expect(draft.items[2].grams).toBe(draft.items[2].step);
  });

  it('removing a food changes the total; removing all of them cannot be saved', () => {
    let draft = draftFromAnalysis(analysis, at(14));
    draft = removeItem(draft, draft.items[0].id);
    expect(draftTotals(draft)).toEqual({ kcal: 158, protein: 5, carbs: 33, fats: 0 });
    draft = removeItem(draft, draft.items[0].id);
    draft = removeItem(draft, draft.items[0].id);
    expect(draft.items).toHaveLength(0);
    expect(canSave(draft)).toBe(false);
  });

  it('changing the moment is a choice (it stops being "by the clock")', () => {
    const draft = setMealType(draftFromAnalysis(analysis, at(21)), 'snack');
    expect(draft).toMatchObject({ mealType: 'snack', mealTypeFromClock: false });
  });

  it('under 0,6 ELLIE says she is not sure', () => {
    expect(isLowConfidence(draftFromAnalysis({ ...analysis, confidence: 0.5 }, at(9)))).toBe(true);
    expect(isLowConfidence(draftFromAnalysis(analysis, at(9)))).toBe(false);
  });
});

describe('draft → save_meal (only when confirmed)', () => {
  it('edited draft becomes the payload of save_meal with source photo', async () => {
    let draft = draftFromAnalysis(analysis, at(21));
    draft = removeItem(draft, draft.items[2].id);
    draft = stepItem(draft, draft.items[0].id, 1);
    draft = { ...draft, title: '  Cena de ayer  ' };

    const calls: [string, object | undefined][] = [];
    const rpc: MealsRpc = async (name, args) => {
      calls.push([name, args]);
      return { ok: true, meal: { id: 'm1', local_date: '2026-10-15', meal_type: 'dinner', source: 'photo', title: 'Cena de ayer', kcal: 419 } };
    };
    // nothing is sent while the person edits
    expect(calls).toHaveLength(0);
    const meal = await createMealsService(rpc).save(toSaveInput(draft, { source: 'photo' }));
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe('save_meal');
    expect(calls[0][1]).toEqual({
      _payload: {
        source: 'photo',
        meal_type: 'dinner',
        title: 'Cena de ayer',
        items: [
          { name: 'Pechuga', grams: 175, kcal: 289, protein: 54, carbs: 0, fats: 7 },
          { name: 'Arroz', grams: 100, kcal: 130, protein: 3, carbs: 28, fats: 0 },
        ],
        kcal: 419,
        protein: 57,
        carbs: 28,
        fats: 7,
        image_path: 'u/meals/a.jpg',
        confidence: 0.9,
      },
    });
    expect(meal.id).toBe('m1');
  });

  it('from the chat it carries the message id and the same photo; by hand it has no items', () => {
    const chat = toSaveInput(draftFromAnalysis(analysis, at(9)), { source: 'chat', chatMessageId: 'msg-1' });
    expect(savePayload(chat)).toMatchObject({ source: 'chat', chat_message_id: 'msg-1', image_path: 'u/meals/a.jpg' });
    const manual = toSaveInput(
      { title: '', mealType: 'snack', mealTypeFromClock: false, items: [], manualKcal: 450, confidence: null, warnings: [], imagePath: null },
      { source: 'manual', language: 'es' },
    );
    expect(savePayload(manual)).toEqual({ source: 'manual', meal_type: 'snack', title: 'Comida', items: [], kcal: 450 });
  });

  it('editing a saved meal sends only what changed shape (update_meal)', async () => {
    const calls: [string, object | undefined][] = [];
    const rpc: MealsRpc = async (name, args) => {
      calls.push([name, args]);
      return { ok: true, meal: { id: 'm1', meal_type: 'lunch', kcal: 100 } };
    };
    const draft = draftFromMeal({
      id: 'm1', localDate: '2026-10-15', mealType: 'lunch', source: 'photo', title: 'Bowl',
      items: [{ name: 'Bowl', grams: 200, kcal: 400, protein: 30, carbs: 40, fats: 10 }],
      kcal: 400, protein: 30, carbs: 40, fats: 10, imagePath: 'p', confidence: 0.8, repeatedFrom: null,
      chatMessageId: null, createdAt: '', updatedAt: '',
    });
    await createMealsService(rpc).update('m1', toUpdateInput(stepItem(draft, draft.items[0].id, -1)));
    expect(calls[0][0]).toBe('update_meal');
    expect(calls[0][1]).toMatchObject({ _id: 'm1', _payload: { kcal: 350, protein: 26, meal_type: 'lunch' } });
  });
});

describe('get_nutrition_day', () => {
  const day = (goal: object, remaining: object | null) => ({
    ok: true,
    date: '2026-10-15',
    is_today: true,
    meals: [{ id: 'm1', meal_type: 'lunch', source: 'repeat', title: 'Bowl', kcal: 720, protein: 40, carbs: 70, fats: 20 }],
    totals: { kcal: 720, protein: 40, carbs: 70, fats: 20 },
    goal,
    remaining,
  });

  it('with a plan: goal and remaining', () => {
    const parsed = parseNutritionDay(day({ source: 'plan', plan_id: 'p', kcal: 2850, protein: 168, carbs: 330, fats: 85 }, { kcal: 2130, protein: 128, carbs: 260, fats: 65 }));
    expect(parsed.goal).toMatchObject({ source: 'plan', kcal: 2850 });
    expect(parsed.remaining?.kcal).toBe(2130);
    expect(parsed.meals[0]).toMatchObject({ source: 'repeat', mealType: 'lunch' });
  });

  it('goal.source none: no goal and no remaining, even if the server sends nulls or zeros', () => {
    const parsed = parseNutritionDay(day({ source: 'none', plan_id: null, kcal: null, protein: null, carbs: null, fats: null }, null));
    expect(parsed.goal).toEqual({ source: 'none', planId: null, kcal: null, protein: null, carbs: null, fats: null });
    expect(parsed.remaining).toBeNull();
  });

  it('a refusal is an error with its code', async () => {
    const rpc: MealsRpc = async () => ({ ok: false, error: 'unauthorized' });
    await expect(createMealsService(rpc).getDay()).rejects.toMatchObject({ code: 'unauthorized' });
  });
});
