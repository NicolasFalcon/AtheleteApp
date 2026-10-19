import { initialTracker, trackerReducer, type TrackerAction } from '../src/features/route/routeTracker';

// Lote 5 · walking distance with a noisy GPS. A synthetic trace of known
// length goes through the real tracker: the person walks a straight line (or
// stands still) and the GPS adds an error of ~5 m (reported accuracy 5 m,
// i.e. the 68 % radius: σ ≈ 3.3 m per axis). The error drifts slowly, as a
// real GPS does (AR(1) at 1 Hz, ρ = 0.97 ≈ 30 s of correlation), and fixes
// arrive like expo-location sends them (distanceInterval 5 m).

const T0 = 1_000_000;
const LAT0 = -33.45;
const LON0 = -70.66;
const M_LAT = 1 / 111_195;
const M_LON = 1 / (111_195 * Math.cos((LAT0 * Math.PI) / 180));

function random(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function gauss(next: () => number) {
  const u = Math.max(1e-9, next());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * next());
}

function trace(speed: number, seconds: number, seed: number, { sigma = 3.3, rho = 0.97, accuracy = 5 } = {}) {
  const next = random(seed);
  const innovation = sigma * Math.sqrt(1 - rho * rho);
  let ex = sigma * gauss(next);
  let ey = sigma * gauss(next);
  let lastX = Number.NEGATIVE_INFINITY;
  let lastY = 0;
  const actions: TrackerAction[] = [];
  for (let t = 0; t <= seconds; t += 1) {
    ex = rho * ex + innovation * gauss(next);
    ey = rho * ey + innovation * gauss(next);
    const x = speed * t + ex;
    const y = ey;
    const at = T0 + t * 1000;
    if (Math.hypot(x - lastX, y - lastY) >= 5) {
      lastX = x;
      lastY = y;
      actions.push({ type: 'fix', fix: { lat: LAT0 + y * M_LAT, lon: LON0 + x * M_LON, t: at, accuracy } });
    }
    actions.push({ type: 'tick', t: at });
  }
  return actions;
}

function distance(actions: TrackerAction[]) {
  const started = trackerReducer(initialTracker('running'), { type: 'start', t: T0 });
  return actions.reduce(trackerReducer, started).distanceM;
}

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];

describe('walking distance with GPS noise (Lote 5)', () => {
  it('500 m in a straight line at 1.3 m/s measures 500 m ± 3 %', () => {
    for (const seed of SEEDS) {
      const measured = distance(trace(1.3, 500 / 1.3, seed));
      expect(measured).toBeGreaterThanOrEqual(485);
      expect(measured).toBeLessThanOrEqual(515);
    }
  });

  it('without noise nothing is lost (the filter never undercounts a straight walk)', () => {
    const measured = distance(trace(1.3, 500 / 1.3, 1, { sigma: 0 }));
    expect(measured).toBeGreaterThanOrEqual(495);
    expect(measured).toBeLessThanOrEqual(501);
  });

  it('a slow walk (0.7 m/s) also adds up (± 5 %: the noise weighs more per metre)', () => {
    for (const seed of SEEDS) {
      const measured = distance(trace(0.7, 500 / 0.7, seed));
      expect(measured).toBeGreaterThanOrEqual(475);
      expect(measured).toBeLessThanOrEqual(525);
    }
  });

  it('2 min standing still with the same noise → ~0 m', () => {
    for (const seed of SEEDS) {
      expect(distance(trace(0, 120, seed))).toBeLessThanOrEqual(1);
    }
  });

  it('2 min standing still with a worse GPS (accuracy 10 m) → ~0 m', () => {
    for (const seed of SEEDS) {
      expect(distance(trace(0, 120, seed, { sigma: 6.6, accuracy: 10 }))).toBeLessThanOrEqual(1);
    }
  });
});
