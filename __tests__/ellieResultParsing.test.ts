import {
  historyToMessages,
  parseNutrition,
  parseTool,
  parseWorkout,
} from '@app/features/ellie/resultParsing';

describe('ellie result parsing', () => {
  it('fills defaults for a sparse workout', () => {
    const workout = parseWorkout({ title: 'Pierna', exercises: [{ name: 'Sentadilla', sets: 3 }] });
    expect(workout.type).toBe('strength');
    expect(workout.duration).toBe(30);
    expect(workout.exercises[0]).toMatchObject({ name: 'Sentadilla', sets: 3 });
  });

  it('keeps the catalog exercise_id of every exercise and how many were dropped', () => {
    const workout = parseWorkout({
      title: 'Full body',
      target_muscles: ['legs'],
      dropped_exercises: 2,
      exercises: [
        { exercise_id: 'ex-1', slug: 'squat', name: 'Sentadilla', sets: 3, reps: '10', rest_time: 60 },
        { exercise_id: 'ex-2', slug: 'plank', name: 'Plancha', sets: 2, duration: 45 },
      ],
    });
    expect(workout.exercises.map(exercise => exercise.exerciseId)).toEqual(['ex-1', 'ex-2']);
    expect(workout.exercises[0]).toMatchObject({ reps: 10, restTime: 60 });
    expect(workout.droppedExercises).toBe(2);
    expect(workout.targetMuscles).toEqual(['legs']);
  });

  it('reads snake_case and camelCase nutrition targets', () => {
    expect(parseNutrition({ target_calories: 2100, targetProtein: 150 })).toMatchObject({
      targetCalories: 2100,
      targetProtein: 150,
      targetCarbs: 250,
    });
  });

  it('turns a plan of the server into a card; the reply content is the intro', () => {
    const parsed = parseTool(
      { type: 'generate_nutrition_plan', data: { target_calories: 2300, intro_message: 'Listo.' } },
      'c1',
      'Listo.',
    );
    expect(parsed?.card).toMatchObject({ kind: 'nutrition', stage: 'proposed', plan: { targetCalories: 2300 } });
    expect(parsed?.intro).toBe('Listo.');
  });
});

describe('stored conversation → messages', () => {
  const row = (extra: object) => ({
    id: 'm',
    conversationId: 'c',
    role: 'assistant' as const,
    content: '',
    imagePath: null,
    toolType: null,
    toolData: null,
    clientMessageId: null,
    createdAt: '2026-10-14T10:00:00Z',
    ...extra,
  });

  it('text turns and plan turns (as intro + card)', () => {
    const messages = historyToMessages([
      row({ id: 'u1', role: 'user', content: 'Hola', clientMessageId: 'cm-1' }),
      row({ id: 'a1', content: 'Hola, ¿qué tal?' }),
      row({
        id: 'a2',
        content: 'Este plan va contigo.',
        toolType: 'generate_workout_plan',
        toolData: { title: 'Pierna', exercises: [{ exercise_id: 'ex-1', name: 'Sentadilla' }] },
      }),
    ]);
    expect(messages.map(message => message.kind)).toEqual(['text', 'text', 'text', 'workout']);
    expect(messages[0]).toMatchObject({ role: 'user', status: 'sent', clientMessageId: 'cm-1' });
    expect(messages[3]).toMatchObject({ kind: 'workout', stage: 'proposed' });
  });

  it('an unknown tool type stays plain text', () => {
    const [message] = historyToMessages([row({ content: 'x', toolType: 'other', toolData: {} })]);
    expect(message).toMatchObject({ kind: 'text', text: 'x' });
  });
});

describe('meal_analysis (photo in the chat)', () => {
  const data = {
    intro_message: 'Parece un bowl.',
    title: 'Bowl de pollo',
    meal_type_suggestion: 'lunch',
    items: [{ name: 'Pollo', grams: 150, kcal: 248, protein: 46, carbs: 0, fats: 6 }],
    totals: { kcal: 248, protein: 46, carbs: 0, fats: 6 },
    confidence: 0.85,
    warnings: [],
    image_path: 'u/abc.jpg',
  };

  it('becomes a meal card with the summary and the photo of the chat', () => {
    const parsed = parseTool({ type: 'meal_analysis', data }, 'msg-1', 'Parece un bowl.');
    expect(parsed?.card).toMatchObject({
      id: 'msg-1',
      kind: 'meal',
      meal: { title: 'Bowl de pollo', imagePath: 'u/abc.jpg', mealTypeSuggestion: 'lunch', totals: { kcal: 248 } },
    });
    expect(parsed?.intro).toBe('Parece un bowl.');
  });

  it('comes back from the stored thread (tool_type meal_analysis)', () => {
    const messages = historyToMessages([
      {
        id: 'msg-1', conversationId: 'c', role: 'assistant', content: 'Parece un bowl.', imagePath: null,
        toolType: 'meal_analysis', toolData: data, clientMessageId: null, createdAt: '',
      },
    ]);
    expect(messages.map(message => message.kind)).toEqual(['text', 'meal']);
  });

  it('a tool type the app does not know shows only the content', () => {
    const messages = historyToMessages([
      {
        id: 'x', conversationId: 'c', role: 'assistant', content: 'Solo texto', imagePath: null,
        toolType: 'future_tool', toolData: { a: 1 }, clientMessageId: null, createdAt: '',
      },
    ]);
    expect(messages).toEqual([{ id: 'x', role: 'assistant', kind: 'text', text: 'Solo texto' }]);
  });

  it('the photo of a user message is kept', () => {
    const [message] = historyToMessages([
      {
        id: 'u', conversationId: 'c', role: 'user', content: 'mira', imagePath: 'u/p.jpg',
        toolType: null, toolData: null, clientMessageId: 'cm', createdAt: '',
      },
    ]);
    expect(message).toMatchObject({ role: 'user', imagePath: 'u/p.jpg', clientMessageId: 'cm' });
  });
});
