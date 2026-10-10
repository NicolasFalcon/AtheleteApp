import {
  DEVIATION_HOLD_MS,
  INITIAL_DEVIATION,
  PRIVACY_TRIM_M,
  activeMs,
  cumulativeDistances,
  elevationGain,
  haversine,
  nearestOnRoute,
  paceSecPerKm,
  polylineDistance,
  speedKmh,
  trimEnds,
  updateDeviation,
} from '../src/features/route/routeGeo';
import { formatDuration, formatKm, formatPace } from '../src/features/route/routeFormat';

// One degree of latitude is ~111.2 km; along a parallel at 0° so is longitude.
const origin = { lat: 0, lon: 0 };
const north = (m: number) => ({ lat: m / 111_195, lon: 0 });
const line = (meters: number, step = 50) => {
  const out = [];
  for (let m = 0; m <= meters; m += step) {
    out.push(north(m));
  }
  return out;
};

describe('distance (haversine)', () => {
  it('matches known distances', () => {
    expect(haversine(origin, origin)).toBe(0);
    expect(haversine({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })).toBeCloseTo(111_195, -2);
    // Plaza Italia → Obelisco, Buenos Aires: ~5,1 km.
    const d = haversine(
      { lat: -34.5809, lon: -58.4206 },
      { lat: -34.6037, lon: -58.3816 },
    );
    expect(d).toBeGreaterThan(4_200);
    expect(d).toBeLessThan(4_600);
  });

  it('adds up a polyline and its cumulative distances', () => {
    const track = line(1000, 100);
    expect(polylineDistance(track)).toBeCloseTo(1000, 0);
    const cumulative = cumulativeDistances(track);
    expect(cumulative[0]).toBe(0);
    expect(cumulative[cumulative.length - 1]).toBeCloseTo(1000, 0);
    expect(polylineDistance([])).toBe(0);
    expect(polylineDistance([origin])).toBe(0);
  });
});

describe('pace and speed', () => {
  it('5 km in 25:10 is 5:02 /km and 11,9 km/h', () => {
    expect(paceSecPerKm(5000, 25 * 60 + 10)).toBeCloseTo(302, 0);
    expect(speedKmh(5000, 25 * 60 + 10)).toBeCloseTo(11.92, 1);
  });

  it('has no pace before 10 m or without time', () => {
    expect(paceSecPerKm(5, 30)).toBeNull();
    expect(paceSecPerKm(1000, 0)).toBeNull();
    expect(speedKmh(0, 10)).toBeNull();
  });

  it('formats like the design', () => {
    expect(formatPace(302)).toBe('5:02');
    expect(formatPace(null)).toBe('—');
    expect(formatDuration(1466)).toBe('24:26');
    expect(formatDuration(5560)).toBe('1:32:40');
    expect(formatKm(5240)).toBe('5,24');
    expect(formatKm(42_100, 1)).toBe('42,1');
  });
});

describe('active time with pauses', () => {
  const start = 1_000_000;
  it('without pauses is the whole interval', () => {
    expect(activeMs(start, start + 600_000, [])).toBe(600_000);
  });

  it('closed pauses are subtracted', () => {
    expect(
      activeMs(start, start + 600_000, [{ from: start + 100_000, to: start + 160_000 }]),
    ).toBe(540_000);
  });

  it('an open pause freezes the clock', () => {
    const pause = [{ from: start + 300_000, to: null }];
    expect(activeMs(start, start + 400_000, pause)).toBe(300_000);
    expect(activeMs(start, start + 900_000, pause)).toBe(300_000);
  });

  it('ignores pauses outside the interval and never goes negative', () => {
    expect(activeMs(start, start + 1000, [{ from: 0, to: start + 5000 }])).toBe(0);
    expect(activeMs(start, start - 5, [])).toBe(0);
  });
});

describe('elevation gain', () => {
  it('sums climbs and ignores descents and noise', () => {
    const pts = [10, 12, 11.5, 15, 14, 20, 20.3].map(ele => ({ ...origin, ele }));
    // 10 → 12 (+2), 12 → 11.5 (noise < 1), 11.5 → 15 vs ref 12 (+3), 15 → 14 (−1),
    // 14 → 20 (+6), 20 → 20.3 (noise).
    expect(elevationGain(pts)).toBe(11);
    expect(elevationGain([origin, origin])).toBe(0);
  });
});

describe('distance to a planned route', () => {
  const route = line(1000, 100);

  it('is the perpendicular distance to the nearest segment', () => {
    const p = { lat: 500 / 111_195, lon: 120 / 111_195 };
    const hit = nearestOnRoute(p, route)!;
    expect(hit.distanceM).toBeCloseTo(120, 0);
    expect(hit.along).toBeCloseTo(500, 0);
    expect(hit.nearest.lon).toBeCloseTo(0, 6);
  });

  it('clamps beyond the ends', () => {
    const hit = nearestOnRoute({ lat: -100 / 111_195, lon: 0 }, route)!;
    expect(hit.distanceM).toBeCloseTo(100, 0);
    expect(hit.along).toBe(0);
    expect(nearestOnRoute(origin, [])).toBeNull();
  });
});

describe('off-route detection', () => {
  it('needs 10 s outside 40 m (running) before it turns on', () => {
    let s = INITIAL_DEVIATION;
    s = updateDeviation(s, 'running', 0, 41);
    expect(s.off).toBe(false);
    s = updateDeviation(s, 'running', DEVIATION_HOLD_MS - 1, 55);
    expect(s.off).toBe(false);
    s = updateDeviation(s, 'running', DEVIATION_HOLD_MS, 60);
    expect(s.off).toBe(true);
    expect(s.distanceM).toBe(60);
  });

  it('exactly the threshold is still on the route', () => {
    expect(updateDeviation(INITIAL_DEVIATION, 'running', 0, 40).outsideSince).toBeNull();
    expect(updateDeviation(INITIAL_DEVIATION, 'cycling', 0, 60).outsideSince).toBeNull();
  });

  it('cycling tolerates 60 m', () => {
    let s = updateDeviation(INITIAL_DEVIATION, 'cycling', 0, 50);
    s = updateDeviation(s, 'cycling', 30_000, 50);
    expect(s.off).toBe(false);
    s = updateDeviation(s, 'cycling', 31_000, 61);
    s = updateDeviation(s, 'cycling', 41_000, 61);
    expect(s.off).toBe(true);
  });

  it('coming back inside clears it at once and restarts the count', () => {
    let s = updateDeviation(INITIAL_DEVIATION, 'running', 0, 80);
    s = updateDeviation(s, 'running', 12_000, 80);
    expect(s.off).toBe(true);
    s = updateDeviation(s, 'running', 13_000, 10);
    expect(s).toMatchObject({ off: false, outsideSince: null });
    s = updateDeviation(s, 'running', 14_000, 90);
    s = updateDeviation(s, 'running', 20_000, 90);
    expect(s.off).toBe(false);
  });
});

describe('privacy trim (200 m at each end)', () => {
  it('removes 200 m from the start and from the end', () => {
    const track = line(2000, 25);
    const trimmed = trimEnds(track);
    expect(PRIVACY_TRIM_M).toBe(200);
    expect(polylineDistance(trimmed)).toBeCloseTo(1600, 0);
    expect(haversine(trimmed[0], track[0])).toBeCloseTo(200, 0);
    expect(haversine(trimmed[trimmed.length - 1], track[track.length - 1])).toBeCloseTo(200, 0);
  });

  it('keeps the vertices in between and never invents the hidden ones', () => {
    const track = line(1000, 100);
    const trimmed = trimEnds(track);
    expect(trimmed.length).toBeGreaterThanOrEqual(2);
    // No vertex of the original within 200 m of either end survives.
    trimmed.slice(1, -1).forEach(p => {
      const d = haversine(p, track[0]);
      expect(d).toBeGreaterThan(200);
    });
  });

  it('shows nothing for a track of 400 m or less', () => {
    expect(trimEnds(line(399, 20))).toEqual([]);
    expect(trimEnds(line(300, 20))).toEqual([]);
    expect(trimEnds([origin])).toEqual([]);
    expect(trimEnds(line(410, 1)).length).toBeGreaterThanOrEqual(2);
  });

  it('accepts another distance', () => {
    expect(polylineDistance(trimEnds(line(1000, 10), 100))).toBeCloseTo(800, 0);
  });
});

describe('route drawn by hand', () => {
  it('its distance is the length of the tapped points', () => {
    const pts = [
      { lat: 0, lon: 0 },
      { lat: 0.0045, lon: 0 },
      { lat: 0.0045, lon: 0.0045 },
    ];
    // ~500 m north, then ~500 m east.
    expect(polylineDistance(pts)).toBeGreaterThan(990);
    expect(polylineDistance(pts)).toBeLessThan(1010);
  });
});
