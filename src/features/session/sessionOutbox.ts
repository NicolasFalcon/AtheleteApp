// Pure rules of the session outbox (no storage, no network): which errors are
// worth retrying, how a queue is replayed and how long to wait after a failure.

export type OutboxFailure = { message: string; at: string };

// An item that failed for a reason other than the network stays in the queue
// with `failure`; automatic syncs skip it (no retry loop).
export type Queued = { failure?: OutboxFailure };

// Failures that can go away on their own: no connection, timeouts, gateway /
// rate-limit statuses and an expired token (the client refreshes it).
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return true;
  }
  if (!error || typeof error !== 'object') {
    return /network|fetch|timed? ?out|offline|internet|connection/i.test(String(error));
  }
  const e = error as { message?: string; code?: string | number; status?: number };
  if (typeof e.status === 'number' && (e.status === 0 || e.status === 408 || e.status === 429 || e.status >= 500)) {
    return true;
  }
  if (e.code === 'PGRST301' || /jwt expired/i.test(e.message ?? '')) {
    return true;
  }
  return /network|failed to fetch|timed? ?out|offline|internet connection|connection (lost|refused|reset)|ECONN|ENOTFOUND/i.test(
    e.message ?? '',
  );
}

export type RunOptions = {
  // Also retry the items already marked with a failure (manual retry).
  retryFailed?: boolean;
};

export type RunResult<T extends Queued, R> = {
  remaining: T[];
  results: R[];
  // Items that went through (any kind).
  done: number;
  // The run stopped at a network failure: worth trying again later.
  stoppedByNetwork: boolean;
  // Items newly marked as failed in this run.
  newlyFailed: number;
};

// Replays the queue in order. A network failure stops the run (the rest keeps
// waiting, order intact). Any other failure marks that item and moves on: it
// is not retried by automatic runs again.
export async function runOutbox<T extends Queued, R>(
  items: readonly T[],
  execute: (item: T) => Promise<R | undefined>,
  now: () => Date,
  options: RunOptions = {},
): Promise<RunResult<T, R>> {
  const remaining: T[] = [];
  const results: R[] = [];
  let done = 0;
  let newlyFailed = 0;
  let stoppedByNetwork = false;
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (stoppedByNetwork || (item.failure && !options.retryFailed)) {
      remaining.push(item);
      continue;
    }
    try {
      const result = await execute(item);
      if (result !== undefined) {
        results.push(result);
      }
      done += 1;
    } catch (error) {
      if (isNetworkError(error)) {
        stoppedByNetwork = true;
        remaining.push({ ...item, failure: undefined });
        continue;
      }
      newlyFailed += 1;
      remaining.push({
        ...item,
        failure: {
          message: error instanceof Error ? error.message : String((error as { message?: string })?.message ?? error),
          at: now().toISOString(),
        },
      });
    }
  }
  return { remaining, results, done, stoppedByNetwork, newlyFailed };
}

const BACKOFF_MS = [15_000, 30_000, 60_000, 120_000, 300_000];

// Wait before the next automatic attempt after `failures` consecutive network
// failures (1-based); capped at 5 minutes.
export function nextBackoffMs(failures: number): number {
  return BACKOFF_MS[Math.min(Math.max(failures, 1), BACKOFF_MS.length) - 1];
}
