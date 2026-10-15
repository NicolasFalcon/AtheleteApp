import {
  isNetworkError,
  nextBackoffMs,
  runOutbox,
  type Queued,
} from '../src/features/session/sessionOutbox';

type Item = Queued & { id: string };
const NOW = () => new Date('2026-10-14T10:00:00Z');
const item = (id: string, extra: Partial<Item> = {}): Item => ({ id, ...extra });

const networkError = () => new TypeError('Network request failed');
const checkError = () => ({ code: '23514', message: 'violates check constraint "position_check"' });

describe('isNetworkError', () => {
  it('network, timeouts and 5xx are retryable', () => {
    expect(isNetworkError(networkError())).toBe(true);
    expect(isNetworkError({ message: 'Failed to fetch' })).toBe(true);
    expect(isNetworkError({ status: 503, message: 'x' })).toBe(true);
    expect(isNetworkError({ code: 'PGRST301', message: 'JWT expired' })).toBe(true);
  });
  it('database and validation errors are not', () => {
    expect(isNetworkError(checkError())).toBe(false);
    expect(isNetworkError({ code: '23503', message: 'foreign key violation' })).toBe(false);
    expect(isNetworkError(new Error('Supabase no está configurado.'))).toBe(false);
  });
});

describe('runOutbox', () => {
  it('runs every item once, in order, and empties the queue', async () => {
    const seen: string[] = [];
    const out = await runOutbox([item('a'), item('b'), item('c')], async i => {
      seen.push(i.id);
      return undefined;
    }, NOW);
    expect(seen).toEqual(['a', 'b', 'c']);
    expect(out.remaining).toEqual([]);
    expect(out.done).toBe(3);
  });

  it('a network failure stops the run and keeps the rest in order', async () => {
    const seen: string[] = [];
    const out = await runOutbox([item('a'), item('b'), item('c')], async i => {
      seen.push(i.id);
      if (i.id === 'b') {
        throw networkError();
      }
      return undefined;
    }, NOW);
    expect(seen).toEqual(['a', 'b']);
    expect(out.remaining.map(i => i.id)).toEqual(['b', 'c']);
    expect(out.remaining.every(i => !i.failure)).toBe(true);
    expect(out.stoppedByNetwork).toBe(true);
  });

  it('a non-network error is parked with its message and the rest still runs', async () => {
    const seen: string[] = [];
    const out = await runOutbox([item('a'), item('b'), item('c')], async i => {
      seen.push(i.id);
      if (i.id === 'a') {
        throw checkError();
      }
      return undefined;
    }, NOW);
    expect(seen).toEqual(['a', 'b', 'c']);
    expect(out.remaining).toHaveLength(1);
    expect(out.remaining[0].failure).toEqual({
      message: expect.stringContaining('position_check'),
      at: '2026-10-14T10:00:00.000Z',
    });
    expect(out.newlyFailed).toBe(1);
    expect(out.stoppedByNetwork).toBe(false);
  });

  it('parked items are not retried again by automatic runs (no loop)', async () => {
    const execute = jest.fn(async () => {
      throw checkError();
    });
    const first = await runOutbox([item('a')], execute, NOW);
    expect(execute).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 5; i += 1) {
      await runOutbox(first.remaining, execute, NOW);
    }
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('a manual retry does run the parked items', async () => {
    const parked = item('a', { failure: { message: 'x', at: 'y' } });
    const execute = jest.fn(async () => undefined);
    const out = await runOutbox([parked], execute, NOW, { retryFailed: true });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(out.remaining).toEqual([]);
  });

  it('collects the results (completions) of the items that went through', async () => {
    const out = await runOutbox([item('a'), item('b')], async i => (i.id === 'b' ? 42 : undefined), NOW);
    expect(out.results).toEqual([42]);
  });

  it('replaying what is left after an interrupted run does not repeat finished items', async () => {
    let fail = true;
    const calls: string[] = [];
    const execute = async (i: Item) => {
      calls.push(i.id);
      if (i.id === 'b' && fail) {
        throw networkError();
      }
      return undefined;
    };
    const first = await runOutbox([item('a'), item('b')], execute, NOW);
    fail = false;
    await runOutbox(first.remaining, execute, NOW);
    expect(calls).toEqual(['a', 'b', 'b']);
  });
});

describe('nextBackoffMs', () => {
  it('grows with every failure and is capped at 5 minutes', () => {
    expect([1, 2, 3, 4, 5, 6, 20].map(nextBackoffMs)).toEqual([
      15_000, 30_000, 60_000, 120_000, 300_000, 300_000, 300_000,
    ]);
  });
});
