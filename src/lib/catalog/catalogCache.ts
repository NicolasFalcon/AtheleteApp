import type { KeyValueStorage } from '@app/lib/media/mediaUrlStore';

// The part of the catalog already downloaded (pages of list_exercises and
// get_exercise answers), kept on the phone and tied to catalog_version(): it
// is asked for again only when the version changes. Before the version is
// known (first launch) what is downloaded counts as the current version.

type Entry = { at: number; data: unknown };
type Snapshot = {
  version: string | null;
  exercises: number | null;
  entries: Record<string, Entry>;
};

export const CATALOG_STORAGE_KEY = '@athelete/catalog/v1';
const PERSIST_DELAY_MS = 800;
// Pages and exercises kept (the oldest go first).
const MAX_ENTRIES = 300;

export function createCatalogCache({
  storage = null,
  now = Date.now,
  maxEntries = MAX_ENTRIES,
}: {
  storage?: KeyValueStorage | null;
  now?: () => number;
  maxEntries?: number;
} = {}) {
  let state: Snapshot = { version: null, exercises: null, entries: {} };
  let loaded: Promise<void> | null = null;
  let persistTimer: ReturnType<typeof setTimeout> | null = null;
  const inflight = new Map<string, Promise<unknown>>();

  const load = (): Promise<void> => {
    if (!storage) {
      return Promise.resolve();
    }
    loaded ??= storage
      .getItem(CATALOG_STORAGE_KEY)
      .then(raw => {
        if (!raw) {
          return;
        }
        const saved = JSON.parse(raw) as Snapshot;
        if (saved && typeof saved === 'object' && saved.entries) {
          // Anything written before the load finished stays.
          state = {
            version: state.version ?? saved.version ?? null,
            exercises: state.exercises ?? saved.exercises ?? null,
            entries: { ...saved.entries, ...state.entries },
          };
        }
      })
      .catch(() => undefined);
    return loaded;
  };

  const writeNow = () => {
    if (!storage) {
      return Promise.resolve();
    }
    return storage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);
  };

  const persist = () => {
    if (!storage || persistTimer) {
      return;
    }
    persistTimer = setTimeout(() => {
      persistTimer = null;
      writeNow();
    }, PERSIST_DELAY_MS);
  };

  const prune = () => {
    const ids = Object.keys(state.entries);
    if (ids.length <= maxEntries) {
      return;
    }
    ids
      .sort((a, b) => state.entries[a].at - state.entries[b].at)
      .slice(0, ids.length - maxEntries)
      .forEach(id => {
        delete state.entries[id];
      });
  };

  const cache = {
    load,

    version(): string | null {
      return state.version;
    },

    exerciseCount(): number | null {
      return state.exercises;
    },

    async get<T>(id: string): Promise<T | undefined> {
      await load();
      return state.entries[id]?.data as T | undefined;
    },

    async set(id: string, data: unknown): Promise<void> {
      await load();
      state.entries[id] = { at: now(), data };
      prune();
      persist();
    },

    // The answer of catalog_version(). true when the saved catalog belonged
    // to another version (it is dropped and has to be asked for again).
    async applyVersion(version: string, exercises: number): Promise<boolean> {
      await load();
      const changed = state.version !== null && state.version !== version;
      const same = state.version === version && state.exercises === exercises;
      state = {
        version,
        exercises,
        entries: changed ? {} : state.entries,
      };
      // The same version as saved: nothing to write.
      if (!same) {
        await writeNow();
      }
      return changed;
    },

    // From the phone when it is there; otherwise asked once (concurrent calls
    // share it) and kept.
    async cached<T>(id: string, fetcher: () => Promise<T>): Promise<T> {
      const hit = await cache.get<T>(id);
      if (hit !== undefined) {
        return hit;
      }
      const running = inflight.get(id) as Promise<T> | undefined;
      if (running) {
        return running;
      }
      const version = state.version;
      const work = fetcher()
        .then(async data => {
          // A version change while asking: the answer may be old, not kept.
          // (Before the first version is known it counts as the current one.)
          if (version === null || state.version === version) {
            await cache.set(id, data);
          }
          return data;
        })
        .finally(() => inflight.delete(id));
      inflight.set(id, work);
      return work;
    },

    async clear(): Promise<void> {
      await load();
      state = { version: null, exercises: null, entries: {} };
      await writeNow();
    },
  };

  return cache;
}

export type CatalogCache = ReturnType<typeof createCatalogCache>;
