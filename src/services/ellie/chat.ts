import {env} from '@app/lib/config/env';

export type EllieClientMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type EllieGenerationResult =
  | {type: 'generate_workout_plan'; data: any}
  | {type: 'generate_nutrition_plan'; data: any}
  | {type: 'text'; data: {content: string}};

function getChatUrl() {
  return `${env.supabase.url}/functions/v1/ellie-chat`;
}

function getAuthHeader() {
  return `Bearer ${env.supabase.anonKey}`;
}

export async function callEllieChat(params: {
  messages: EllieClientMessage[];
  userContext: string;
  mode?: 'generate_workout' | 'generate_nutrition';
  onDelta: (text: string) => void;
  onDone: () => void;
  onToolResult: (result: EllieGenerationResult) => void;
  onError: (error: string) => void;
}) {
  try {
    const response = await fetch(getChatUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getAuthHeader(),
      },
      body: JSON.stringify({
        messages: params.messages,
        userContext: params.userContext,
        ...(params.mode ? {mode: params.mode} : {}),
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      params.onError(
        typeof data.error === 'string'
          ? data.error
          : `No pudimos conectar con ELLIE (${response.status}).`,
      );
      return;
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const result = (await response.json()) as EllieGenerationResult;
      if (
        result.type === 'generate_workout_plan' ||
        result.type === 'generate_nutrition_plan'
      ) {
        params.onToolResult(result);
      } else if (result.type === 'text') {
        params.onDelta(result.data?.content || '');
        params.onDone();
      } else {
        params.onDelta(JSON.stringify(result));
        params.onDone();
      }
      return;
    }

    const raw = await response.text();
    let buffer = '';

    raw.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) {
        return;
      }

      const payload = trimmed.slice(6).trim();
      if (!payload || payload === '[DONE]') {
        return;
      }

      try {
        const parsed = JSON.parse(payload);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (typeof delta === 'string') {
          buffer += delta;
          params.onDelta(delta);
        }
      } catch {
        // Ignore malformed chunks while keeping the partial stream.
      }
    });

    if (!buffer.trim()) {
      params.onError('ELLIE no devolvió una respuesta legible.');
      return;
    }

    params.onDone();
  } catch (error) {
    params.onError(
      error instanceof Error ? error.message : 'No pudimos conectar con ELLIE.',
    );
  }
}

export async function generateWithEllie(params: {
  messages: EllieClientMessage[];
  userContext: string;
  mode: 'generate_workout' | 'generate_nutrition';
}): Promise<EllieGenerationResult> {
  const response = await fetch(getChatUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuthHeader(),
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      typeof data.error === 'string'
        ? data.error
        : `No pudimos conectar con ELLIE (${response.status}).`,
    );
  }

  return (await response.json()) as EllieGenerationResult;
}
