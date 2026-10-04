import {
  chatReducer,
  classifyEllieError,
  composerState,
  DONUT_LENGTH,
  ELLIE_ERROR_LINES,
  GREETING_ID,
  initialChatState,
  isFirstContact,
  lastLine,
  macroDonut,
  relativeWhen,
  showSuggestions,
  type CardMessage,
  type ChatState,
} from '../src/features/ellie/chatModel';

const plan: CardMessage = {
  id: 'p1',
  role: 'assistant',
  kind: 'nutrition',
  stage: 'proposed',
  plan: { targetCalories: 2850, targetProtein: 168, targetCarbs: 330, targetFats: 85 },
};

const start = () => initialChatState('Hola, Nicolas.');

describe('error classification', () => {
  it('reads limit, server and no connection', () => {
    expect(classifyEllieError({ status: 429 })).toBe('limit');
    expect(classifyEllieError({ status: 402 })).toBe('limit');
    expect(classifyEllieError({ status: 500 })).toBe('server');
    expect(classifyEllieError({ status: 400, message: 'bad' })).toBe('server');
    expect(classifyEllieError({ message: 'Network request failed' })).toBe('offline');
    expect(classifyEllieError({ message: 'No pudimos conectar con ELLIE.' })).toBe('offline');
    expect(classifyEllieError({ message: 'boom' })).toBe('server');
    expect(classifyEllieError({})).toBe('server');
  });
});

describe('sending', () => {
  it('goes sending → sent when ELLIE answers, with the thinking state', () => {
    let state = chatReducer(start(), { type: 'send', id: 'u1', text: 'Hola' });
    expect(state.thinking).toBe(true);
    expect(state.messages[1]).toMatchObject({ role: 'user', status: 'sending', persisted: false });
    expect(showSuggestions(state)).toBe(false);

    state = chatReducer(state, { type: 'persisted', id: 'u1' });
    state = chatReducer(state, { type: 'delta', id: 'a1', delta: 'Hola, ' });
    state = chatReducer(state, { type: 'delta', id: 'a1', delta: 'Nicolas.' });
    expect(state.messages[2]).toMatchObject({ kind: 'text', text: 'Hola, Nicolas.' });
    state = chatReducer(state, { type: 'done' });
    expect(state.thinking).toBe(false);
    expect(state.messages[1]).toMatchObject({ status: 'sent', persisted: true });
    expect(composerState(state, 'otra').canSend).toBe(true);
    expect(composerState(state, '   ').canSend).toBe(false);
  });

  it('cannot send while ELLIE is thinking', () => {
    const state = chatReducer(start(), { type: 'send', id: 'u1', text: 'Hola' });
    expect(composerState(state, 'más').canSend).toBe(false);
  });

  it('shows the suggestions only before the first message', () => {
    expect(isFirstContact(start().messages)).toBe(true);
    expect(showSuggestions(start())).toBe(true);
    expect(start().messages[0].id).toBe(GREETING_ID);
  });
});

describe('failures and retry', () => {
  const failed = (kind: 'offline' | 'server' | 'limit'): ChatState =>
    chatReducer(chatReducer(start(), { type: 'send', id: 'u1', text: 'Ajusta mi rutina' }), {
      type: 'fail',
      id: 'u1',
      kind,
    });

  it('marks the message as not sent and ELLIE explains it with her voice', () => {
    const state = failed('offline');
    expect(state.thinking).toBe(false);
    expect(state.messages[1]).toMatchObject({ status: 'failed' });
    expect(state.messages[2]).toMatchObject({
      notice: true,
      text: ELLIE_ERROR_LINES.offline,
    });
    // No connection: the composer is inactive (STATE_08).
    expect(composerState(state, 'hola')).toEqual({
      canSend: false,
      disabled: true,
      placeholder: 'Sin conexión',
    });
  });

  it('a server error keeps the composer open; a limit blocks it', () => {
    expect(composerState(failed('server'), 'hola').disabled).toBe(false);
    expect(composerState(failed('limit'), 'hola')).toMatchObject({
      disabled: true,
      placeholder: 'Límite alcanzado',
    });
  });

  it('retry clears the explanation and sends again without storing twice', () => {
    let state = chatReducer(failed('offline'), { type: 'persisted', id: 'u1' });
    state = chatReducer(state, { type: 'retry', id: 'u1' });
    expect(state.thinking).toBe(true);
    expect(state.blocked).toBeNull();
    expect(state.messages.some(message => message.id === 'notice-u1')).toBe(false);
    expect(state.messages[1]).toMatchObject({ status: 'sending', persisted: true });
    // A second failure replaces the notice instead of stacking another.
    state = chatReducer(state, { type: 'fail', id: 'u1', kind: 'server' });
    expect(state.messages.filter(message => 'notice' in message && message.notice)).toHaveLength(1);
  });
});

describe('generative cards', () => {
  const proposed = () =>
    chatReducer(chatReducer(start(), { type: 'send', id: 'u1', text: 'Quiero un plan' }), {
      type: 'tool',
      id: 'stream',
      intro: 'Con tu objetivo te propongo esto.',
      card: plan,
    });

  it('puts the intro and the card after the user message', () => {
    const state = proposed();
    expect(state.thinking).toBe(false);
    expect(state.messages.map(message => message.id)).toEqual([
      GREETING_ID,
      'u1',
      'p1-intro',
      'p1',
    ]);
    expect(state.messages[1]).toMatchObject({ status: 'sent' });
  });

  it('walks proposed → activating → error → activating → active', () => {
    let state = proposed();
    const stage = (value: 'proposed' | 'activating' | 'error' | 'active') => {
      state = chatReducer(state, { type: 'stage', id: 'p1', stage: value });
      return state.messages.find(message => message.id === 'p1');
    };
    expect(stage('activating')).toMatchObject({ stage: 'activating' });
    expect(stage('error')).toMatchObject({ stage: 'error' });
    expect(stage('activating')).toMatchObject({ stage: 'activating' });
    expect(stage('active')).toMatchObject({ stage: 'active' });
  });

  it('replaces a card with another version in the same place', () => {
    const next: CardMessage = {
      ...plan,
      id: 'other',
      plan: { ...(plan as { plan: object }).plan, targetCalories: 2700 } as never,
    } as CardMessage;
    const state = chatReducer(proposed(), { type: 'replace', id: 'p1', card: next });
    const card = state.messages.find(message => message.id === 'p1');
    expect(card).toMatchObject({ kind: 'nutrition', plan: { targetCalories: 2700 } });
  });

  it('keeps the workout id when a routine is saved', () => {
    let state = chatReducer(start(), {
      type: 'tool',
      id: 's',
      card: {
        id: 'w1',
        role: 'assistant',
        kind: 'workout',
        stage: 'proposed',
        workout: {
          title: 'Total Body exprés',
          type: 'fullbody',
          difficulty: 'intermediate',
          duration: 30,
          calories: 200,
          targetMuscles: [],
          exercises: [],
        },
      },
    });
    state = chatReducer(state, { type: 'stage', id: 'w1', stage: 'saved', workoutId: 'abc' });
    expect(state.messages.find(m => m.id === 'w1')).toMatchObject({ stage: 'saved', workoutId: 'abc' });
  });
});

describe('history and the plan donut', () => {
  it('loads the stored thread after the greeting and offers to resume it', () => {
    const state = chatReducer(start(), {
      type: 'load',
      greeting: 'Hola',
      history: [
        { id: '1', role: 'user', content: 'Hola' },
        { id: '2', role: 'assistant', content: 'Hola,   ¿en qué te ayudo?' },
      ],
    });
    expect(state.messages).toHaveLength(3);
    expect(state.messages[1]).toMatchObject({ status: 'sent', persisted: true });
    const now = new Date(2026, 9, 4, 12);
    expect(
      lastLine([{ content: 'Hola,   ¿en qué te ayudo?', createdAt: new Date(2026, 9, 4, 11, 30).toISOString() }], now),
    ).toEqual({ text: 'Hola, ¿en qué te ayudo?', when: 'Ahora' });
    expect(lastLine([], now)).toBeNull();
    expect(relativeWhen(new Date(2026, 9, 3, 20).toISOString(), now)).toBe('Ayer');
    expect(relativeWhen(new Date(2026, 9, 1, 9).toISOString(), now)).toBe('Hace 3 días');
    expect(relativeWhen(new Date(2026, 9, 4, 6).toISOString(), now)).toBe('Hoy');
  });

  it('splits the plan donut by calories with a gap between arcs', () => {
    const [protein, carbs, fats] = macroDonut({ targetProtein: 168, targetCarbs: 330, targetFats: 85 });
    // 672 / 1320 / 765 kcal of 2757.
    expect(protein.length).toBeCloseTo((672 / 2757) * DONUT_LENGTH - 2, 1);
    expect(carbs.offset).toBeCloseTo(-(672 / 2757) * DONUT_LENGTH, 1);
    expect(fats.offset).toBeCloseTo(-((672 + 1320) / 2757) * DONUT_LENGTH, 1);
    expect(protein.length + carbs.length + fats.length + 6).toBeCloseTo(DONUT_LENGTH, 1);
    expect(macroDonut({ targetProtein: 0, targetCarbs: 0, targetFats: 0 })[0].length).toBe(0);
  });
});
