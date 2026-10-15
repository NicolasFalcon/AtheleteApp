import { createMealRegistrar } from '../src/features/nutrition/mealRegistrar';
import type { Meal, SaveMealInput } from '../src/services/nutrition/mealsService';

const meal = (id: string): Meal => ({
  id, localDate: '2026-10-15', mealType: 'snack', source: 'chat', title: 't', items: [], kcal: 300, protein: 0, carbs: 0, fats: 0,
  imagePath: null, confidence: null, repeatedFrom: null, chatMessageId: 'msg-1', createdAt: '', updatedAt: '',
});
const input: SaveMealInput = { source: 'chat', mealType: 'snack', title: 't', kcal: 300, imagePath: 'u/p.jpg' };

describe('Registrar en Calorías from the chat card', () => {
  it('saves with source chat, the message id and the photo of the chat', async () => {
    const registrar = createMealRegistrar();
    const save = jest.fn(async (value: SaveMealInput) => ({ ...meal('m1'), chatMessageId: value.chatMessageId ?? null }));
    const result = await registrar.register('msg-1', { ...input, source: 'photo' }, save);
    expect(result.outcome).toBe('saved');
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ source: 'chat', chatMessageId: 'msg-1', imagePath: 'u/p.jpg' }));
  });

  it('a second tap while it is saving, or after it was saved, does not register again', async () => {
    const registrar = createMealRegistrar();
    let finish: (value: Meal) => void = () => undefined;
    const save = jest.fn(() => new Promise<Meal>(resolve => (finish = resolve)));
    const first = registrar.register('msg-1', input, save);
    const during = await registrar.register('msg-1', input, save);
    expect(during.outcome).toBe('duplicate');
    finish(meal('m1'));
    expect((await first).outcome).toBe('saved');
    const after = await registrar.register('msg-1', input, save);
    expect(after.outcome).toBe('duplicate');
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('a failure lets the person try again, and only one meal results', async () => {
    const registrar = createMealRegistrar();
    const save = jest
      .fn<Promise<Meal>, [SaveMealInput]>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(meal('m1'));
    expect((await registrar.register('msg-1', input, save)).outcome).toBe('failed');
    expect(registrar.isBusy('msg-1')).toBe(false);
    expect((await registrar.register('msg-1', input, save)).outcome).toBe('saved');
    expect((await registrar.register('msg-1', input, save)).outcome).toBe('duplicate');
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('a meal already found in the database (old thread, or saved from the editor) blocks it too', async () => {
    const registrar = createMealRegistrar();
    registrar.markDone('msg-9');
    const save = jest.fn();
    expect((await registrar.register('msg-9', input, save)).outcome).toBe('duplicate');
    expect(save).not.toHaveBeenCalled();
  });

  it('different cards are independent', async () => {
    const registrar = createMealRegistrar();
    const save = jest.fn(async () => meal('m'));
    await registrar.register('a', input, save);
    expect((await registrar.register('b', input, save)).outcome).toBe('saved');
  });
});
