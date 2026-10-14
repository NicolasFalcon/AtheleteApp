import { formatDuration, formatPace } from '@app/features/route/routeFormat';
import {
  DISTANCE_KEYS,
  DISTANCE_KM,
  DISTANCE_LABEL,
  isDistanceKey,
  type DistanceKey,
} from '@app/features/route/routeMappers';
import type { RouteSport } from '@app/features/route/routeTypes';

// Personal bests of Ruta (route_personal_bests): one per sport and distance.
// Pure formatting and parsing; the service reads and writes them.

export type RoutePersonalBest = {
  sport: RouteSport;
  distanceKey: DistanceKey;
  bestSec: number;
  activityId: string | null;
  source: 'auto' | 'manual';
  achievedAt: string | null;
};

type Json = Record<string, unknown>;
const asRecord = (value: unknown): Json | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : null;

export function parsePersonalBests(data: unknown): RoutePersonalBest[] {
  const body = asRecord(data);
  const rows = Array.isArray(data) ? data : Array.isArray(body?.bests) ? (body?.bests as unknown[]) : [];
  const out: RoutePersonalBest[] = [];
  rows.forEach(item => {
    const row = asRecord(item);
    const sec = Number(row?.best_sec);
    const sport = row?.sport;
    if (
      !row ||
      !isDistanceKey(row.distance_key) ||
      (sport !== 'running' && sport !== 'cycling') ||
      !Number.isFinite(sec) ||
      sec <= 0
    ) {
      return;
    }
    out.push({
      sport,
      distanceKey: row.distance_key,
      bestSec: sec,
      activityId: typeof row.activity_id === 'string' ? row.activity_id : null,
      source: row.source === 'manual' ? 'manual' : 'auto',
      achievedAt: typeof row.achieved_at === 'string' ? row.achieved_at : null,
    });
  });
  return out.sort(
    (a, b) => DISTANCE_KEYS.indexOf(a.distanceKey) - DISTANCE_KEYS.indexOf(b.distanceKey),
  );
}

// Pace per km of a best: 24:41 over 5K → "4:56".
export function bestPaceSecPerKm(distanceKey: DistanceKey, bestSec: number): number {
  return bestSec / DISTANCE_KM[distanceKey];
}

// "24:41" / "1:52:10" and "4:56 /km" (the cycling ones: "kmh").
export function formatBest(
  best: Pick<RoutePersonalBest, 'distanceKey' | 'bestSec' | 'sport'>,
): { label: string; time: string; pace: string } {
  const perKm = bestPaceSecPerKm(best.distanceKey, best.bestSec);
  const pace =
    best.sport === 'running'
      ? `${formatPace(perKm)} /km`
      : `${(3600 / perKm).toFixed(1).replace('.', ',')} km/h`;
  return { label: DISTANCE_LABEL[best.distanceKey], time: formatDuration(best.bestSec), pace };
}

// Manual entry: "24:41" or "1:52:10" (also "24.41" is NOT accepted: a typo
// would turn into hours). null when it is not a time.
export function parseTimeInput(text: string): number | null {
  const parts = text.trim().split(':');
  if (parts.length < 2 || parts.length > 3 || parts.some(part => !/^\d{1,2}$/.test(part))) {
    return null;
  }
  const numbers = parts.map(Number);
  const [h, m, s] = numbers.length === 3 ? numbers : [0, numbers[0], numbers[1]];
  if (m > 59 || s > 59) {
    return null;
  }
  const total = h * 3600 + m * 60 + s;
  return total > 0 ? total : null;
}

// The server rejects times faster than 2:30 min/km running or 72 km/h cycling;
// the app checks first to give the message right away.
export function validateManualBest(
  sport: RouteSport,
  distanceKey: DistanceKey,
  timeSec: number,
): 'ok' | 'too_fast' | 'too_slow' {
  const perKm = timeSec / DISTANCE_KM[distanceKey];
  const fastest = sport === 'running' ? 150 : 3600 / 72;
  if (perKm < fastest) {
    return 'too_fast';
  }
  // 24 h is the ceiling of any activity.
  return timeSec > 24 * 3600 ? 'too_slow' : 'ok';
}

export type SetBestError = 'too_fast' | 'invalid' | 'unknown';

export function parseSetBest(data: unknown): { ok: true } | { ok: false; error: SetBestError } {
  const body = asRecord(data);
  if (body?.ok === true) {
    return { ok: true };
  }
  const error = body?.error;
  if (error === 'impossible_speed' || error === 'too_fast') {
    return { ok: false, error: 'too_fast' };
  }
  if (typeof error === 'string' && /^invalid/.test(error)) {
    return { ok: false, error: 'invalid' };
  }
  return { ok: false, error: 'unknown' };
}
