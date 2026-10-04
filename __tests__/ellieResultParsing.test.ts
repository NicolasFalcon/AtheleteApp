import {
  parseNutrition,
  parseToolResult,
  parseWorkout,
  toClientMessages,
} from '@app/features/ellie/resultParsing';
import { initialChatState, chatReducer } from '@app/features/ellie/chatModel';

describe('ellie result parsing', () => {
  it('fills defaults for a sparse workout', () => {
    const workout = parseWorkout({ title: 'Pierna', exercises: [{ name: 'Sentadilla', sets: 3 }] });
    expect(workout.type).toBe('strength');
    expect(workout.duration).toBe(30);
    expect(workout.exercises[0]).toMatchObject({ name: 'Sentadilla', sets: 3 });
  });

  it('reads snake_case and camelCase nutrition targets', () => {
    expect(parseNutrition({ target_calories: 2100, targetProtein: 150 })).toMatchObject({
      targetCalories: 2100,
      targetProtein: 150,
      targetCarbs: 250,
    });
  });

  it('turns a tool result into a card with its summary, text into null', () => {
    const parsed = parseToolResult(
      { type: 'generate_nutrition_plan', data: { target_calories: 2300, intro_message: 'Listo.' } },
      'c1',
      [],
    );
    expect(parsed?.card.kind).toBe('nutrition');
    expect(parsed?.summary).toBe('Listo.');
    expect(parseToolResult({ type: 'text', data: { content: 'hola' } }, 'c2', [])).toBeNull();
  });

  it('sends only the conversation text to the model', () => {
    let state = initialChatState('Hola');
    state = chatReducer(state, { type: 'send', id: 'u1', text: 'Hola ELLIE' });
    state = chatReducer(state, { type: 'fail', id: 'u1', kind: 'offline' });
    expect(toClientMessages(state.messages, 'u1')).toEqual([]);
    expect(toClientMessages(state.messages)).toEqual([{ role: 'user', content: 'Hola ELLIE' }]);
  });
});
