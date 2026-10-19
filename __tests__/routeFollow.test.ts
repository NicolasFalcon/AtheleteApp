import { RealLocationSource } from '../src/features/route/RealLocationSource';
import { locationBus } from '../src/features/route/locationTask';
import { polylineDistance } from '../src/features/route/routeGeo';
import {
  initialTracker,
  trackerPlanRemainingM,
  trackerReducer,
  type TrackerAction,
  type TrackerState,
} from '../src/features/route/routeTracker';
import type { LatLng, RouteSport } from '../src/features/route/routeTypes';
import { createFakeLocationApi } from './fixtures/fakeLocationApi';

const M = 1 / 111_195;
const T0 = 1_700_000_000_000;
const flush = async () => {
  for (let i = 0; i < 5; i += 1) {
    await Promise.resolve();
  }
};

// The same wiring as useRouteTracker, over the real source with a fake
// expo-location underneath: what the task delivers goes through the bus.
async function follow(plan: LatLng[], sport: RouteSport = 'running') {
  const api = createFakeLocationApi();
  const source = new RealLocationSource(api);
  let state: TrackerState = initialTracker(sport, plan);
  const dispatch = (action: TrackerAction) => {
    state = trackerReducer(state, action);
  };
  dispatch({ type: 'start', t: T0 });
  const stop = source.watch(
    fix => dispatch({ type: 'fix', fix }),
    event => {
      if (event.type === 'alive') {
        dispatch({ type: 'alive', t: event.t });
      } else {
        dispatch({ type: 'revoked', t: T0 });
      }
    },
  );
  await flush();
  return {
    api,
    stop,
    get state() {
      return state;
    },
    // A fix `north` metres up the street and `east` metres to the side, `sec` seconds in.
    at(north: number, east: number, sec: number) {
      locationBus.emitFixes([{ lat: north * M, lon: east * M, t: T0 + sec * 1000, accuracy: 5 }]);
    },
  };
}

const straight: LatLng[] = [{ lat: 0, lon: 0 }, { lat: 2000 * M, lon: 0 }];

describe('following a planned route with the real source', () => {
  it('goes through the platform updates and measures what is left', async () => {
    const run = await follow(straight);
    expect(run.api.updating).toBe(true);
    const total = polylineDistance(straight);
    expect(trackerPlanRemainingM(run.state, total)).toBeCloseTo(2000, 0);
    for (let i = 1; i <= 40; i += 1) {
      run.at(i * 25, 2, i * 8); // 3,1 m/s along the plan
    }
    const remaining = trackerPlanRemainingM(run.state, total)!;
    expect(remaining).toBeCloseTo(1000, -1);
    expect(run.state.deviation.off).toBe(false);
    run.stop();
    await flush();
    expect(run.api.updating).toBe(false);
  });

  it('warns after 10 s more than 40 m (running) away, and clears when back on the route', async () => {
    const run = await follow(straight);
    run.at(100, 0, 30);
    run.at(130, 60, 40); // leaves the route
    run.at(160, 62, 46);
    expect(run.state.deviation.off).toBe(false); // 6 s so far
    run.at(190, 64, 51);
    expect(run.state.deviation.off).toBe(true); // 11 s
    expect(run.state.deviation.distanceM).toBeGreaterThan(40);
    run.at(220, 3, 60);
    expect(run.state.deviation.off).toBe(false);
    // the recording went on the whole time
    expect(run.state.points.length).toBeGreaterThanOrEqual(5);
    run.stop();
  });

  it('on a bike the threshold is 60 m', async () => {
    const run = await follow(straight, 'cycling');
    run.at(100, 0, 20);
    run.at(150, 50, 28); // 50 m away: inside 60 m
    run.at(200, 52, 40);
    expect(run.state.deviation.off).toBe(false);
    run.at(250, 80, 46); // 80 m away
    run.at(300, 82, 58);
    expect(run.state.deviation.off).toBe(true);
    run.stop();
  });

  it('progress never goes back on an out-and-back route', async () => {
    const outAndBack: LatLng[] = [
      { lat: 0, lon: 0 },
      { lat: 1000 * M, lon: 0 },
      { lat: 0, lon: 0.00002 },
    ];
    const total = polylineDistance(outAndBack);
    const run = await follow(outAndBack);
    for (let i = 1; i <= 20; i += 1) {
      run.at(i * 50, 1, i * 14);
    }
    // at the turn the nearest point of the route is also on the way back
    const atTurn = trackerPlanRemainingM(run.state, total)!;
    expect(atTurn).toBeLessThan(1100);
    run.at(950, 3, 20 * 14 + 14);
    run.at(900, 3, 20 * 14 + 28);
    const after = trackerPlanRemainingM(run.state, total)!;
    expect(after).toBeLessThanOrEqual(atTurn);
    run.stop();
  });

  it('the permission taken away mid-route pauses the recording and keeps what it has', async () => {
    jest.useFakeTimers();
    try {
      const run = await follow(straight);
      run.at(50, 0, 10);
      run.at(100, 0, 20);
      run.api.permission = { status: 'denied', canAskAgain: false, precise: true };
      jest.advanceTimersByTime(5000);
      await flush();
      expect(run.state.status).toBe('paused');
      expect(run.state.permissionRevoked).toBe(true);
      expect(run.state.points).toHaveLength(2);
      run.stop();
    } finally {
      jest.useRealTimers();
    }
  });
});
