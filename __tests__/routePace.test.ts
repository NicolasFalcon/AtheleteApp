import {
  CURRENT_WINDOW_SEC,
  initialTracker,
  trackerActiveSec,
  trackerCurrentPace,
  trackerCurrentSpeed,
  trackerPace,
  trackerReducer,
  type TrackerAction,
  type TrackerState,
} from '../src/features/route/routeTracker';

// B-08: walking, jogging and running gave the same pace. Synthetic traces with
// the platform's 5 m distance filter and a little GPS noise.
const T0 = 1_000_000;
const M = 1 / 111_195; // degrees of latitude per metre

// A fix every 5 m at `speed` m/s for `seconds`, starting at metre `fromM`
// and second `fromS`; ±1 m of noise and 8 m of accuracy.
function stretch(speed: number, seconds: number, fromM = 0, fromS = 0): TrackerAction[] {
  const actions: TrackerAction[] = [];
  const step = 5;
  const count = Math.floor((speed * seconds) / step);
  for (let i = 1; i <= count; i += 1) {
    const metres = fromM + i * step + (i % 2 === 0 ? 1 : -1);
    const t = fromS + (i * step) / speed;
    actions.push({ type: 'fix', fix: { lat: metres * M, lon: 0, t: T0 + t * 1000, accuracy: 8 } });
    actions.push({ type: 'tick', t: T0 + t * 1000 });
  }
  return actions;
}

function record(actions: TrackerAction[]): TrackerState {
  return actions.reduce(trackerReducer, trackerReducer(initialTracker('running'), { type: 'start', t: T0 }));
}

const first: TrackerAction = { type: 'fix', fix: { lat: 0, lon: 0, t: T0, accuracy: 8 } };
const minKm = (paceSec: number | null) => (paceSec ?? 0) / 60;

describe('current pace (B-08)', () => {
  it('walking, jogging and running give clearly different paces', () => {
    const walk = record([first, ...stretch(1.3, 120)]);
    const jog = record([first, ...stretch(2.5, 120)]);
    const run = record([first, ...stretch(3.5, 120)]);
    // 1,3 m/s ≈ 12:49 /km · 2,5 m/s ≈ 6:40 /km · 3,5 m/s ≈ 4:46 /km
    expect(minKm(trackerCurrentPace(walk))).toBeGreaterThan(11.5);
    expect(minKm(trackerCurrentPace(walk))).toBeLessThan(14);
    expect(minKm(trackerCurrentPace(jog))).toBeGreaterThan(6);
    expect(minKm(trackerCurrentPace(jog))).toBeLessThan(7.3);
    expect(minKm(trackerCurrentPace(run))).toBeGreaterThan(4.3);
    expect(minKm(trackerCurrentPace(run))).toBeLessThan(5.3);
    // No fix of a walk is dropped by the filters (drift / minimum step).
    expect(walk.distanceM).toBeGreaterThan(1.3 * 120 * 0.9);
    expect(trackerCurrentSpeed(run)).toBeCloseTo(3.5 * 3.6, 0);
  });

  it('in one outing the current pace follows the change; the average lags behind', () => {
    const walkThenRun = record([first, ...stretch(1.3, 300), ...stretch(3.5, 60, 1.3 * 300, 300)]);
    // Current: running (the last ~30 s / 150 m).
    expect(minKm(trackerCurrentPace(walkThenRun))).toBeLessThan(5.3);
    // Average of the whole outing: still close to the walk (this was the bug:
    // the live screen showed this one).
    expect(minKm(trackerPace(walkThenRun))).toBeGreaterThan(9);
  });

  it('standing still slows the current pace down until it disappears; nothing shows without data', () => {
    let s = record([first, ...stretch(3.5, 60)]);
    const moving = trackerCurrentPace(s) ?? 0;
    s = trackerReducer(s, { type: 'tick', t: T0 + 75_000 });
    expect(trackerCurrentPace(s) ?? Infinity).toBeGreaterThan(moving);
    expect(trackerCurrentPace(record([first]))).toBeNull();
    expect(CURRENT_WINDOW_SEC).toBe(30);
  });

  it('a pause in the window is not time; the summary average has no pauses', () => {
    let s = record([first, ...stretch(3.5, 40)]);
    s = trackerReducer(s, { type: 'pause', t: T0 + 41_000 });
    s = trackerReducer(s, { type: 'resume', t: T0 + 101_000 });
    s = [...stretch(3.5, 10, 3.5 * 40, 101)].reduce(trackerReducer, s);
    // The 60 s pause does not make the current pace slow.
    expect(minKm(trackerCurrentPace(s))).toBeLessThan(5.3);
    // Average: distance / active time (≈ 51 s of movement), pauses out.
    expect(trackerActiveSec(s)).toBeLessThan(55);
    expect(minKm(trackerPace(s))).toBeLessThan(5.3);
  });
});
