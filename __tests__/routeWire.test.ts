import {
  ORS_ATTRIBUTION,
  alignToNow,
  buildPlannedPayload,
  buildSavePayload,
  canRetryGenerate,
  generateErrorCopy,
  isRetryableFailure,
  isSavedRoute,
  localDateOf,
  mapGenerateError,
  parseActivity,
  parseActivityList,
  parseGenerateResponse,
  parseOutdoorMonth,
  parsePlannedRoute,
  parsePlannedRoutes,
  parseRouteForViewer,
  parseSaveResult,
  parseSavedPlanned,
  parseTodayActivity,
  parseTrack,
  parseWriteResult,
  saveErrorCopy,
  serverStretches,
  splitsFromServer,
  trackPayload,
} from '../src/features/route/routeMappers';
import type { RouteActivity } from '../src/features/route/routeTypes';

const activityRow = (extra: Record<string, unknown> = {}) => ({
  id: 'a1',
  sport: 'running',
  title: 'Carrera de tarde',
  started_at: '2026-10-13T20:00:00.000Z',
  ended_at: '2026-10-13T20:30:00.000Z',
  moving_sec: 1800,
  distance_m: 5400,
  elevation_gain_m: 31,
  avg_hr: null,
  calories: null,
  splits: [
    { km: 1, sec: 330 },
    { km: 2, sec: 340 },
    { km: 3, sec: 320 },
    { km: 4, sec: 335 },
    { km: 5, sec: 332 },
    { km: 5.4, sec: 130 },
  ],
  visibility: 'friends',
  hide_endpoints: true,
  track: [
    [-34.58, -58.42, 20, 1000, 4],
    [-34.581, -58.421],
  ],
  pauses: [{ from: 5, to: 9 }],
  planned_route_id: null,
  ...extra,
});

describe('save_route_activity', () => {
  it('reads the result: counted_as_workout and points_awarded', () => {
    expect(parseSaveResult({ ok: true, activity_id: 'x', counted_as_workout: true, points_awarded: 50 })).toEqual({
      ok: true,
      activityId: 'x',
      countedAsWorkout: true,
      pointsAwarded: 50,
    });
    expect(parseSaveResult({ ok: true, activity_id: 'x', counted_as_workout: false })).toMatchObject({
      countedAsWorkout: false,
      pointsAwarded: 0,
    });
  });

  it('maps each server error and anything else to unknown', () => {
    (
      ['invalid_sport', 'track_too_short', 'track_too_long', 'duration_too_long', 'moving_exceeds_duration', 'impossible_speed'] as const
    ).forEach(error => {
      expect(parseSaveResult({ error })).toEqual({ ok: false, error });
      expect(saveErrorCopy(error).length).toBeGreaterThan(10);
    });
    expect(parseSaveResult({ error: 'something_new' })).toEqual({ ok: false, error: 'unknown' });
    expect(parseSaveResult(null)).toEqual({ ok: false, error: 'unknown' });
    expect(parseSaveResult({ ok: true })).toEqual({ ok: false, error: 'unknown' });
  });

  it('retries only transport problems and server hiccups', () => {
    expect(isRetryableFailure({ message: 'Network request failed' })).toBe(true);
    expect(isRetryableFailure({ status: 503 })).toBe(true);
    expect(isRetryableFailure({ status: 429 })).toBe(true);
    expect(isRetryableFailure({ status: 400 })).toBe(false);
    expect(isRetryableFailure({ code: '42501', message: 'denied' })).toBe(false);
    expect(isRetryableFailure({ code: 'PGRST301' })).toBe(false);
    expect(isRetryableFailure(null)).toBe(false);
  });

  it('builds the payload with the device local date, pauses and the full track', () => {
    const activity: RouteActivity = {
      id: 'c1',
      clientId: 'c1',
      sport: 'cycling',
      title: 'Salida',
      startedAt: new Date(2026, 9, 13, 23, 30).getTime(),
      endedAt: new Date(2026, 9, 14, 0, 10).getTime(),
      movingSec: 2000,
      distanceM: 10000,
      elevationGainM: 10,
      avgHr: null,
      calories: null,
      points: [
        { lat: -34.5, lon: -58.4, ele: 20.123, t: 1.4, accuracy: 3.25 },
        { lat: -34.51, lon: -58.41 },
      ],
      pauses: [{ from: 10, to: 20 }],
      splits: [],
      plannedRouteId: 'plan-local-1',
      newBest: null,
      ellieLine: null,
      visibility: 'public',
      hideEndpoints: false,
    };
    const payload = buildSavePayload(activity, 'c1');
    // 23:30 local belongs to the 13th even if UTC says the 14th.
    expect(payload.local_date).toBe('2026-10-13');
    expect(payload.client_id).toBe('c1');
    expect(payload.visibility).toBe('public');
    expect(payload.hide_endpoints).toBe(false);
    expect(payload.pauses).toEqual([{ from: 10, to: 20 }]);
    expect(payload.track).toEqual([
      [-34.5, -58.4, 20.1, 1, 3.3],
      [-34.51, -58.41, null, null, null],
    ]);
    // A plan that was never saved has no server id.
    expect(payload.planned_route_id).toBeNull();
    expect(buildSavePayload({ ...activity, plannedRouteId: '7d143a1f-0000-4000-8000-000000000001' }, 'c1').planned_route_id).toBe(
      '7d143a1f-0000-4000-8000-000000000001',
    );
    expect(localDateOf(new Date(2026, 0, 5, 1).getTime())).toBe('2026-01-05');
  });

  it('moves an outing that ends in the future (simulated engine) back to now', () => {
    const now = 1_000_000;
    const base = {
      startedAt: now - 1000,
      endedAt: now + 9000,
      pauses: [{ from: now + 1000, to: now + 2000 }],
      points: [{ lat: 0, lon: 0, t: now + 500 }, { lat: 0, lon: 0 }],
      movingSec: 10,
    } as unknown as RouteActivity;
    const moved = alignToNow(base, now);
    expect(moved.endedAt).toBe(now);
    expect(moved.startedAt).toBe(now - 10_000);
    expect(moved.pauses).toEqual([{ from: now - 8000, to: now - 7000 }]);
    expect(moved.points[0].t).toBe(now - 8500);
    expect(moved.points[1].t).toBeUndefined();
    // Already in the past: untouched.
    expect(alignToNow({ ...base, endedAt: now - 5 } as RouteActivity, now).startedAt).toBe(now - 1000);
  });

  it('writes the track as numbers', () => {
    expect(trackPayload([{ lat: 1.23456789, lon: 2, t: 5 }])).toEqual([[1.234568, 2, null, 5, null]]);
  });
});

describe('reading activities', () => {
  it('reads the track as arrays or objects, the splits and the pauses', () => {
    const activity = parseActivity(activityRow()) as RouteActivity;
    expect(activity.id).toBe('a1');
    expect(activity.points).toEqual([
      { lat: -34.58, lon: -58.42, ele: 20, t: 1000, accuracy: 4 },
      { lat: -34.581, lon: -58.421 },
    ]);
    expect(activity.pauses).toEqual([{ from: 5, to: 9 }]);
    expect(activity.visibility).toBe('friends');
    expect(activity.hideEndpoints).toBe(true);
    expect(activity.startedAt).toBe(Date.parse('2026-10-13T20:00:00.000Z'));
    expect(parseTrack([{ lat: 1, lng: 2, ele: 3 }, 'x', [1], null])).toEqual([{ lat: 1, lon: 2, ele: 3 }]);
  });

  it('reads the viewer copy: owner, planned name and a trimmed track', () => {
    const { activity, error } = parseRouteForViewer({
      ok: true,
      activity: activityRow({
        owner: { id: 'u2', name: 'Carlos', avatar_path: 'u2/a.jpg' },
        planned_route_name: 'Parque 5K',
        track: [],
        points: [[-34.5, -58.4], [-34.6, -58.4]],
      }),
    });
    expect(error).toBeNull();
    expect(activity?.owner).toEqual({ id: 'u2', name: 'Carlos', avatarPath: 'u2/a.jpg' });
    expect(activity?.plannedName).toBe('Parque 5K');
    expect(activity?.points).toHaveLength(2);
  });

  it('says why an activity cannot be read', () => {
    expect(parseRouteForViewer({ ok: false, error: 'not_allowed' })).toEqual({ activity: null, error: 'not_allowed' });
    expect(parseRouteForViewer({ error: 'not_found' })).toEqual({ activity: null, error: 'not_found' });
    expect(parseRouteForViewer({ error: 'x' })).toEqual({ activity: null, error: 'unknown' });
    expect(parseRouteForViewer(null).activity).toBeNull();
  });

  it('lists the recent ones and the one of today, ignoring broken rows', () => {
    expect(parseActivityList({ activities: [activityRow(), { nope: 1 }, activityRow({ id: 'a2' })] }).map(a => a.id)).toEqual(['a1', 'a2']);
    expect(parseActivityList([activityRow()])).toHaveLength(1);
    expect(parseActivityList(null)).toEqual([]);
    expect(parseTodayActivity(null)).toBeNull();
    expect(parseTodayActivity({ activity: null })).toBeNull();
    expect(parseTodayActivity({ activity: activityRow() })?.id).toBe('a1');
    expect(parseTodayActivity(activityRow())?.id).toBe('a1');
  });

  it('reads the new best of the activity', () => {
    const activity = parseActivity(activityRow({ new_best: { distance_key: '5k', best_sec: 1481 } })) as RouteActivity;
    expect(activity.newBest).toMatchObject({ title: '24:41', unit: '5K' });
    expect((parseActivity(activityRow({ new_best: { distance_key: '3k', best_sec: 9 } })) as RouteActivity).newBest).toBeNull();
  });

  it('reads the month of Al aire libre', () => {
    expect(parseOutdoorMonth({ run_km: 38.4, run_delta_km: -6.2, bike_km: '84.1' })).toEqual({
      runKm: 38.4,
      runDeltaKm: -6.2,
      bikeKm: 84.1,
    });
    expect(parseOutdoorMonth(null)).toEqual({ runKm: 0, runDeltaKm: 0, bikeKm: 0 });
  });
});

describe('splits from the server', () => {
  it('reads cumulative ends and lengths the same way', () => {
    expect(serverStretches([{ km: 1, sec: 300 }, { km: 2, sec: 310 }, { km: 2.5, sec: 150 }])).toEqual([
      { km: 1, sec: 300 },
      { km: 1, sec: 310 },
      { km: 0.5, sec: 150 },
    ]);
    expect(serverStretches([{ km: 1, sec: 300 }, { km: 1, sec: 310 }, { km: 0.5, sec: 150 }])).toHaveLength(3);
    expect(serverStretches('x')).toEqual([]);
  });

  it('shows pace per km when running, with the fastest as best', () => {
    const splits = splitsFromServer([{ km: 1, sec: 330 }, { km: 2, sec: 300 }, { km: 3, sec: 340 }], 'running');
    expect(splits.map(s => s.label)).toEqual(['KM 1', 'KM 2', 'KM 3']);
    expect(splits.map(s => s.value)).toEqual(['5:30', '5:00', '5:40']);
    expect(splits.find(s => s.best)?.label).toBe('KM 2');
    expect(splits[1].fill).toBe(100);
  });

  it('labels the last partial stretch with its length', () => {
    const splits = splitsFromServer([{ km: 1, sec: 300 }, { km: 1, sec: 300 }, { km: 0.4, sec: 130 }], 'running');
    expect(splits[2].label).toBe('0,40');
    expect(splits[2].value).toBe('5:25');
  });

  it('groups cycling every 10 km with km/h', () => {
    const rows = Array.from({ length: 12 }, () => ({ km: 1, sec: 130 }));
    const splits = splitsFromServer(rows, 'cycling');
    expect(splits.map(s => s.label)).toEqual(['0–10', '10–12']);
    expect(splits[0].value).toBe('27,7');
  });
});

describe('planned routes', () => {
  it('reads and writes a route', () => {
    const route = parsePlannedRoute({
      id: 'p1',
      name: 'Parque',
      sport: 'running',
      points: [[-34.5, -58.4], { lat: -34.6, lon: -58.5 }],
      distance_m: 4200.5,
      elevation_gain_m: null,
      kind: 'out_and_back',
      surface: 'trail',
      origin: 'manual',
    });
    expect(route).toMatchObject({ id: 'p1', distanceM: 4200.5, elevationGainM: 0, kind: 'out_and_back', surface: 'trail', origin: 'manual' });
    expect(route?.points).toEqual([{ lat: -34.5, lon: -58.4 }, { lat: -34.6, lon: -58.5 }]);
    expect(parsePlannedRoute({ id: 'p', sport: 'running', points: [[1, 1]] })).toBeNull();
    expect(parsePlannedRoutes({ routes: [route, { x: 1 }] })).toHaveLength(1);
    expect(parsePlannedRoutes(null)).toEqual([]);
    const payload = buildPlannedPayload(route!);
    expect(payload).toMatchObject({ name: 'Parque', distance_m: 4201, elevation_gain_m: null, origin: 'manual' });
    expect(payload.points[0]).toEqual([-34.5, -58.4]);
  });

  it('keeps the sent route when the server answers only an id', () => {
    const sent = parsePlannedRoute({ id: 'tmp', name: 'N', sport: 'running', points: [[1, 1], [2, 2]] })!;
    expect(parseSavedPlanned({ ok: true, id: 'srv' }, sent).route?.id).toBe('srv');
    expect(parseSavedPlanned({ ok: false, error: 'limit_reached' }, sent)).toEqual({ route: null, error: 'limit_reached' });
    expect(parseSavedPlanned({ ok: false, error: 'other' }, sent).error).toBe('unknown');
    expect(isSavedRoute('7d143a1f-0000-4000-8000-000000000001')).toBe(true);
    expect(isSavedRoute('gen-0-123')).toBe(false);
  });

  it('reads privacy, rename and delete results', () => {
    expect(parseWriteResult({ ok: true })).toEqual({ ok: true });
    expect(parseWriteResult({ ok: false, error: 'not_allowed' })).toEqual({ ok: false, error: 'not_allowed' });
    expect(parseWriteResult({ ok: false, error: 'xyz' })).toEqual({ ok: false, error: 'unknown' });
  });
});

describe('generate-route errors', () => {
  it('maps the codes of the function', () => {
    (['invalid_params', 'no_route_found', 'rate_limited', 'provider_unavailable', 'unsupported_kind'] as const).forEach(code => {
      expect(mapGenerateError(400, { error: code })).toBe(code);
      expect(generateErrorCopy(code).length).toBeGreaterThan(10);
    });
  });

  it('falls back on the HTTP status and on having no answer', () => {
    expect(mapGenerateError(null, null)).toBe('network');
    expect(mapGenerateError(401, {})).toBe('unauthorized');
    expect(mapGenerateError(429, null)).toBe('rate_limited');
    expect(mapGenerateError(503, 'oops')).toBe('provider_unavailable');
    expect(mapGenerateError(500, { error: 'weird' })).toBe('unknown');
  });

  it('retries only for hiccups, not for a bad configuration', () => {
    expect(canRetryGenerate('provider_unavailable')).toBe(true);
    expect(canRetryGenerate('network')).toBe(true);
    expect(canRetryGenerate('no_route_found')).toBe(false);
    expect(canRetryGenerate('rate_limited')).toBe(false);
    expect(canRetryGenerate('invalid_params')).toBe(false);
  });

  it('reads the generated route and a different seed is just another call', () => {
    const body = { routes: [{ polyline: [[-34.5, -58.4], [-34.51, -58.41], [-34.5, -58.4]], distance_m: 5012, elevation_gain_m: 22, surface: 'asphalt', kind: 'loop' }] };
    const result = parseGenerateResponse(body, { sport: 'running', kind: 'loop' }, 'Ruta generada', 'gen-1');
    expect(result.ok).toBe(true);
    expect(result.ok && result.route).toMatchObject({ id: 'gen-1', origin: 'ellie', distanceM: 5012, surface: 'asphalt', kind: 'loop' });
    expect(parseGenerateResponse({ routes: [] }, { sport: 'running', kind: 'loop' })).toEqual({ ok: false, error: 'no_route_found' });
    expect(ORS_ATTRIBUTION).toBe('© openrouteservice.org by HeiGIT | Map data © OpenStreetMap contributors');
  });
});
