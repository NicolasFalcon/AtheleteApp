import {
  DUPLICATE_WAITS_MS,
  EllieError,
  parseEllieError,
  parseEllieReply,
  sendEllieMessage,
  type EllieInvoke,
} from '../src/services/ellie/ellieService';

const reply = (extra: object = {}) => ({
  ok: true,
  replayed: false,
  conversation_id: 'conv-1',
  message: { id: 'm-1', role: 'assistant', content: 'Hola', tool: null, created_at: '2026-10-15T10:00:00Z' },
  usage: { used: 3, limit: 40, remaining: 37, image_analyses_used: 1, image_analyses_limit: 10 },
  ...extra,
});
const failure = (status: number, error: string, extra: object = {}) => ({
  status,
  body: { ok: false, error, message: 'x', ...extra },
});

const noSleep = async () => undefined;

describe('request body', () => {
  it('sends the contract fields with stream=false, mode chat by default and no user data', async () => {
    const invoke = jest.fn<ReturnType<EllieInvoke>, Parameters<EllieInvoke>>(async () => ({ status: 200, body: reply() }));
    await sendEllieMessage(
      { conversationId: null, clientMessageId: 'cm-1', message: 'Hola', clientContext: 'home' },
      { invoke },
    );
    expect(invoke).toHaveBeenCalledWith({
      conversation_id: null,
      client_message_id: 'cm-1',
      message: 'Hola',
      image_path: null,
      mode: 'chat',
      stream: false,
      client_context: 'home',
    });
  });

  it('supports image_path and the plan modes', async () => {
    const invoke = jest.fn<ReturnType<EllieInvoke>, Parameters<EllieInvoke>>(async () => ({ status: 200, body: reply() }));
    await sendEllieMessage(
      { conversationId: 'c', clientMessageId: 'cm-2', message: 'Plan', mode: 'generate_workout', imagePath: 'uid/a.jpg' },
      { invoke },
    );
    expect(invoke.mock.calls[0][0]).toMatchObject({ mode: 'generate_workout', image_path: 'uid/a.jpg', conversation_id: 'c' });
  });
});

describe('idempotent retry', () => {
  it('a retry after a failure sends the SAME client_message_id', async () => {
    const seen: unknown[] = [];
    let n = 0;
    const invoke: EllieInvoke = async body => {
      seen.push(body.client_message_id);
      n += 1;
      return n === 1 ? failure(502, 'ai_unavailable') : { status: 200, body: reply({ replayed: false }) };
    };
    const input = { conversationId: 'c', clientMessageId: 'same-id', message: 'Hola' };
    await expect(sendEllieMessage(input, { invoke, sleep: noSleep })).rejects.toMatchObject({ code: 'ai_unavailable' });
    const ok = await sendEllieMessage(input, { invoke, sleep: noSleep });
    expect(seen).toEqual(['same-id', 'same-id']);
    expect(ok.message.content).toBe('Hola');
  });

  it('a replayed answer is returned as it is', async () => {
    const invoke: EllieInvoke = async () => ({ status: 200, body: reply({ replayed: true }) });
    const result = await sendEllieMessage({ conversationId: 'c', clientMessageId: 'x', message: 'Hola' }, { invoke });
    expect(result.replayed).toBe(true);
  });

  it('409 duplicate_in_progress waits and asks again silently with the same id, 3 attempts at most', async () => {
    const waits: number[] = [];
    const ids: unknown[] = [];
    let n = 0;
    const invoke: EllieInvoke = async body => {
      ids.push(body.client_message_id);
      n += 1;
      return n < 3 ? failure(409, 'duplicate_in_progress') : { status: 200, body: reply() };
    };
    const result = await sendEllieMessage(
      { conversationId: 'c', clientMessageId: 'dup', message: 'Hola' },
      { invoke, sleep: async ms => void waits.push(ms) },
    );
    expect(result.conversationId).toBe('conv-1');
    expect(ids).toEqual(['dup', 'dup', 'dup']);
    expect(waits).toEqual([...DUPLICATE_WAITS_MS]);
  });

  it('gives up after the third 409', async () => {
    const invoke = jest.fn<ReturnType<EllieInvoke>, Parameters<EllieInvoke>>(async () => failure(409, 'duplicate_in_progress'));
    await expect(
      sendEllieMessage({ conversationId: 'c', clientMessageId: 'dup', message: 'Hola' }, { invoke, sleep: noSleep }),
    ).rejects.toMatchObject({ code: 'duplicate_in_progress', status: 409 });
    expect(invoke).toHaveBeenCalledTimes(3);
  });

  it('other errors are not retried silently', async () => {
    const invoke = jest.fn<ReturnType<EllieInvoke>, Parameters<EllieInvoke>>(async () => failure(429, 'rate_limited'));
    await expect(
      sendEllieMessage({ conversationId: 'c', clientMessageId: 'x', message: 'Hola' }, { invoke, sleep: noSleep }),
    ).rejects.toMatchObject({ code: 'rate_limited' });
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});

describe('error mapping', () => {
  it.each([
    [400, 'invalid_input'],
    [401, 'unauthorized'],
    [403, 'image_forbidden'],
    [403, 'ai_forbidden'],
    [404, 'conversation_not_found'],
    [404, 'image_not_found'],
    [413, 'image_too_large'],
    [415, 'image_type'],
    [429, 'daily_limit'],
    [429, 'daily_image_limit'],
    [429, 'rate_limited'],
    [402, 'ai_credits_exhausted'],
    [502, 'ai_unavailable'],
    [500, 'internal'],
  ])('%s %s', (status, code) => {
    expect(parseEllieError(status, { ok: false, error: code }).code).toBe(code);
  });

  it('keeps used / limit of the daily limit', () => {
    const error = parseEllieError(429, { ok: false, error: 'daily_limit', used: 40, limit: 40 });
    expect(error).toMatchObject({ code: 'daily_limit', used: 40, limit: 40, status: 429 });
  });

  it('falls back to the HTTP status when the body is not readable', () => {
    expect(parseEllieError(401, null).code).toBe('unauthorized');
    expect(parseEllieError(429, 'oops').code).toBe('rate_limited');
    expect(parseEllieError(402, undefined).code).toBe('ai_credits_exhausted');
    expect(parseEllieError(503, {}).code).toBe('internal');
    expect(parseEllieError(418, {}).code).toBe('unknown');
  });

  it('a failure to reach the server is "offline"', async () => {
    const invoke: EllieInvoke = async () => {
      throw new TypeError('Network request failed');
    };
    await expect(
      sendEllieMessage({ conversationId: null, clientMessageId: 'x', message: 'Hola' }, { invoke }),
    ).rejects.toBeInstanceOf(EllieError);
    await expect(
      sendEllieMessage({ conversationId: null, clientMessageId: 'x', message: 'Hola' }, { invoke }),
    ).rejects.toMatchObject({ code: 'offline' });
  });
});

describe('reply', () => {
  it('reads the text, usage and the plan (tool)', () => {
    const parsed = parseEllieReply(
      reply({
        message: {
          id: 'm',
          role: 'assistant',
          content: 'Tu plan',
          created_at: '2026-10-15T10:00:00Z',
          tool: { type: 'generate_nutrition_plan', data: { intro_message: 'Tu plan', target_calories: 2300 } },
        },
      }),
    );
    expect(parsed.conversationId).toBe('conv-1');
    expect(parsed.message.tool).toMatchObject({ type: 'generate_nutrition_plan', data: { target_calories: 2300 } });
    expect(parsed.usage).toEqual({
      used: 3,
      limit: 40,
      remaining: 37,
      imageAnalysesUsed: 1,
      imageAnalysesLimit: 10,
      machineScansUsed: 0,
      machineScansLimit: 0,
      visionAttemptsUsed: 0,
      visionAttemptsLimit: 0,
    });
  });

  it('reads the meal_analysis tool and ignores unknown ones', () => {
    const meal = parseEllieReply(
      reply({ message: { id: 'm', content: 'x', tool: { type: 'meal_analysis', data: { title: 'Bowl' } } } }),
    );
    expect(meal.message.tool).toMatchObject({ type: 'meal_analysis' });
    const unknown = parseEllieReply(reply({ message: { id: 'm', content: 'solo texto', tool: { type: 'future', data: {} } } }));
    expect(unknown.message.tool).toBeNull();
    expect(unknown.message.content).toBe('solo texto');
  });

  it('sends the photo path of the message and keeps it on retry', async () => {
    const seen: unknown[] = [];
    let n = 0;
    const invoke: EllieInvoke = async body => {
      seen.push([body.client_message_id, body.image_path]);
      n += 1;
      return n === 1 ? failure(502, 'ai_unavailable') : { status: 200, body: reply() };
    };
    const input = { conversationId: 'c', clientMessageId: 'same', message: 'mira', imagePath: 'u/p.jpg' };
    await expect(sendEllieMessage(input, { invoke, sleep: noSleep })).rejects.toBeInstanceOf(EllieError);
    await sendEllieMessage(input, { invoke, sleep: noSleep });
    expect(seen).toEqual([['same', 'u/p.jpg'], ['same', 'u/p.jpg']]);
  });

  it('ignores an unknown tool and rejects an unreadable answer', () => {
    expect(parseEllieReply(reply({ message: { id: 'm', content: 'x', tool: { type: 'other', data: {} } } })).message.tool).toBeNull();
    expect(() => parseEllieReply({ ok: false })).toThrow(EllieError);
    expect(() => parseEllieReply(null)).toThrow(EllieError);
  });
});
