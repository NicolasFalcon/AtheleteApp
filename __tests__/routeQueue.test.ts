import type { SavePayload } from '../src/features/route/routeMappers';
import {
  QUEUE_MAX,
  backoffMs,
  dueItems,
  enqueue,
  flush,
  hasPending,
  markRetry,
  parseQueue,
  serializeQueue,
  type SendOutcome,
} from '../src/features/route/routeQueue';

const payload = (clientId: string): SavePayload => ({
  client_id: clientId,
  sport: 'running',
  title: 'Carrera',
  started_at: '2026-10-13T10:00:00.000Z',
  ended_at: '2026-10-13T10:30:00.000Z',
  moving_sec: 1800,
  pauses: [],
  track: [
    [-34.58, -58.42, 20, 1, 4],
    [-34.59, -58.42, 21, 2, 4],
  ],
  planned_route_id: null,
  visibility: 'friends',
  hide_endpoints: true,
  local_date: '2026-10-13',
});

const ok = (activityId: string): SendOutcome => ({
  kind: 'saved',
  result: { ok: true, activityId, countedAsWorkout: true, pointsAwarded: 50 },
});

describe('route save queue · client_id', () => {
  it('keeps one entry per client_id (the same outing never queues twice)', () => {
    let queue = enqueue([], payload('a'), 1000);
    queue = enqueue(queue, payload('b'), 2000);
    queue = enqueue(queue, payload('a'), 3000);
    expect(queue.map(item => item.clientId)).toEqual(['b', 'a']);
    expect(queue.find(item => item.clientId === 'a')?.enqueuedAt).toBe(3000);
    expect(hasPending(queue, 'a')).toBe(true);
    expect(hasPending(queue, 'z')).toBe(false);
  });

  it('drops the oldest entry when full', () => {
    let queue = enqueue([], payload('first'), 0);
    for (let i = 0; i < QUEUE_MAX; i += 1) {
      queue = enqueue(queue, payload(`c${i}`), i + 1);
    }
    expect(queue).toHaveLength(QUEUE_MAX);
    expect(hasPending(queue, 'first')).toBe(false);
    expect(hasPending(queue, `c${QUEUE_MAX - 1}`)).toBe(true);
  });

  it('backs off 30 s, 1 min, 2 min… up to an hour', () => {
    expect(backoffMs(1)).toBe(30_000);
    expect(backoffMs(2)).toBe(60_000);
    expect(backoffMs(3)).toBe(120_000);
    expect(backoffMs(20)).toBe(3_600_000);
  });

  it('waits for the backoff before it is due again', () => {
    const queue = markRetry(enqueue([], payload('a'), 0), 'a', 1000);
    expect(queue[0].attempts).toBe(1);
    expect(dueItems(queue, 1000 + 29_999)).toHaveLength(0);
    expect(dueItems(queue, 1000 + 30_000)).toHaveLength(1);
  });

  it('survives a round trip and drops corrupt entries', () => {
    const queue = enqueue(enqueue([], payload('a'), 1), payload('b'), 2);
    expect(parseQueue(serializeQueue(queue)).map(item => item.clientId)).toEqual(['a', 'b']);
    expect(parseQueue(null)).toEqual([]);
    expect(parseQueue('not json')).toEqual([]);
    expect(parseQueue('{"a":1}')).toEqual([]);
    const mixed = JSON.stringify([queue[0], { clientId: 'x', payload: { client_id: 'other', track: [] } }, 7]);
    expect(parseQueue(mixed).map(item => item.clientId)).toEqual(['a']);
  });
});

describe('route save queue · flush', () => {
  it('sends every entry with its own client_id and empties the queue', async () => {
    const sent: string[] = [];
    const queue = enqueue(enqueue([], payload('a'), 0), payload('b'), 0);
    const report = await flush(
      queue,
      async p => {
        sent.push(p.client_id);
        return ok(`act-${p.client_id}`);
      },
      10,
    );
    expect(sent).toEqual(['a', 'b']);
    expect(report.queue).toEqual([]);
    expect(report.saved.map(item => item.clientId)).toEqual(['a', 'b']);
  });

  it('retries a failed send with the SAME client_id on the next round', async () => {
    const seen: string[] = [];
    let queue = enqueue([], payload('a'), 0);
    let report = await flush(queue, async p => { seen.push(p.client_id); return { kind: 'retry' }; }, 0);
    expect(report.queue).toHaveLength(1);
    expect(report.queue[0].attempts).toBe(1);
    // Not due yet.
    report = await flush(report.queue, async p => { seen.push(p.client_id); return ok('x'); }, 1000);
    expect(seen).toEqual(['a']);
    queue = report.queue;
    report = await flush(queue, async p => { seen.push(p.client_id); return ok('act-a'); }, 31_000);
    expect(seen).toEqual(['a', 'a']);
    expect(report.queue).toEqual([]);
  });

  it('stops at the first network failure (the rest waits for the next round)', async () => {
    const queue = enqueue(enqueue(enqueue([], payload('a'), 0), payload('b'), 0), payload('c'), 0);
    const seen: string[] = [];
    const report = await flush(
      queue,
      async p => {
        seen.push(p.client_id);
        return p.client_id === 'b' ? { kind: 'retry' } : ok(`act-${p.client_id}`);
      },
      0,
    );
    expect(seen).toEqual(['a', 'b']);
    expect(report.saved.map(item => item.clientId)).toEqual(['a']);
    expect(report.queue.map(item => item.clientId)).toEqual(['b', 'c']);
    expect(report.queue[0].attempts).toBe(1);
    expect(report.queue[1].attempts).toBe(0);
  });

  it('drops an entry the server rejected (it would fail the same way)', async () => {
    const queue = enqueue(enqueue([], payload('bad'), 0), payload('good'), 0);
    const report = await flush(
      queue,
      async p => (p.client_id === 'bad' ? { kind: 'rejected', error: 'impossible_speed' } : ok('act')),
      0,
    );
    expect(report.rejected).toEqual([{ clientId: 'bad', error: 'impossible_speed' }]);
    expect(report.queue).toEqual([]);
  });
});
