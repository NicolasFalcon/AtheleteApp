import { HEARTBEAT_MS, RealLocationSource, stopAllLocationUpdates } from '../src/features/route/RealLocationSource';
import { UPDATE_OPTIONS } from '../src/features/route/expoLocationApi';
import { locationBus, toRoutePoint } from '../src/features/route/locationTask';
import type { LocationSourceEvent } from '../src/features/route/locationSource';
import type { RoutePoint } from '../src/features/route/routeTypes';
import { createFakeLocationApi } from './fixtures/fakeLocationApi';

const flush = async () => {
  for (let i = 0; i < 5; i += 1) {
    await Promise.resolve();
  }
};

describe('toRoutePoint', () => {
  it('uses the time of the sample and drops invalid accuracy / altitude', () => {
    expect(
      toRoutePoint({ coords: { latitude: 1, longitude: 2, altitude: 30, accuracy: 6 }, timestamp: 555 }),
    ).toEqual({ lat: 1, lon: 2, ele: 30, t: 555, accuracy: 6 });
    expect(
      toRoutePoint({ coords: { latitude: 1, longitude: 2, altitude: null, accuracy: -1 }, timestamp: 9 }),
    ).toEqual({ lat: 1, lon: 2, t: 9 });
  });
});

describe('update options', () => {
  it('keep the blue indicator, a 5 m filter and no automatic pause by iOS', () => {
    expect(UPDATE_OPTIONS).toEqual({
      distanceInterval: 5,
      showsBackgroundLocationIndicator: true,
      pausesUpdatesAutomatically: false,
    });
  });
});

describe('RealLocationSource access', () => {
  it('maps the platform states', async () => {
    const api = createFakeLocationApi({ permission: { status: 'undetermined', canAskAgain: true, precise: true } });
    const source = new RealLocationSource(api);
    expect(await source.getAccess()).toEqual({ permission: 'undetermined', precise: true });
    // Only requestAccess shows the dialog.
    expect((await source.requestAccess()).permission).toBe('granted');

    api.permission = { status: 'denied', canAskAgain: false, precise: true };
    expect((await source.getAccess()).permission).toBe('denied');

    api.services = false;
    expect((await source.getAccess()).permission).toBe('restricted');

    api.services = true;
    api.permission = { status: 'granted', canAskAgain: true, precise: false };
    expect(await source.getAccess()).toEqual({ permission: 'granted', precise: false });
  });

  it('does not ask again once the system refuses to', async () => {
    const api = createFakeLocationApi({ permission: { status: 'undetermined', canAskAgain: false, precise: true } });
    const request = jest.spyOn(api, 'requestPermissions');
    await new RealLocationSource(api).requestAccess();
    expect(request).not.toHaveBeenCalled();
  });

  it('getCurrent is null without permission', async () => {
    const api = createFakeLocationApi({ permission: { status: 'denied', canAskAgain: false, precise: true } });
    expect(await new RealLocationSource(api).getCurrent()).toBeNull();
  });
});

describe('RealLocationSource.watch', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('starts the updates, forwards the fixes of the task and stops everything on stop', async () => {
    const api = createFakeLocationApi();
    const source = new RealLocationSource(api);
    const fixes: RoutePoint[] = [];
    const stop = source.watch(fix => fixes.push(fix));
    await flush();
    expect(api.startCalls).toBe(1);
    expect(api.updating).toBe(true);

    locationBus.emitFixes([{ lat: 1, lon: 1, t: 1 }, { lat: 2, lon: 2, t: 2 }]);
    expect(fixes).toHaveLength(2);

    stop();
    await flush();
    expect(api.updating).toBe(false);
    locationBus.emitFixes([{ lat: 3, lon: 3, t: 3 }]);
    expect(fixes).toHaveLength(2);
  });

  it('stopping before the start finished still leaves nothing running', async () => {
    const api = createFakeLocationApi();
    const source = new RealLocationSource(api);
    const stop = source.watch(() => undefined);
    stop();
    await flush();
    expect(api.updating).toBe(false);
  });

  it('reports "alive" while the platform has a recent fix, without new fixes', async () => {
    const api = createFakeLocationApi({ lastKnown: { lat: 1, lon: 1, t: 1 } });
    const source = new RealLocationSource(api, locationBus, () => 42_000);
    const events: LocationSourceEvent[] = [];
    const stop = source.watch(() => undefined, event => events.push(event));
    await flush();
    jest.advanceTimersByTime(HEARTBEAT_MS);
    await flush();
    expect(events).toContainEqual({ type: 'alive', t: 42_000 });
    stop();
  });

  it('reports the permission taken away mid-route, once', async () => {
    const api = createFakeLocationApi();
    const source = new RealLocationSource(api);
    const events: LocationSourceEvent[] = [];
    const stop = source.watch(() => undefined, event => events.push(event));
    await flush();
    api.permission = { status: 'denied', canAskAgain: false, precise: true };
    jest.advanceTimersByTime(HEARTBEAT_MS * 3);
    await flush();
    expect(events.filter(event => event.type === 'permission_revoked')).toHaveLength(1);
    stop();
  });
});

describe('stopAllLocationUpdates', () => {
  it('stops whatever is running and never throws', async () => {
    const api = createFakeLocationApi({ updating: true });
    await stopAllLocationUpdates(api);
    expect(api.updating).toBe(false);
    await expect(
      stopAllLocationUpdates({ ...api, stopUpdates: async () => Promise.reject(new Error('x')) }),
    ).resolves.toBeUndefined();
  });
});
