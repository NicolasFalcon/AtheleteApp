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
    // Plausible speeds (a fix that jumps 78 m in 1 s is now dropped).
    let s = run(
      [
        { type: 'start', t: T0 },
        { type: 'fix', fix: side(100, 0, T0 + 1000) },
        { type: 'fix', fix: side(150, 60, T0 + 12_000) },
        { type: 'fix', fix: side(200, 62, T0 + 18_000) },
      ],
      initialTracker('running', plan),
    );
    expect(s.planDistanceM).toBeGreaterThan(40);
    expect(s.deviation.off).toBe(false);
    s = trackerReducer(s, { type: 'fix', fix: side(230, 65, T0 + 22_100) });
    expect(s.deviation.off).toBe(true);
    s = trackerReducer(s, { type: 'fix', fix: side(280, 5, T0 + 30_000) });
    expect(s.deviation.off).toBe(false);
  });
});
