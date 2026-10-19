import {
  MAX_KEYS_PER_CALL,
  isMediaKey,
  type SignKeys,
  type SignedMedia,
} from '@app/services/media/mediaService';

// Signed URLs of catalog media, by key. A key is signed again a few minutes
// before it expires (respecting expires_at); the keys asked for in the same
// moment (one page of a list) go in a single call of at most 100 keys. The
// URLs are kept on the phone so a second launch shows the first page without
// signing again. The image itself is cached on disk under its key (not under
// the signed URL), so a renewed URL never downloads it again.

export type KeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

type Options = {
  sign: SignKeys;
  storage?: KeyValueStorage | null;
  now?: () => number;
  // Renewed this long before expires_at.
  renewMarginMs?: number;
  // Requests within this window are signed together.
  batchDelayMs?: number;
  // A key the server says is missing is not asked for again in this time.
  missingRetryMs?: number;
};

export const MEDIA_STORAGE_KEY = '@athelete/media-urls/v1';
const PERSIST_DELAY_MS = 800;
const MAX_STORED = 600;

export function createMediaUrlStore({
  sign,
  storage = null,
  now = Date.now,
  renewMarginMs = 5 * 60 * 1000,
  batchDelayMs = 16,
  missingRetryMs = 10 * 60 * 1000,
}: Options) {
  const entries = new Map<string, SignedMedia>();
  const missing = new Map<string, number>();
  const inflight = new Map<string, Promise<void>>();
  const listeners = new Set<() => void>();
  let pending = new Set<string>();
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  let flushPromise: Promise<void> | null = null;
  let resolveFlush: (() => void) | null = null;
  let persistTimer: ReturnType<typeof setTimeout> | null = null;
  let hydrated: Promise<void> | null = null;
  // Number of sign calls, for the measurements and the tests.
  let calls = 0;

  const notify = () => listeners.forEach(listener => listener());

  const isFresh = (key: string) => {
    const entry = entries.get(key);
    return Boolean(entry && entry.expiresAt - renewMarginMs > now());
  };

  const isMissing = (key: string) => {
    const until = missing.get(key);
    return until !== undefined && until > now();
  };

  const persist = () => {
    if (!storage || persistTimer) {
      return;
    }
    persistTimer = setTimeout(() => {
      persistTimer = null;
      const current = now();
      const rows = [...entries.entries()]
        .filter(([, entry]) => entry.expiresAt > current)
        .sort((a, b) => b[1].expiresAt - a[1].expiresAt)
        .slice(0, MAX_STORED);
      storage.setItem(MEDIA_STORAGE_KEY, JSON.stringify(Object.fromEntries(rows))).catch(() => undefined);
    }, PERSIST_DELAY_MS);
  };

  const signChunk = async (keys: string[]) => {
    calls += 1;
    try {
      const result = await sign(keys);
      Object.entries(result.urls).forEach(([key, value]) => entries.set(key, value));
      result.missing.forEach(key => missing.set(key, now() + missingRetryMs));
      notify();
      persist();
    } catch {
      // Offline or the function failed: the next request tries again.
    }
  };

  const flush = async () => {
    flushTimer = null;
    const keys = [...pending];
    pending = new Set();
    const done = resolveFlush;
    flushPromise = null;
    resolveFlush = null;
    const chunks: string[][] = [];
    for (let index = 0; index < keys.length; index += MAX_KEYS_PER_CALL) {
      chunks.push(keys.slice(index, index + MAX_KEYS_PER_CALL));
    }
    const work = Promise.all(chunks.map(signChunk)).then(() => undefined);
    keys.forEach(key => inflight.set(key, work));
    await work;
    keys.forEach(key => {
      if (inflight.get(key) === work) {
        inflight.delete(key);
      }
    });
    done?.();
  };

  const store = {
    // Reads the URLs saved on the phone (once); expired ones are dropped.
    hydrate(): Promise<void> {
      if (!storage) {
        return Promise.resolve();
      }
      hydrated ??= storage
        .getItem(MEDIA_STORAGE_KEY)
        .then(raw => {
          if (!raw) {
            return;
          }
          const saved = JSON.parse(raw) as Record<string, SignedMedia>;
          const current = now();
          Object.entries(saved).forEach(([key, value]) => {
            if (
              value &&
              typeof value.url === 'string' &&
              typeof value.expiresAt === 'number' &&
              value.expiresAt > current &&
              !entries.has(key)
            ) {
              entries.set(key, value);
            }
          });
          notify();
        })
        .catch(() => undefined);
      return hydrated;
    },

    // The URL to show (even if close to expiring: the image is cached on disk
    // under its key), or null.
    url(key: string): string | null {
      return entries.get(key)?.url ?? null;
    },

    // When the key must be signed again (ms epoch), or null if unknown.
    renewAt(key: string): number | null {
      const entry = entries.get(key);
      return entry ? entry.expiresAt - renewMarginMs : null;
    },

    // Signs the keys that are not fresh. Keys asked for together (the same
    // page) share one call; already signing keys are not asked twice.
    async request(keys: readonly (string | null | undefined)[]): Promise<void> {
      await store.hydrate();
      const waits: Promise<void>[] = [];
      keys.forEach(key => {
        if (!isMediaKey(key) || isFresh(key) || isMissing(key)) {
          return;
        }
        const running = inflight.get(key);
        if (running) {
          waits.push(running);
          return;
        }
        pending.add(key);
      });
      if (pending.size > 0) {
        if (!flushPromise) {
          flushPromise = new Promise<void>(resolve => {
            resolveFlush = resolve;
          });
        }
        waits.push(flushPromise);
        if (pending.size >= MAX_KEYS_PER_CALL) {
          if (flushTimer) {
            clearTimeout(flushTimer);
          }
          flush().catch(() => undefined);
        } else if (!flushTimer) {
          flushTimer = setTimeout(() => {
            flush().catch(() => undefined);
          }, batchDelayMs);
        }
      }
      await Promise.all(waits);
    },

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    callCount(): number {
      return calls;
    },
  };

  return store;
}

export type MediaUrlStore = ReturnType<typeof createMediaUrlStore>;
