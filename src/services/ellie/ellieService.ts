import { fetch as streamingFetch } from 'expo/fetch';
import { env } from '@app/lib/config/env';
import { getSupabaseClient } from '@app/services/supabase/client';
import { deviceTimezone } from '@app/features/profile/timezoneSync';
import { parseProposalCard, type ProposalCard } from '@app/services/ellie/ellieProposals';

// ellie-chat (docs/backend/ELLIE_SHAPES.md): the only way messages reach the
// conversation. The server reads the user's context, keeps the history and
// writes both messages; the app never inserts into chat_messages. JSON mode
// (stream=false) or SSE (stream=true) with the session of the signed-in user;
// always with the phone's time (client_now, ctx-1) and the v2 cards (prop-1).

export type EllieMode = 'chat' | 'generate_workout' | 'generate_nutrition';

export type EllieUsage = {
  used: number;
  limit: number;
  remaining: number;
  imageAnalysesUsed: number;
  imageAnalysesLimit: number;
  machineScansUsed: number;
  machineScansLimit: number;
  visionAttemptsUsed: number;
  visionAttemptsLimit: number;
};

export type EllieTool = {
  // An unknown type is never an error: the screen shows only `content`.
  type: 'generate_workout_plan' | 'generate_nutrition_plan' | 'meal_analysis';
  data: Record<string, unknown>;
};

export type EllieReply = {
  conversationId: string;
  // The server answered again with the stored reply (a retry that had gone
  // through): no quota was charged.
  replayed: boolean;
  message: {
    id: string;
    content: string;
    createdAt: string;
    tool: EllieTool | null;
  };
  // The proposals of the answer (cards_v2).
  cards: ProposalCard[];
  usage: EllieUsage | null;
};

export type EllieSendInput = {
  conversationId: string | null;
  // Idempotency key: the SAME one for every retry of the same message.
  clientMessageId: string;
  message: string;
  mode?: EllieMode;
  // Supported by the service; the photo UI arrives with the Vision phase.
  imagePath?: string | null;
  // Only the screen the question comes from ("home", "session_summary"…),
  // never user data. The server already reads the context itself.
  clientContext?: string | null;
  // The proposal a chip or Ajustar adjusts (the id of THAT card).
  adjustProposalId?: string | null;
  // The answer to a discomfort_check card.
  discomfortAnswer?: DiscomfortAnswer | null;
  // Crear plan (TRAINING_PLAN_SHAPES tp-1.2 §4): the structured message
  // `{ type: 'training_plan_request', goal, weeks, days_of_week,
  // session_minutes, goal_target?, style_category? }`. The contract does not
  // name its key in the body; it travels as `training_plan_request`, next to
  // `message`, which carries the same choice in words.
  trainingPlanRequest?: Record<string, unknown> | null;
};

// discomfort_answer: the zone and whether it is still there.
export type DiscomfortStatus = 'active' | 'resolved';
export type DiscomfortAnswer = { zone: string; status: DiscomfortStatus };

// ── Errors ──────────────────────────────────────────────────────────────────
export type EllieErrorCode =
  | 'invalid_input'
  | 'unauthorized'
  | 'image_forbidden'
  | 'ai_forbidden'
  | 'conversation_not_found'
  | 'image_not_found'
  | 'duplicate_in_progress'
  | 'image_too_large'
  | 'image_type'
  | 'daily_limit'
  | 'daily_image_limit'
  // Vision (docs/backend/VISION_SHAPES.md).
  | 'daily_machine_limit'
  | 'vision_attempts_limit'
  | 'not_food'
  | 'low_confidence'
  | 'not_found'
  | 'rate_limited'
  | 'ai_credits_exhausted'
  | 'ai_unavailable'
  // The AI took longer than the server's limit (504), or the app stopped
  // waiting: "Está tardando más de lo normal" + Reintentar, never "offline".
  | 'ai_timeout'
  | 'internal'
  // No answer from the server at all.
  | 'offline'
  | 'unknown';

const KNOWN_CODES: readonly EllieErrorCode[] = [
  'invalid_input',
  'unauthorized',
  'image_forbidden',
  'ai_forbidden',
  'conversation_not_found',
  'image_not_found',
  'duplicate_in_progress',
  'image_too_large',
  'image_type',
  'daily_limit',
  'daily_image_limit',
  'daily_machine_limit',
  'vision_attempts_limit',
  'not_food',
  'low_confidence',
  'not_found',
  'rate_limited',
  'ai_credits_exhausted',
  'ai_unavailable',
  'ai_timeout',
  'internal',
];

export class EllieError extends Error {
  readonly code: EllieErrorCode;
  readonly status?: number;
  readonly used?: number;
  readonly limit?: number;

  constructor(code: EllieErrorCode, extra: { status?: number; used?: number; limit?: number; message?: string } = {}) {
    super(extra.message ?? code);
    this.name = 'EllieError';
    this.code = code;
    this.status = extra.status;
    this.used = extra.used;
    this.limit = extra.limit;
  }
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

// An error response: `{ ok:false, error, message, used?, limit? }` + the HTTP
// status. When the body is unreadable the status decides.
export function parseEllieError(status: number, body: unknown): EllieError {
  const record = asRecord(body);
  const raw = typeof record?.error === 'string' ? record.error : '';
  const code = (KNOWN_CODES as readonly string[]).includes(raw)
    ? (raw as EllieErrorCode)
    : status === 401
      ? 'unauthorized'
      : status === 429
        ? 'rate_limited'
        : status === 402
          ? 'ai_credits_exhausted'
          : status === 409
            ? 'duplicate_in_progress'
            : status === 502
              ? 'ai_unavailable'
              : status === 504
                ? 'ai_timeout'
                : status >= 500
                ? 'internal'
                : 'unknown';
  return new EllieError(code, {
    status,
    used: asNumber(record?.used),
    limit: asNumber(record?.limit),
  });
}

export function parseEllieUsage(value: unknown): EllieUsage | null {
  const record = asRecord(value);
  const used = asNumber(record?.used);
  const limit = asNumber(record?.limit);
  if (!record || used === undefined || limit === undefined) {
    return null;
  }
  return {
    used,
    limit,
    remaining: asNumber(record.remaining) ?? Math.max(0, limit - used),
    imageAnalysesUsed: asNumber(record.image_analyses_used) ?? 0,
    imageAnalysesLimit: asNumber(record.image_analyses_limit) ?? 0,
    machineScansUsed: asNumber(record.machine_scans_used) ?? 0,
    machineScansLimit: asNumber(record.machine_scans_limit) ?? 0,
    visionAttemptsUsed: asNumber(record.vision_attempts_used) ?? 0,
    visionAttemptsLimit: asNumber(record.vision_attempts_limit) ?? 0,
  };
}

export function parseEllieTool(value: unknown): EllieTool | null {
  const record = asRecord(value);
  const data = asRecord(record?.data);
  if (
    data &&
    (record?.type === 'generate_workout_plan' ||
      record?.type === 'generate_nutrition_plan' ||
      record?.type === 'meal_analysis')
  ) {
    return { type: record.type, data };
  }
  return null;
}

export function parseEllieReply(body: unknown): EllieReply {
  const record = asRecord(body);
  const message = asRecord(record?.message);
  const conversationId = record?.conversation_id;
  if (!record || record.ok !== true || !message || typeof conversationId !== 'string') {
    throw new EllieError('unknown', { message: 'Unreadable ellie-chat response' });
  }
  return {
    conversationId,
    replayed: record.replayed === true,
    message: {
      id: typeof message.id === 'string' ? message.id : '',
      content: typeof message.content === 'string' ? message.content : '',
      createdAt: typeof message.created_at === 'string' ? message.created_at : new Date().toISOString(),
      tool: parseEllieTool(message.tool),
    },
    cards: (Array.isArray(record.cards) ? record.cards : Array.isArray(message.cards) ? message.cards : [])
      .map(parseProposalCard)
      .filter((card): card is ProposalCard => card !== null),
    usage: parseEllieUsage(record.usage),
  };
}

// ── Transport ───────────────────────────────────────────────────────────────
export type InvokeResult = { status: number; body: unknown };
export type EllieInvoke = (body: Record<string, unknown>) => Promise<InvokeResult>;

// The server cuts the AI at 20 s (504 ai_timeout, ~25 s with the upload and
// the gateway): the app waits longer so it never gives up first.
export const AI_REQUEST_TIMEOUT_MS = 35_000;

// A failure to reach the server: "offline" only for a real network error; the
// app's own wait running out is a slow answer (ai_timeout).
export function transportError(error: unknown, timedOut: boolean): EllieError {
  const cause = (error as { context?: unknown } | null)?.context;
  const name = (cause as { name?: string } | null)?.name ?? (error as { name?: string } | null)?.name;
  const message = error instanceof Error ? error.message : String(error);
  if (timedOut || name === 'AbortError') {
    return new EllieError('ai_timeout', { message });
  }
  return new EllieError('offline', { message });
}

type InvokeOptions = { timeoutMs?: number };

// supabase.functions.invoke with the signed-in user's JWT. A non-2xx answer
// comes back as an error carrying the Response; a failure to reach the server
// is "offline" (or ai_timeout when the app's wait ran out).
export function invokeFunction(name: string, options: InvokeOptions = {}): EllieInvoke {
  return async body => {
    const client = getSupabaseClient();
    if (!client) {
      throw new EllieError('unknown', { message: 'Supabase no está configurado.' });
    }
    const startedAt = Date.now();
    const { data, error } = await client.functions.invoke(name, {
      body,
      ...(options.timeoutMs ? { timeout: options.timeoutMs } : {}),
    });
    if (!error) {
      return { status: 200, body: data };
    }
    const response = (error as { context?: unknown }).context;
    if (response && typeof (response as Response).json === 'function') {
      const status = (response as Response).status;
      const parsed = await (response as Response).json().catch(() => null);
      return { status, body: parsed };
    }
    const timedOut = Boolean(options.timeoutMs) && Date.now() - startedAt >= (options.timeoutMs as number) - 50;
    throw transportError(error, timedOut);
  };
}

// Text: the platform's own wait. With a photo the AI is slower: the longer
// wait above.
export const invokeEllieChat: EllieInvoke = invokeFunction('ellie-chat');
export const invokeEllieChatWithImage: EllieInvoke = invokeFunction('ellie-chat', {
  timeoutMs: AI_REQUEST_TIMEOUT_MS,
});

// ── Sending ─────────────────────────────────────────────────────────────────
// 409 duplicate_in_progress: the same message is still being answered. Wait and
// ask again with the same id, silently, at most 3 attempts in total.
export const DUPLICATE_WAITS_MS = [1500, 3000] as const;

// The phone's "now" for get_athlete_context: ISO with its offset
// ("2026-10-26T13:40:05-03:00") and the IANA zone.
export function clientNow(date: Date = new Date()): { iso: string; tz: string | null } {
  const pad = (value: number) => String(Math.floor(Math.abs(value))).padStart(2, '0');
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const iso =
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${sign}${pad(offset / 60)}:${pad(offset % 60)}`;
  return { iso, tz: deviceTimezone() };
}

function requestBody(input: EllieSendInput, stream: boolean) {
  return {
    conversation_id: input.conversationId,
    client_message_id: input.clientMessageId,
    message: input.message,
    image_path: input.imagePath ?? null,
    mode: input.mode ?? 'chat',
    stream,
    cards_v2: true,
    client_now: clientNow(),
    // Phase B (offline queue): always empty for now.
    pending: [],
    client_context: input.clientContext ?? null,
    ...(input.adjustProposalId ? { adjust_proposal_id: input.adjustProposalId } : {}),
    ...(input.discomfortAnswer ? { discomfort_answer: input.discomfortAnswer } : {}),
    ...(input.trainingPlanRequest ? { training_plan_request: input.trainingPlanRequest } : {}),
  };
}

export async function sendEllieMessage(
  input: EllieSendInput,
  deps: { invoke?: EllieInvoke; sleep?: (ms: number) => Promise<void> } = {},
): Promise<EllieReply> {
  const invoke = deps.invoke ?? (input.imagePath ? invokeEllieChatWithImage : invokeEllieChat);
  const sleep = deps.sleep ?? (ms => new Promise<void>(resolve => setTimeout(resolve, ms)));
  const body = requestBody(input, false);

  for (let attempt = 0; ; attempt += 1) {
    let result: InvokeResult;
    try {
      result = await invoke(body);
    } catch (error) {
      throw error instanceof EllieError ? error : new EllieError('offline', { message: String(error) });
    }
    if (result.status >= 200 && result.status < 300) {
      return parseEllieReply(result.body);
    }
    const error = parseEllieError(result.status, result.body);
    if (error.code === 'duplicate_in_progress' && attempt < DUPLICATE_WAITS_MS.length) {
      await sleep(DUPLICATE_WAITS_MS[attempt]);
      continue;
    }
    throw error;
  }
}

// Used for the quota notice and, where the design has it, the remaining count.
export async function fetchEllieUsage(): Promise<EllieUsage | null> {
  const client = getSupabaseClient();
  if (!client) {
    return null;
  }
  const { data, error } = await (client as unknown as {
    rpc: (name: string) => Promise<{ data: unknown; error: unknown }>;
  }).rpc('get_ellie_usage');
  const record = asRecord(data);
  if (error || !record || record.ok !== true) {
    return null;
  }
  return parseEllieUsage({ ...record, remaining: undefined });
}

// ── Streaming (SSE, stream=true) ────────────────────────────────────────────
// `delta {text}` · `card {type, proposal_id, version, adjust_label, payload}` ·
// `done {message_id, conversation_id, model, context_version, usage}` · `error {code, message}`.
export type EllieStreamHandlers = {
  onDelta: (text: string) => void;
  onCard: (card: ProposalCard) => void;
};

// What the caller cannot fix by asking again without stream.
const FINAL_CODES: readonly EllieErrorCode[] = [
  'invalid_input',
  'unauthorized',
  'image_forbidden',
  'ai_forbidden',
  'conversation_not_found',
  'image_not_found',
  'image_too_large',
  'image_type',
  'daily_limit',
  'daily_image_limit',
  'rate_limited',
  'ai_credits_exhausted',
];

// The stream failed: `fallback` says whether asking without stream can work.
export class EllieStreamError extends Error {
  readonly fallback: boolean;
  readonly failure: EllieError;
  constructor(failure: EllieError) {
    super(failure.message);
    this.name = 'EllieStreamError';
    this.failure = failure;
    this.fallback = !FINAL_CODES.includes(failure.code);
  }
}

const STREAM_CODES: Record<string, EllieErrorCode> = {
  quota: 'daily_limit',
  daily_limit: 'daily_limit',
  ai_timeout: 'ai_timeout',
  unauthorized: 'unauthorized',
  rate_limited: 'rate_limited',
};

function parseEvent(block: string): { event: string; data: unknown } | null {
  let event = 'message';
  const data: string[] = [];
  block.split(/\r?\n/).forEach(line => {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      data.push(line.slice(5).replace(/^ /, ''));
    }
  });
  if (data.length === 0) {
    return null;
  }
  const raw = data.join('\n');
  try {
    return { event, data: JSON.parse(raw) };
  } catch {
    return { event, data: raw };
  }
}

// One turn with stream=true. Text and cards reach the handlers as they
// arrive; the result is the whole reply. A JSON answer (the server chose not
// to stream) is returned as is, with `streamed: false`.
export async function streamEllieMessage(
  input: EllieSendInput,
  handlers: EllieStreamHandlers,
): Promise<EllieReply & { streamed: boolean }> {
  const client = getSupabaseClient();
  if (!client) {
    throw new EllieStreamError(new EllieError('unknown', { message: 'Supabase no está configurado.' }));
  }
  const { data: auth } = await client.auth.getSession();
  const token = auth.session?.access_token;
  if (!token) {
    throw new EllieStreamError(new EllieError('unauthorized'));
  }

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let timedOut = false;
  // No byte for this long: a slow answer (ai_timeout), never "offline".
  const arm = () => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, AI_REQUEST_TIMEOUT_MS);
  };

  let text = '';
  const cards: ProposalCard[] = [];
  let done: Record<string, unknown> | null = null;
  try {
    arm();
    let response: Awaited<ReturnType<typeof streamingFetch>>;
    try {
      response = await streamingFetch(`${env.supabase.url}/functions/v1/ellie-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          Authorization: `Bearer ${token}`,
          apikey: env.supabase.anonKey,
        },
        body: JSON.stringify(requestBody(input, true)),
        signal: controller.signal,
      });
    } catch (error) {
      throw transportError(error, timedOut);
    }

    const type = response.headers.get('content-type') ?? '';
    if (!response.ok || !type.includes('text/event-stream')) {
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw parseEllieError(response.status, body);
      }
      return { ...parseEllieReply(body), streamed: false };
    }
    const reader = response.body?.getReader();
    if (!reader) {
      throw new EllieError('unknown', { message: 'Stream without body' });
    }

    // TextDecoder is installed by Expo's runtime (not in this project's TS libs).
    const decoder = new (globalThis as unknown as {
      TextDecoder: new () => { decode: (input?: Uint8Array, options?: { stream?: boolean }) => string };
    }).TextDecoder();
    let buffer = '';
    const handle = (block: string) => {
      const parsed = parseEvent(block);
      const data = asRecord(parsed?.data);
      if (!parsed) {
        return;
      }
      if (parsed.event === 'delta' && typeof data?.text === 'string') {
        text += data.text;
        handlers.onDelta(data.text);
      } else if (parsed.event === 'card') {
        const card = parseProposalCard(data);
        if (card) {
          cards.push(card);
          handlers.onCard(card);
        }
      } else if (parsed.event === 'done') {
        done = data ?? {};
      } else if (parsed.event === 'error') {
        const raw = typeof data?.code === 'string' ? data.code : '';
        throw new EllieError(STREAM_CODES[raw] ?? 'internal', {
          message: typeof data?.message === 'string' ? data.message : raw,
        });
      }
    };
    for (;;) {
      let chunk: Awaited<ReturnType<typeof reader.read>>;
      try {
        chunk = await reader.read();
      } catch (error) {
        throw transportError(error, timedOut);
      }
      if (chunk.done) {
        break;
      }
      arm();
      buffer += decoder.decode(chunk.value, { stream: true });
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() ?? '';
      blocks.forEach(handle);
    }
    if (buffer.trim()) {
      handle(buffer);
    }
  } catch (error) {
    throw new EllieStreamError(
      error instanceof EllieError ? error : new EllieError('unknown', { message: String(error) }),
    );
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }

  const finished = done as Record<string, unknown> | null;
  if (!finished) {
    // Cut before `done`: nothing guarantees the message was stored.
    throw new EllieStreamError(new EllieError('internal', { message: 'Stream ended without done' }));
  }
  const conversationId =
    (typeof finished.conversation_id === 'string' ? finished.conversation_id : null) ??
    input.conversationId;
  if (!conversationId) {
    throw new EllieStreamError(new EllieError('unknown', { message: 'Stream without conversation' }));
  }
  return {
    conversationId,
    replayed: false,
    message: {
      id: typeof finished.message_id === 'string' ? finished.message_id : '',
      content: text,
      createdAt: new Date().toISOString(),
      tool: null,
    },
    cards,
    usage: parseEllieUsage(finished.usage),
    streamed: true,
  };
}
