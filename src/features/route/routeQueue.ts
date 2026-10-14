import type { RouteSaveError, SavePayload, SaveResult } from '@app/features/route/routeMappers';

// Retry queue of the activities that could not be saved (no network). Pure:
// the service keeps the JSON in AsyncStorage and injects the sender. Every
// attempt uses the SAME client_id, so the server answers with the same
// activity if an earlier attempt did get through (idempotent save).

export type QueuedSave = {
  clientId: string;
  payload: SavePayload;
  attempts: number;
  enqueuedAt: number;
  nextAttemptAt: number;
};

export const QUEUE_KEY = 'athelete.route.saveQueue.v1';
export const QUEUE_MAX = 20;
const BACKOFF_BASE_MS = 30_000;
const BACKOFF_MAX_MS = 60 * 60_000;

// 30 s, 1 min, 2 min… up to 1 h.
export function backoffMs(attempts: number): number {
  return Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** Math.max(0, attempts - 1));
}

// Adding the same client_id again replaces the earlier entry (no duplicates).
// If the queue is full the oldest goes: it is the one that least likely gets
// to be opened again.
export function enqueue(queue: readonly QueuedSave[], payload: SavePayload, now: number): QueuedSave[] {
  const rest = queue.filter(item => item.clientId !== payload.client_id);
  const next: QueuedSave = {
    clientId: payload.client_id,
    payload,
    attempts: 0,
    enqueuedAt: now,
    nextAttemptAt: now,
  };
  return [...rest, next].slice(-QUEUE_MAX);
}

export function dueItems(queue: readonly QueuedSave[], now: number): QueuedSave[] {
  return queue.filter(item => item.nextAttemptAt <= now);
}

export function remove(queue: readonly QueuedSave[], clientId: string): QueuedSave[] {
  return queue.filter(item => item.clientId !== clientId);
}

export function markRetry(queue: readonly QueuedSave[], clientId: string, now: number): QueuedSave[] {
  return queue.map(item =>
    item.clientId === clientId
      ? { ...item, attempts: item.attempts + 1, nextAttemptAt: now + backoffMs(item.attempts + 1) }
      : item,
  );
}

export function hasPending(queue: readonly QueuedSave[], clientId: string): boolean {
  return queue.some(item => item.clientId === clientId);
}

export function serializeQueue(queue: readonly QueuedSave[]): string {
  return JSON.stringify(queue);
}

// A corrupt entry is dropped; the rest survives.
export function parseQueue(raw: string | null): QueuedSave[] {
  if (!raw) {
    return [];
  }
  let list: unknown;
  try {
    list = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(list)) {
    return [];
  }
  return list.flatMap((item): QueuedSave[] => {
    const row = item as Partial<QueuedSave> | null;
    const payload = row?.payload;
    if (
      !row ||
      typeof row.clientId !== 'string' ||
      !payload ||
      payload.client_id !== row.clientId ||
      !Array.isArray(payload.track)
    ) {
      return [];
    }
    return [
      {
        clientId: row.clientId,
        payload,
        attempts: typeof row.attempts === 'number' ? row.attempts : 0,
        enqueuedAt: typeof row.enqueuedAt === 'number' ? row.enqueuedAt : 0,
        nextAttemptAt: typeof row.nextAttemptAt === 'number' ? row.nextAttemptAt : 0,
      },
    ];
  });
}

// What one attempt to send came back with.
export type SendOutcome =
  | { kind: 'saved'; result: Extract<SaveResult, { ok: true }> }
  // The server answered no: retrying would fail the same way.
  | { kind: 'rejected'; error: RouteSaveError }
  // No network or a server hiccup: keep it and try later.
  | { kind: 'retry' };

export type FlushReport = {
  queue: QueuedSave[];
  saved: { clientId: string; result: Extract<SaveResult, { ok: true }> }[];
  rejected: { clientId: string; error: RouteSaveError }[];
};

// Sends what is due, oldest first. After the first network failure the rest
// waits for the next round (the network is down for all of them).
export async function flush(
  initial: readonly QueuedSave[],
  send: (payload: SavePayload) => Promise<SendOutcome>,
  now: number,
): Promise<FlushReport> {
  let queue = [...initial];
  const saved: FlushReport['saved'] = [];
  const rejected: FlushReport['rejected'] = [];
  for (const item of dueItems(initial, now)) {
    const outcome = await send(item.payload);
    if (outcome.kind === 'saved') {
      queue = remove(queue, item.clientId);
      saved.push({ clientId: item.clientId, result: outcome.result });
    } else if (outcome.kind === 'rejected') {
      queue = remove(queue, item.clientId);
      rejected.push({ clientId: item.clientId, error: outcome.error });
    } else {
      queue = markRetry(queue, item.clientId, now);
      break;
    }
  }
  return { queue, saved, rejected };
}
