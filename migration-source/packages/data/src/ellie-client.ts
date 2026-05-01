export interface EllieClientMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type EllieGenerationResult =
  | { type: 'generate_workout_plan'; data: any }
  | { type: 'generate_nutrition_plan'; data: any }
  | { type: 'text'; data: { content: string } };

export interface EllieClientConfig {
  chatUrl: string;
  publishableKey: string;
  fetchImpl?: typeof fetch;
}

export function createEllieClient(config: EllieClientConfig) {
  const fetchImpl = config.fetchImpl ?? fetch;

  async function callEllieChat(params: {
    messages: EllieClientMessage[];
    userContext: string;
    mode?: 'generate_workout' | 'generate_nutrition';
    onDelta: (text: string) => void;
    onDone: () => void;
    onToolResult: (result: EllieGenerationResult) => void;
    onError: (error: string) => void;
  }) {
    try {
      const resp = await fetchImpl(config.chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.publishableKey}`,
        },
        body: JSON.stringify({
          messages: params.messages,
          userContext: params.userContext,
          ...(params.mode ? { mode: params.mode } : {}),
        }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        params.onError(data.error || `Request failed (${resp.status})`);
        return;
      }

      const contentType = resp.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const result = await resp.json();
        if (result.type === 'generate_workout_plan' || result.type === 'generate_nutrition_plan') {
          params.onToolResult(result as EllieGenerationResult);
        } else if (result.type === 'text') {
          params.onDelta(result.data?.content || '');
          params.onDone();
        } else {
          params.onDelta(JSON.stringify(result));
          params.onDone();
        }
        return;
      }

      if (!resp.body) {
        params.onError('No response stream');
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) params.onDelta(content);
          } catch {
            textBuffer = `${line}\n${textBuffer}`;
            break;
          }
        }
      }

      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) params.onDelta(content);
          } catch {
            // ignore
          }
        }
      }

      params.onDone();
    } catch (error) {
      params.onError(error instanceof Error ? error.message : 'Connection failed');
    }
  }

  async function generateWithEllie(params: {
    messages: EllieClientMessage[];
    userContext: string;
    mode: 'generate_workout' | 'generate_nutrition';
  }): Promise<EllieGenerationResult> {
    const resp = await fetchImpl(config.chatUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.publishableKey}`,
      },
      body: JSON.stringify(params),
    });

    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      throw new Error(data.error || `Request failed (${resp.status})`);
    }

    return resp.json();
  }

  async function streamEllieChat(params: {
    messages: EllieClientMessage[];
    userContext: string;
    onDelta: (text: string) => void;
    onDone: () => void;
    onError: (error: string) => void;
  }) {
    return callEllieChat({
      ...params,
      onToolResult: (result) => {
        if (result.type === 'text') {
          params.onDelta((result.data as any).content || '');
        }
        params.onDone();
      },
    });
  }

  return { callEllieChat, generateWithEllie, streamEllieChat };
}
