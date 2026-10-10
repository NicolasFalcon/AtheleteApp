import { cumulativeDistances } from '@app/features/route/routeGeo';
import type { TrackerState } from '@app/features/route/routeTracker';
import { trackerActiveSec, trackerElevation } from '@app/features/route/routeTracker';
import type { RoutePoint, RouteActivity, RouteSplit, RouteVisibility } from '@app/features/route/routeTypes';
import { formatPace, formatSpeed } from '@app/features/route/routeFormat';

// Turns a finished tracker into the activity shown in the result.
// TODO(route-wire): the server recomputes distance, elevation, splits and
// calories from the uploaded track; this is what the app shows meanwhile.

// Per km when running, per 10 km when cycling. The fastest is `best`.
export function splitsFromTrack(state: TrackerState): RouteSplit[] {
  const points = state.points;
  if (points.length < 2) {
    return [];
  }
  const cumulative = cumulativeDistances(points);
  const block = state.sport === 'running' ? 1000 : 10_000;
  const rows: { label: string; value: string; secPerM: number }[] = [];
  let from = 0;
  let fromT = points[0].t ?? 0;
  let index = 0;
  for (let i = 1; i < points.length; i += 1) {
    while (cumulative[i] - from >= block) {
      // Interpolate the time at the block boundary.
      const prev = cumulative[i - 1];
      const frac = (from + block - prev) / (cumulative[i] - prev || 1);
      const t = (points[i - 1].t ?? 0) + frac * ((points[i].t ?? 0) - (points[i - 1].t ?? 0));
      const sec = (t - fromT) / 1000;
      index += 1;
      rows.push({
        label: state.sport === 'running' ? `${index}` : `${(index - 1) * 10}–${index * 10}`,
        value:
          state.sport === 'running'
            ? formatPace(sec / (block / 1000))
            : formatSpeed(((block / 1000) / sec) * 3600),
        secPerM: sec / block,
      });
      from += block;
      fromT = t;
    }
  }
  if (rows.length === 0) {
    return [];
  }
  const fastest = Math.min(...rows.map(row => row.secPerM));
  const slowest = Math.max(...rows.map(row => row.secPerM));
  return rows.map(row => ({
    label: row.label,
    value: row.value,
    fill: Math.round(100 - ((row.secPerM - fastest) / (slowest - fastest || 1)) * 45),
    best: row.secPerM === fastest && rows.length > 1,
  }));
}

function titleFor(state: TrackerState): string {
  const hour = new Date(state.startedAt ?? Date.now()).getHours();
  const part = hour < 12 ? 'de mañana' : hour < 19 ? 'de tarde' : 'de noche';
  return state.sport === 'running' ? `Carrera ${part}` : `Salida en bici ${part}`;
}

export function activityFromTracker(
  state: TrackerState,
  options: { visibility: RouteVisibility; hideEndpoints: boolean; plannedRouteId: string | null },
): RouteActivity {
  const movingSec = Math.round(trackerActiveSec(state));
  return {
    id: `act-${state.startedAt ?? Date.now()}`,
    sport: state.sport,
    title: titleFor(state),
    startedAt: state.startedAt ?? Date.now(),
    movingSec,
    distanceM: state.distanceM,
    elevationGainM: trackerElevation(state),
    avgHr: null,
    calories: Math.round((state.distanceM / 1000) * (state.sport === 'running' ? 62 : 24)),
    points: state.points,
    splits: splitsFromTrack(state),
    plannedRouteId: options.plannedRouteId,
    newBest: null,
    ellieLine: null,
    visibility: options.visibility,
    hideEndpoints: options.hideEndpoints,
  };
}

// The two stretches (first and last PRIVACY_TRIM_M) the owner sees dotted grey
// because others do not see them. The server applies the real trim.
export function hiddenEnds(points: readonly RoutePoint[], trimM: number): RoutePoint[][] {
  if (points.length < 2) {
    return [];
  }
  const cumulative = cumulativeDistances(points);
  const total = cumulative[cumulative.length - 1];
  if (total <= trimM * 2) {
    return [[...points]];
  }
  let head = 0;
  while (head < points.length - 1 && cumulative[head] <= trimM) {
    head += 1;
  }
  let tail = points.length - 1;
  while (tail > 0 && total - cumulative[tail] <= trimM) {
    tail -= 1;
  }
  return [points.slice(0, head + 1), points.slice(tail)];
}
