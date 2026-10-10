import type { LatLng, RoutePoint, RouteSport } from '@app/features/route/routeTypes';

// Pure geometry of Ruta: distances, pace, active time, deviation from a
// planned route and the privacy trim. No React, no native modules.

const EARTH_RADIUS_M = 6_371_008.8;
const rad = (deg: number) => (deg * Math.PI) / 180;

// Great-circle distance in metres (haversine).
export function haversine(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Length of a polyline in metres.
export function polylineDistance(points: readonly LatLng[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += haversine(points[i - 1], points[i]);
  }
  return total;
}

// Distance from the start to each vertex.
export function cumulativeDistances(points: readonly LatLng[]): number[] {
  const out: number[] = [0];
  for (let i = 1; i < points.length; i += 1) {
    out.push(out[i - 1] + haversine(points[i - 1], points[i]));
  }
  return out;
}

// ── Pace and speed ──────────────────────────────────────────────────────────
// Seconds per km; null until there is something to divide (< 10 m or 0 s).
export function paceSecPerKm(distanceM: number, seconds: number): number | null {
  if (!(distanceM >= 10) || !(seconds > 0)) {
    return null;
  }
  return seconds / (distanceM / 1000);
}

export function speedKmh(distanceM: number, seconds: number): number | null {
  if (!(distanceM >= 10) || !(seconds > 0)) {
    return null;
  }
  return distanceM / 1000 / (seconds / 3600);
}

// ── Active time with pauses ─────────────────────────────────────────────────
export type PauseInterval = { from: number; to: number | null };

// Milliseconds between `startMs` and `nowMs` minus the pauses (an open pause
// counts up to `nowMs`, so the clock freezes while paused).
export function activeMs(
  startMs: number,
  nowMs: number,
  pauses: readonly PauseInterval[],
): number {
  let paused = 0;
  for (const pause of pauses) {
    const from = Math.max(pause.from, startMs);
    const to = Math.min(pause.to ?? nowMs, nowMs);
    if (to > from) {
      paused += to - from;
    }
  }
  return Math.max(0, nowMs - startMs - paused);
}

// ── Elevation gain ──────────────────────────────────────────────────────────
// Sum of climbs, ignoring noise under `threshold` metres between fixes.
export function elevationGain(points: readonly RoutePoint[], threshold = 1): number {
  let gain = 0;
  let ref: number | null = null;
  for (const point of points) {
    if (point.ele === undefined) {
      continue;
    }
    if (ref === null) {
      ref = point.ele;
      continue;
    }
    const diff = point.ele - ref;
    if (Math.abs(diff) >= threshold) {
      if (diff > 0) {
        gain += diff;
      }
      ref = point.ele;
    }
  }
  return Math.round(gain);
}

// ── Distance to a planned route ─────────────────────────────────────────────
export type NearestOnRoute = {
  distanceM: number; // from the point to the route
  nearest: LatLng; // the closest point on the route
  segment: number; // index of the segment (point i → i + 1)
  along: number; // metres along the route up to `nearest`
};

// Local equirectangular projection around `origin` (good for a few km).
function project(origin: LatLng, p: LatLng) {
  const metersPerDegree = rad(1) * EARTH_RADIUS_M;
  const kx = Math.cos(rad(origin.lat)) * metersPerDegree;
  return { x: (p.lon - origin.lon) * kx, y: (p.lat - origin.lat) * metersPerDegree };
}

export function nearestOnRoute(
  point: LatLng,
  route: readonly LatLng[],
): NearestOnRoute | null {
  if (route.length === 0) {
    return null;
  }
  if (route.length === 1) {
    return {
      distanceM: haversine(point, route[0]),
      nearest: route[0],
      segment: 0,
      along: 0,
    };
  }
  const cumulative = cumulativeDistances(route);
  let best: NearestOnRoute | null = null;

  for (let i = 0; i < route.length - 1; i += 1) {
    const a = project(point, route[i]);
    const b = project(point, route[i + 1]);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    // The point is the origin (0, 0) of the projection.
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(a.x * dx + a.y * dy) / len2));
    const px = a.x + t * dx;
    const py = a.y + t * dy;
    const distance = Math.hypot(px, py);
    if (!best || distance < best.distanceM) {
      best = {
        distanceM: distance,
        nearest: {
          lat: route[i].lat + (route[i + 1].lat - route[i].lat) * t,
          lon: route[i].lon + (route[i + 1].lon - route[i].lon) * t,
        },
        segment: i,
        along: cumulative[i] + (cumulative[i + 1] - cumulative[i]) * t,
      };
    }
  }
  return best;
}

// ── Off-route detection ─────────────────────────────────────────────────────
// More than 40 m (running) or 60 m (cycling) away for 10 s in a row.
export const DEVIATION_THRESHOLD_M: Record<RouteSport, number> = {
  running: 40,
  cycling: 60,
};
export const DEVIATION_HOLD_MS = 10_000;

export type DeviationState = {
  off: boolean;
  // Since when the track has been outside the threshold (null = inside).
  outsideSince: number | null;
  distanceM: number | null;
};

export const INITIAL_DEVIATION: DeviationState = {
  off: false,
  outsideSince: null,
  distanceM: null,
};

// Feeds one fix. Inside the threshold clears it at once; outside it must last
// `DEVIATION_HOLD_MS` before `off` turns on. It never pauses or blocks the
// activity: this only informs the UI.
export function updateDeviation(
  state: DeviationState,
  sport: RouteSport,
  t: number,
  distanceToRouteM: number,
): DeviationState {
  const outside = distanceToRouteM > DEVIATION_THRESHOLD_M[sport];
  if (!outside) {
    return { off: false, outsideSince: null, distanceM: distanceToRouteM };
  }
  const since = state.outsideSince ?? t;
  return {
    off: t - since >= DEVIATION_HOLD_MS,
    outsideSince: since,
    distanceM: distanceToRouteM,
  };
}

// ── Privacy trim ────────────────────────────────────────────────────────────
export const PRIVACY_TRIM_M = 200;

// Cuts `meters` off both ends of a track (the server does it for other
// viewers; the UI uses it for the owner's "what others see" preview and the
// tests). A track not longer than twice the trim shows nothing.
export function trimEnds<T extends LatLng>(points: readonly T[], meters = PRIVACY_TRIM_M): T[] {
  if (points.length < 2) {
    return [];
  }
  const cumulative = cumulativeDistances(points);
  const total = cumulative[cumulative.length - 1];
  if (total <= meters * 2) {
    return [];
  }
  const from = meters;
  const to = total - meters;
  const out: T[] = [];

  const interpolate = (at: number): T => {
    let i = 1;
    while (i < cumulative.length - 1 && cumulative[i] < at) {
      i += 1;
    }
    const span = cumulative[i] - cumulative[i - 1];
    const t = span === 0 ? 0 : (at - cumulative[i - 1]) / span;
    const a = points[i - 1];
    const b = points[i];
    return { ...a, lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t };
  };

  out.push(interpolate(from));
  for (let i = 0; i < points.length; i += 1) {
    if (cumulative[i] > from && cumulative[i] < to) {
      out.push(points[i]);
    }
  }
  out.push(interpolate(to));
  return out;
}

// ── Bounds ──────────────────────────────────────────────────────────────────
export type Bounds = { sw: LatLng; ne: LatLng };

export function boundsOf(points: readonly LatLng[]): Bounds | null {
  if (points.length === 0) {
    return null;
  }
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;
  for (const p of points) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLon = Math.min(minLon, p.lon);
    maxLon = Math.max(maxLon, p.lon);
  }
  return { sw: { lat: minLat, lon: minLon }, ne: { lat: maxLat, lon: maxLon } };
}
