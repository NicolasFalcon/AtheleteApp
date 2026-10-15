import {
  AUTO_PAUSE_HOLD_MS,
  REANCHOR_AFTER_JUMPS,
  initialTracker,
  restoreTracker,
  trackerActiveSec,
  trackerReducer,
  type TrackerAction,
  type TrackerState,
} from '../src/features/route/routeTracker';
import type { RouteSport } from '../src/features/route/routeTypes';

const T0 = 1_000_000;
const M = 1 / 111_195; // degrees of latitude per metre
const at = (m: number, t: number, accuracy = 5) => ({ lat: m * M, lon: 0, t: T0 + t * 1000, accuracy });

function run(actions: TrackerAction[], from?: TrackerState, sport: RouteSport = 'running', autoPause = false) {
  return actions.reduce(trackerReducer, from ?? initialTracker(sport, null, autoPause));
}
const start: TrackerAction = { type: 'start', t: T0 };
const fix = (m: number, t: number, accuracy = 5): TrackerAction => ({ type: 'fix', fix: at(m, t, accuracy) });

describe('filters · impossible jumps', () => {
  it('drops a running fix faster than the server allows (12 m/s) and keeps the track', () => {
    const s = run([start, fix(0, 0), fix(30, 10), fix(330, 11), fix(60, 20)]);
    // 300 m in 1 s is a GPS jump: dropped; the next fix is measured from the last good one.
    expect(s.points.map(p => Math.round(p.lat / M))).toEqual([0, 30, 60]);
    expect(s.distanceM).toBeCloseTo(60, 0);
  });

  it('uses 25 m/s for cycling', () => {
    // 20 m/s is fine on a bike and impossible running.
    const bike = run([start, fix(0, 0), fix(200, 10)], undefined, 'cycling');
    expect(bike.points).toHaveLength(2);
    const foot = run([start, fix(0, 0), fix(200, 10)], undefined, 'running');
    expect(foot.points).toHaveLength(1);
    // 30 m/s is impossible on a bike too.
    const car = run([start, fix(0, 0), fix(300, 10)], undefined, 'cycling');
    expect(car.points).toHaveLength(1);
  });

  it('keeps a margin under the server limit', () => {
    // 11.9 m/s passes the server (12) but the client keeps 5 % of margin.
    expect(run([start, fix(0, 0), fix(119, 10)]).points).toHaveLength(1);
    expect(run([start, fix(0, 0), fix(110, 10)]).points).toHaveLength(2);
  });

  it('never produces a stretch the server would refuse', () => {
    const noisy: TrackerAction[] = [start, fix(0, 0)];
    let m = 0;
    for (let i = 1; i <= 60; i += 1) {
      m += 3;
      noisy.push(fix(i % 7 === 0 ? m + 400 : m, i)); // every 7th fix jumps 400 m
    }
    const s = run(noisy);
    for (let i = 1; i < s.points.length; i += 1) {
      const dt = ((s.points[i].t ?? 0) - (s.points[i - 1].t ?? 0)) / 1000;
      const step = Math.abs(s.points[i].lat - s.points[i - 1].lat) / M;
      expect(step / dt).toBeLessThanOrEqual(12);
    }
    expect(s.points.length).toBeGreaterThan(40);
  });

  it('ignores a fix with the same or an older time', () => {
    const s = run([start, fix(0, 5), fix(20, 5), fix(40, 4)]);
    expect(s.points).toHaveLength(1);
  });

  it('a bad first fix does not poison the whole outing', () => {
    const actions: TrackerAction[] = [start, fix(5000, 0)];
    for (let i = 1; i <= REANCHOR_AFTER_JUMPS; i += 1) {
      actions.push(fix(i * 3, i * 2));
    }
    const s = run(actions);
    expect(s.points.length).toBeGreaterThanOrEqual(1);
    expect(Math.round(s.points[0].lat / M)).toBeLessThan(100);
    expect(s.distanceM).toBeLessThan(50);
  });

  it('still drops fixes with bad accuracy', () => {
    expect(run([start, fix(0, 0), fix(30, 10, 80)]).points).toHaveLength(1);
  });
});

describe('filters · drift while standing still', () => {
  it('a step smaller than max(accuracy, 5 m) is not distance when the pace is almost zero', () => {
    const s = run([start, fix(0, 0, 12), fix(8, 30, 12), fix(-6, 60, 12), fix(9, 90, 12)]);
    expect(s.points).toHaveLength(1);
    expect(s.distanceM).toBe(0);
  });

  it('a real step counts even with the same displacement when it is moving', () => {
    const s = run([start, fix(0, 0, 12), fix(8, 3, 12)]);
    expect(s.points).toHaveLength(2);
    expect(s.distanceM).toBeCloseTo(8, 0);
  });

  it('walking slowly still adds up (the displacement accumulates until it passes the threshold)', () => {
    const actions: TrackerAction[] = [start, fix(0, 0)];
    for (let i = 1; i <= 40; i += 1) {
      actions.push(fix(i * 1, i * 2)); // 0.5 m/s, accuracy 5
    }
    const s = run(actions);
    expect(s.distanceM).toBeGreaterThan(30);
  });
});

describe('auto-pause', () => {
  const hold = AUTO_PAUSE_HOLD_MS.running / 1000;
  const alive = (t: number): TrackerAction => ({ type: 'alive', t: T0 + t * 1000 });
  const tick = (t: number): TrackerAction => ({ type: 'tick', t: T0 + t * 1000 });

  const moving = (): TrackerAction[] => [start, fix(0, 0), fix(10, 3), fix(20, 6)];

  it('pauses by itself after the hold time without movement, starting at the last movement', () => {
    const s = run([...moving(), alive(8), alive(12), tick(15)], undefined, 'running', true);
    expect(s.status).toBe('paused');
    expect(s.autoPaused).toBe(true);
    expect(s.pauses[0].from).toBe(T0 + 6000);
    // the stopped seconds are not part of the active time
    expect(trackerActiveSec(s)).toBe(6);
  });

  it('does not pause before the hold time, or when the preference is off', () => {
    const early = run([...moving(), alive(6 + hold - 1), tick(6 + hold - 1)], undefined, 'running', true);
    expect(early.status).toBe('recording');
    const off = run([...moving(), alive(20), tick(30)], undefined, 'running', false);
    expect(off.status).toBe('recording');
  });

  it('does not pause when the signal was lost (that is not standing still)', () => {
    const s = run([...moving(), tick(40)], undefined, 'running', true);
    expect(s.status).toBe('recording');
  });

  it('cycling reacts faster', () => {
    expect(AUTO_PAUSE_HOLD_MS.cycling).toBeLessThan(AUTO_PAUSE_HOLD_MS.running);
    const s = run(
      [start, fix(0, 0), fix(20, 3), fix(40, 6), alive(8), alive(12)],
      undefined,
      'cycling',
      true,
    );
    expect(s.status).toBe('paused');
  });

  it('GPS drift while paused does not resume it', () => {
    let s = run([...moving(), alive(8), alive(15)], undefined, 'running', true);
    expect(s.status).toBe('paused');
    s = run([fix(23, 20, 12), fix(17, 25, 12), fix(25, 30, 12)], s);
    expect(s.status).toBe('paused');
  });

  it('resumes when the person moves again, counting the movement and not the stop', () => {
    let s = run([...moving(), alive(8), alive(15)], undefined, 'running', true);
    s = run([fix(30, 40), fix(38, 43)], s);
    expect(s.status).toBe('recording');
    expect(s.autoPaused).toBe(false);
    expect(s.pauses[0]).toEqual({ from: T0 + 6000, to: T0 + 40_000 });
    expect(s.distanceM).toBeGreaterThan(30);
    // the stop (34 s) is excluded from the time
    s = trackerReducer(s, { type: 'tick', t: T0 + 43_000 });
    expect(trackerActiveSec(s)).toBeCloseTo(9, 0);
  });

  it('a manual pause never resumes by itself', () => {
    let s = run([...moving(), { type: 'pause', t: T0 + 7000 }], undefined, 'running', true);
    s = run([fix(40, 12), fix(60, 16)], s);
    expect(s.status).toBe('paused');
    expect(s.autoPaused).toBe(false);
  });

  it('the person can resume manually from an automatic pause', () => {
    let s = run([...moving(), alive(8), alive(15)], undefined, 'running', true);
    s = trackerReducer(s, { type: 'resume', t: T0 + 20_000 });
    expect(s.status).toBe('recording');
    expect(s.autoPaused).toBe(false);
  });
});

describe('restoreTracker', () => {
  it('a recording found after the app closed comes back paused at the last saved instant', () => {
    const live = run([start, fix(0, 0), fix(20, 6), { type: 'tick', t: T0 + 7000 }]);
    const back = restoreTracker(JSON.parse(JSON.stringify(live)));
    expect(back.status).toBe('paused');
    expect(back.pauses).toEqual([{ from: T0 + 7000, to: null }]);
    expect(back.points).toHaveLength(2);
    // the time after the close is not counted, whenever it is resumed
    const later = trackerReducer(back, { type: 'resume', t: T0 + 3_600_000 });
    expect(trackerActiveSec(trackerReducer(later, { type: 'tick', t: T0 + 3_600_000 }))).toBe(7);
  });
});
