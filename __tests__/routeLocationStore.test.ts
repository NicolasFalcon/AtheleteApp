import type { LocationApi } from '../src/features/route/expoLocationApi';
import {
  LAST_KNOWN_MAX_AGE_MS,
  READY_ACCURACY_M,
  REUSE_MS,
  createLocationStore,
  isReadyFix,
} from '../src/features/route/locationStore';
import type { RoutePoint } from '../src/features/route/routeTypes';

// B-11 (first GPS) and B-13 (no repeated calls), with a fake platform.
function fakeApi(lastKnown: RoutePoint | null = { lat: -33.45, lon: -70.66, accuracy: 65 }) {
  const listeners: Array<{ accuracy: 'balanced' | 'high'; onFix: (fix: RoutePoint) => void; stopped: boolean }> = [];
  const calls = { lastKnown: 0, watch: [] as string[], stops: 0 };
  const api = {
    getLastKnown: jest.fn(async (maxAge: number) => {
      calls.lastKnown += 1;
      expect(maxAge).toBe(LAST_KNOWN_MAX_AGE_MS);
      return lastKnown;
    }),
    watchForeground: jest.fn(async (accuracy: 'balanced' | 'high', onFix: (fix: RoutePoint) => void) => {
      const entry = { accuracy, onFix, stopped: false };
      listeners.push(entry);
      calls.watch.push(accuracy);
      return () => {
        entry.stopped = true;
        calls.stops += 1;
      };
    }),
  } as unknown as LocationApi;
  const emit = (fix: RoutePoint) =>
    listeners.filter(entry => !entry.stopped).forEach(entry => entry.onFix(fix));
  const active = () => listeners.filter(entry => !entry.stopped).map(entry => entry.accuracy);
  return { api, calls, emit, active };
}

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

describe('first GPS (B-11)', () => {
  it('shows the last known position at once (approximate), searches balanced then high, ready ≤ 30 m', async () => {
    let now = 1_000_000;
    const { api, calls, emit, active } = fakeApi();
    const store = createLocationStore(api, () => now);

    await store.warm();
    expect(store.get().fix).toMatchObject({ approximate: true, point: { accuracy: 65 } });
    expect(isReadyFix(store.get().fix)).toBe(false);

    store.start();
    await flush();
    expect(active()).toEqual(['balanced']);

    emit({ lat: -33.45, lon: -70.66, accuracy: 48 });
    await flush();
    // After its first fix the search goes on with high accuracy.
    expect(active()).toEqual(['high']);
    expect(store.get().fix).toMatchObject({ approximate: false, point: { accuracy: 48 } });
    expect(isReadyFix(store.get().fix)).toBe(false);

    now += 2000;
    emit({ lat: -33.45, lon: -70.66, accuracy: 9 });
    expect(isReadyFix(store.get().fix)).toBe(true);
    expect(READY_ACCURACY_M).toBe(30);
    expect(calls.watch).toEqual(['balanced', 'high']);
  });

  it('an approximate position never replaces a recent real one', () => {
    const store = createLocationStore(fakeApi().api, () => 5000);
    store.record({ lat: 1, lon: 1, accuracy: 8 });
    store.record({ lat: 2, lon: 2, accuracy: 70 }, true);
    expect(store.get().fix?.point.lat).toBe(1);
  });
});

describe('repeated calls (B-13)', () => {
  it('second visit within 3 min: no new search from zero; the GPS stops on leaving', async () => {
    let now = 1_000_000;
    const { api, calls, emit, active } = fakeApi();
    const store = createLocationStore(api, () => now);

    // First visit.
    await store.warm();
    store.start();
    await flush();
    emit({ lat: -33.45, lon: -70.66, accuracy: 8 });
    await flush();
    store.stop();
    expect(active()).toEqual([]);
    expect(store.get().searching).toBe(false);
    const first = { lastKnown: calls.lastKnown, watch: calls.watch.length };

    // Second visit, 2 min later: the fix is reused and ready at once.
    now += 2 * 60_000;
    await store.warm();
    expect(isReadyFix(store.get().fix)).toBe(true);
    expect(calls.lastKnown).toBe(first.lastKnown);
    store.start();
    await flush();
    store.start(); // focusing twice does not open two searches
    expect(calls.watch.length - first.watch).toBe(1);
    store.stop();

    // After 3 min it is not fresh any more: the last known position again.
    now += REUSE_MS + 1;
    await store.warm();
    expect(calls.lastKnown).toBe(first.lastKnown + 1);
  });
});
