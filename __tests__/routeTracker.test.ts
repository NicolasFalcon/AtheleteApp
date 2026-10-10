import {
  SIGNAL_LOST_MS,
  initialTracker,
  trackerActiveSec,
  trackerPace,
  trackerPausedSec,
  trackerReducer,
  trackerSignalLost,
  trackerSpeed,
  type TrackerAction,
  type TrackerState,
} from '../src/features/route/routeTracker';
import { SimulatedLocationSource } from '../src/features/route/locationSource';
import { haversine } from '../src/features/route/routeGeo';

const north = (m: number) => ({ lat: m / 111_195, lon: 0 });
const T0 = 1_000_000;

function run(actions: TrackerAction[], from?: TrackerState) {
  return actions.reduce(trackerReducer, from ?? initialTracker('running'));
}

describe('tracker · distance and time', () => {
  it('starts, adds distance with each fix and measures active time', () => {
    const s = run([
      { type: 'start', t: T0 },
      { type: 'fix', fix: { ...north(0), t: T0 } },
      { type: 'fix', fix: { ...north(100), t: T0 + 30_000 } },
      { type: 'fix', fix: { ...north(200), t: T0 + 60_000 } },
      { type: 'tick', t: T0 + 60_000 },
    ]);
    expect(s.status).toBe('recording');
    expect(s.distanceM).toBeCloseTo(200, 0);
    expect(trackerActiveSec(s)).toBe(60);
    expect(trackerPace(s)).toBeCloseTo(300, 0); // 5:00 /km
    expect(trackerSpeed(s)).toBeCloseTo(12, 0);
  });

  it('ignores inaccurate fixes and jitter under 2 m', () => {
    const s = run([
      { type: 'start', t: T0 },
      { type: 'fix', fix: { ...north(0), t: T0 + 1000, accuracy: 4 } },
      { type: 'fix', fix: { ...north(500), t: T0 + 2000, accuracy: 120 } },
      { type: 'fix', fix: { ...north(1), t: T0 + 3000, accuracy: 4 } },
    ]);
    expect(s.points).toHaveLength(1);
    expect(s.distanceM).toBe(0);
  });

  it('a pause freezes time and distance; resuming continues', () => {
    let s = run([
      { type: 'start', t: T0 },
      { type: 'fix', fix: { ...north(0), t: T0 } },
      { type: 'fix', fix: { ...north(100), t: T0 + 30_000 } },
      { type: 'pause', t: T0 + 30_000 },
      { type: 'tick', t: T0 + 90_000 },
      // A fix while paused does not count.
      { type: 'fix', fix: { ...north(900), t: T0 + 90_000 } },
    ]);
    expect(s.status).toBe('paused');
    expect(s.distanceM).toBeCloseTo(100, 0);
    expect(trackerActiveSec(s)).toBe(30);
    expect(trackerPausedSec(s)).toBe(60);

    s = run(
      [
        { type: 'resume', t: T0 + 90_000 },
        { type: 'fix', fix: { ...north(150), t: T0 + 100_000 } },
        { type: 'tick', t: T0 + 100_000 },
      ],
      s,
    );
    expect(s.status).toBe('recording');
    expect(trackerActiveSec(s)).toBe(40);
    expect(s.distanceM).toBeCloseTo(150, 0);
  });

  it('finishing closes an open pause and freezes the clock', () => {
    const s = run([
      { type: 'start', t: T0 },
      { type: 'pause', t: T0 + 10_000 },
      { type: 'finish', t: T0 + 70_000 },
      { type: 'tick', t: T0 + 500_000 },
    ]);
    expect(s.status).toBe('finished');
    expect(trackerActiveSec(s)).toBe(10);
    expect(s.pauses[0].to).toBe(T0 + 70_000);
  });

  it('only valid transitions apply', () => {
    expect(run([{ type: 'pause', t: 1 }]).status).toBe('ready');
    expect(run([{ type: 'start', t: 1 }, { type: 'resume', t: 2 }]).status).toBe('recording');
  });
});

describe('tracker · signal and deviation', () => {
  it('reports "sin señal" after 10 s without a fix, and not during a pause', () => {
    let s = run([{ type: 'start', t: T0 }, { type: 'fix', fix: { ...north(0), t: T0 } }]);
    s = trackerReducer(s, { type: 'tick', t: T0 + SIGNAL_LOST_MS - 1 });
    expect(trackerSignalLost(s)).toBe(false);
    s = trackerReducer(s, { type: 'tick', t: T0 + SIGNAL_LOST_MS });
    expect(trackerSignalLost(s)).toBe(true);
    s = trackerReducer(s, { type: 'pause', t: T0 + SIGNAL_LOST_MS });
    expect(trackerSignalLost(s)).toBe(false);
  });

  it('flags off-route only after 10 s beyond 40 m of the plan', () => {
    const plan = [north(0), north(2000)];
    const side = (m: number, east: number, t: number) => ({
      lat: m / 111_195,
      lon: east / 111_195,
      t,
    });
    let s = run(
      [
        { type: 'start', t: T0 },
        { type: 'fix', fix: side(100, 0, T0 + 1000) },
        { type: 'fix', fix: side(150, 60, T0 + 2000) },
        { type: 'fix', fix: side(200, 62, T0 + 8000) },
      ],
      initialTracker('running', plan),
    );
    expect(s.planDistanceM).toBeGreaterThan(40);
    expect(s.deviation.off).toBe(false);
    s = trackerReducer(s, { type: 'fix', fix: side(260, 65, T0 + 12_100) });
    expect(s.deviation.off).toBe(true);
    s = trackerReducer(s, { type: 'fix', fix: side(300, 5, T0 + 14_000) });
    expect(s.deviation.off).toBe(false);
  });
});

describe('SimulatedLocationSource', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const track = Array.from({ length: 41 }, (_, i) => north(i * 25)); // 1000 m

  it('replays the track at the given speed with a virtual clock', () => {
    const source = new SimulatedLocationSource(
      { polyline: track, sport: 'running', speedMs: 5, speedup: 10, tickMs: 1000 },
      T0,
    );
    const fixes: { lat: number; lon: number; t?: number }[] = [];
    const stop = source.watch(f => fixes.push(f));
    jest.advanceTimersByTime(3000);
    stop();
    expect(fixes).toHaveLength(3);
    // 3 ticks × 10 virtual s × 5 m/s = 150 m
    expect(haversine(fixes[2], track[0])).toBeCloseTo(150, 0);
    expect(source.now()).toBe(T0 + 30_000);
  });

  it('stands still while not moving, and leaves GPS gaps', () => {
    const source = new SimulatedLocationSource(
      { polyline: track, sport: 'running', speedMs: 5, gaps: [{ atSec: 2, forSec: 2 }] },
      T0,
    );
    const fixes: { lat: number }[] = [];
    source.watch(f => fixes.push(f));
    jest.advanceTimersByTime(6000);
    // Seconds of movement 1..6; the gap swallows those at 2 and 3.
    expect(fixes.length).toBe(4);
    source.setMoving(false);
    const before = fixes.length;
    jest.advanceTimersByTime(2000);
    expect(fixes.length).toBe(before + 2);
    expect(fixes[fixes.length - 1].lat).toBe(fixes[fixes.length - 2].lat);
  });

  it('applies a detour to the side of the track', () => {
    const source = new SimulatedLocationSource(
      { polyline: track, sport: 'running', detour: { startM: 300, lengthM: 300, offsetM: 100 } },
      T0,
    );
    const straight = source.position(450);
    expect(Math.abs(straight.lon * 111_195)).toBeGreaterThan(80);
    expect(Math.abs(source.position(100).lon)).toBe(0);
  });

  it('denied permission stays denied until granted', async () => {
    const source = new SimulatedLocationSource(
      { polyline: track, sport: 'running', permission: 'denied' },
      T0,
    );
    expect(await source.requestPermission()).toBe('denied');
    expect(await source.getCurrent()).toBeNull();
    source.grantPermission();
    expect(await source.getPermission()).toBe('granted');
    expect(await source.getCurrent()).not.toBeNull();
  });
});
