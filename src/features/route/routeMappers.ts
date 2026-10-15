import { formatDuration, formatPace, formatSpeed } from '@app/features/route/routeFormat';
import type {
  LatLng,
  PlannedRoute,
  RouteActivity,
  RouteKind,
  RoutePause,
  RoutePoint,
  RouteSplit,
  RouteSport,
  RouteVisibility,
} from '@app/features/route/routeTypes';
import type { OutdoorMonth } from '@app/services/route/routeService';

// Pure mapping between the Ruta RPCs / generate-route and the app models.
// Contracts: docs/backend/ROUTE_RPC_SHAPES.md. The shapes marked [confirmar]
// there are read tolerantly (several key names, objects or arrays); anything
// unreadable drops that row instead of the whole list.

type Json = Record<string, unknown>;

function asRecord(value: unknown): Json | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Json)
    : null;
}
const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;
const asNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  // numeric columns can come as text.
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
};
const firstNumber = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    const n = asNumber(value);
    if (n !== undefined) {
      return n;
    }
  }
  return undefined;
};

const SPORTS: readonly RouteSport[] = ['running', 'cycling'];
const VISIBILITIES: readonly RouteVisibility[] = ['me', 'friends', 'public'];
const KINDS: readonly RouteKind[] = ['loop', 'out_and_back', 'point_to_point'];

function oneOf<T extends string>(list: readonly T[], value: unknown): T | undefined {
  return typeof value === 'string' && (list as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

const toMs = (value: unknown): number | undefined => {
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return asNumber(value);
};

// ── Tracks ──────────────────────────────────────────────────────────────────
// The server stores [[lat, lon, ele, t_ms, acc], …]; a trimmed or simplified
// one may come as [[lat, lon], …] or as objects.
export function parsePoint(value: unknown): RoutePoint | null {
  if (Array.isArray(value)) {
    const lat = asNumber(value[0]);
    const lon = asNumber(value[1]);
    if (lat === undefined || lon === undefined) {
      return null;
    }
    const point: RoutePoint = { lat, lon };
    const ele = asNumber(value[2]);
    const t = asNumber(value[3]);
    const accuracy = asNumber(value[4]);
    if (ele !== undefined) {
      point.ele = ele;
    }
    if (t !== undefined) {
      point.t = t;
    }
    if (accuracy !== undefined) {
      point.accuracy = accuracy;
    }
    return point;
  }
  const row = asRecord(value);
  const lat = asNumber(row?.lat);
  const lon = firstNumber(row?.lon, row?.lng);
  if (!row || lat === undefined || lon === undefined) {
    return null;
  }
  const point: RoutePoint = { lat, lon };
  const ele = asNumber(row.ele);
  const t = asNumber(row.t);
  const accuracy = asNumber(row.accuracy ?? row.acc);
  if (ele !== undefined) {
    point.ele = ele;
  }
  if (t !== undefined) {
    point.t = t;
  }
  if (accuracy !== undefined) {
    point.accuracy = accuracy;
  }
  return point;
}

export function parseTrack(value: unknown): RoutePoint[] {
  return asArray(value).flatMap(item => {
    const point = parsePoint(item);
    return point ? [point] : [];
  });
}

export function parseLatLngs(value: unknown): LatLng[] {
  return parseTrack(value).map(({ lat, lon }) => ({ lat, lon }));
}

// What goes up: [lat, lon, ele, t_ms, acc] with the missing ones as null.
export function trackPayload(points: readonly RoutePoint[]): (number | null)[][] {
  return points.map(p => [
    round(p.lat, 6),
    round(p.lon, 6),
    p.ele === undefined ? null : round(p.ele, 1),
    p.t === undefined ? null : Math.round(p.t),
    p.accuracy === undefined ? null : round(p.accuracy, 1),
  ]);
}

function round(value: number, decimals: number): number {
  const k = 10 ** decimals;
  return Math.round(value * k) / k;
}

// ── Splits ──────────────────────────────────────────────────────────────────
// Server: [{km, sec}]. `km` is read as the end of the stretch when the values
// grow (1, 2, 3, 4.2) and as its length otherwise (1, 1, 1, 0.2).
type Stretch = { km: number; sec: number };

export function serverStretches(value: unknown): Stretch[] {
  const rows = asArray(value).flatMap(item => {
    const row = asRecord(item);
    const km = asNumber(row?.km);
    const sec = asNumber(row?.sec);
    return km !== undefined && sec !== undefined && km > 0 && sec > 0 ? [{ km, sec }] : [];
  });
  const cumulative = rows.length > 1 && rows.every((row, i) => i === 0 || row.km > rows[i - 1].km);
  if (!cumulative) {
    return rows;
  }
  return rows.map((row, i) => ({ km: row.km - (i === 0 ? 0 : rows[i - 1].km), sec: row.sec }));
}

type SplitRow = { label: string; value: string; secPerKm: number };

// Bars: the fastest stretch is the longest bar, `best` when there is more
// than one. Shared with the local splits shown before the server answers.
export function splitBars(rows: readonly SplitRow[]): RouteSplit[] {
  if (rows.length === 0) {
    return [];
  }
  const fastest = Math.min(...rows.map(row => row.secPerKm));
  const slowest = Math.max(...rows.map(row => row.secPerKm));
  return rows.map(row => ({
    label: row.label,
    value: row.value,
    fill: Math.round(100 - ((row.secPerKm - fastest) / (slowest - fastest || 1)) * 45),
    best: row.secPerKm === fastest && rows.length > 1,
  }));
}

const decimalComma = (n: number, digits: number) => n.toFixed(digits).replace('.', ',');

export function splitsFromServer(value: unknown, sport: RouteSport): RouteSplit[] {
  const stretches = serverStretches(value);
  if (stretches.length === 0) {
    return [];
  }
  if (sport === 'running') {
    let index = 0;
    return splitBars(
      stretches.map(stretch => {
        const perKm = stretch.sec / stretch.km;
        const whole = stretch.km >= 0.995;
        index += whole ? 1 : 0;
        return {
          label: whole ? `KM ${index}` : decimalComma(stretch.km, 2),
          value: formatPace(perKm),
          secPerKm: perKm,
        };
      }),
    );
  }
  // Cycling: every 10 km.
  const blocks: { from: number; km: number; sec: number }[] = [];
  let at = 0;
  stretches.forEach(stretch => {
    const block = Math.floor(at / 10 + 1e-9);
    blocks[block] = blocks[block] ?? { from: block * 10, km: 0, sec: 0 };
    blocks[block].km += stretch.km;
    blocks[block].sec += stretch.sec;
    at += stretch.km;
  });
  return splitBars(
    blocks
      .filter(Boolean)
      .filter(block => block.km > 0)
      .map(block => {
        const to = block.from + block.km;
        const kmh = block.km / (block.sec / 3600);
        return {
          label: `${block.from}–${Number.isInteger(to) ? to : decimalComma(to, 1)}`,
          value: formatSpeed(kmh),
          // Slower = more seconds per km, so the bars invert like the pace.
          secPerKm: block.sec / block.km,
        };
      }),
  );
}

// ── Personal bests (record shown in the result) ────────────────────────────
export const DISTANCE_KEYS = ['1k', '5k', '10k', '21k', '42k'] as const;
export type DistanceKey = (typeof DISTANCE_KEYS)[number];

export const DISTANCE_KM: Record<DistanceKey, number> = {
  '1k': 1,
  '5k': 5,
  '10k': 10,
  '21k': 21.0975,
  '42k': 42.195,
};

export const DISTANCE_LABEL: Record<DistanceKey, string> = {
  '1k': '1K',
  '5k': '5K',
  '10k': '10K',
  '21k': '21K',
  '42k': '42K',
};

export function isDistanceKey(value: unknown): value is DistanceKey {
  return typeof value === 'string' && (DISTANCE_KEYS as readonly string[]).includes(value);
}

function parseNewBest(value: unknown): RouteActivity['newBest'] {
  const row = asRecord(value);
  const key = row?.distance_key;
  const sec = asNumber(row?.best_sec);
  if (!row || !isDistanceKey(key) || sec === undefined) {
    return null;
  }
  return {
    title: formatDuration(sec),
    unit: DISTANCE_LABEL[key],
    detail: `Tu mejor tiempo en ${DISTANCE_LABEL[key]}`,
  };
}

// ── Activities ──────────────────────────────────────────────────────────────
function parseOwner(value: unknown): RouteActivity['owner'] {
  const row = asRecord(value);
  const id = asString(row?.id ?? row?.user_id);
  if (!row || !id) {
    return null;
  }
  return {
    id,
    name: asString(row.name) ?? 'Usuario',
    avatarPath: asString(row.avatar_path) ?? asString(row.avatar_key) ?? null,
  };
}

function parsePauses(value: unknown): RoutePause[] {
  return asArray(value).flatMap(item => {
    const row = asRecord(item);
    const from = asNumber(row?.from);
    const to = asNumber(row?.to);
    return from !== undefined && to !== undefined && to >= from ? [{ from, to }] : [];
  });
}

// One activity as get_route_for_viewer / get_recent_activities /
// get_today_route_activity return it. The track comes under `track`, `points`
// or `polyline` (the owner's full one or the viewer's trimmed one).
export function parseActivity(value: unknown, fallbackSport?: RouteSport): RouteActivity | null {
  const root = asRecord(value);
  // get_route_for_viewer may wrap the activity: {ok, activity: {...}}.
  const row = asRecord(root?.activity) ?? root;
  const id = asString(row?.id) ?? asString(row?.activity_id);
  if (!row || !id) {
    return null;
  }
  const sport = oneOf(SPORTS, row.sport) ?? fallbackSport;
  const startedAt = toMs(row.started_at);
  if (!sport || startedAt === undefined) {
    return null;
  }
  // The first of these that has points (a viewer copy may leave `track` empty).
  const points =
    [row.track, row.points, row.polyline, row.preview_track]
      .map(parseTrack)
      .find(list => list.length > 0) ?? [];
  const owner = parseOwner(row.owner);
  const movingSec = firstNumber(row.moving_sec) ?? 0;
  const endedAt = toMs(row.ended_at);
  return {
    id,
    clientId: asString(row.client_id),
    sport,
    title: asString(row.title) ?? (sport === 'running' ? 'Carrera' : 'Salida en bici'),
    startedAt,
    endedAt,
    movingSec,
    distanceM: firstNumber(row.distance_m) ?? 0,
    elevationGainM: firstNumber(row.elevation_gain_m) ?? 0,
    avgHr: firstNumber(row.avg_hr) ?? null,
    calories: firstNumber(row.calories) ?? null,
    points,
    pauses: parsePauses(row.pauses),
    splits: splitsFromServer(row.splits, sport),
    plannedRouteId: asString(row.planned_route_id) ?? null,
    plannedName: asString(row.planned_route_name ?? row.planned_name) ?? null,
    newBest: parseNewBest(row.new_best),
    ellieLine: null,
    visibility: oneOf(VISIBILITIES, row.visibility) ?? 'me',
    hideEndpoints: row.hide_endpoints !== false,
    countedAsWorkout: row.counted_as_workout === true ? true : undefined,
    pointsAwarded: firstNumber(row.points_awarded),
    owner,
    // get_route_for_viewer says it; otherwise a row with no owner is mine.
    isOwner: typeof row.is_owner === 'boolean' ? row.is_owner : owner === null ? true : undefined,
  };
}

export type RouteReadError = 'not_found' | 'not_allowed' | 'unknown';

// get_route_for_viewer: null activity with the reason when it cannot be read.
export function parseRouteForViewer(
  data: unknown,
): { activity: RouteActivity | null; error: RouteReadError | null } {
  const body = asRecord(data);
  if (body?.ok === false || (body && typeof body.error === 'string')) {
    const error = asString(body?.error);
    return {
      activity: null,
      error: error === 'not_found' || error === 'not_allowed' ? error : 'unknown',
    };
  }
  const activity = parseActivity(data);
  return { activity, error: activity ? null : 'not_found' };
}

// get_recent_activities: {ok, activities: [...]} or a bare list.
export function parseActivityList(data: unknown): RouteActivity[] {
  const body = asRecord(data);
  const rows = Array.isArray(data) ? data : asArray(body?.activities ?? body?.items);
  return rows.flatMap(item => {
    const activity = parseActivity(item);
    return activity ? [activity] : [];
  });
}

// get_today_route_activity: the activity, {activity: …} or null.
export function parseTodayActivity(data: unknown): RouteActivity | null {
  const body = asRecord(data);
  if (!body || body.activity === null) {
    return null;
  }
  return parseActivity(body.activity ?? body);
}

export function parseOutdoorMonth(data: unknown): OutdoorMonth {
  const body = asRecord(data);
  return {
    runKm: firstNumber(body?.run_km) ?? 0,
    runDeltaKm: firstNumber(body?.run_delta_km) ?? 0,
    bikeKm: firstNumber(body?.bike_km) ?? 0,
  };
}

// ── Saving an activity ─────────────────────────────────────────────────────
// Local date of the device (yyyy-mm-dd), not the UTC one: a run at 23:30
// belongs to that day.
export function localDateOf(ms: number): string {
  const date = new Date(ms);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}

// A finished outing must not end in the future (a phone clock that was
// ahead): the server would count that as a bad date, so the whole outing moves
// back until it ends now: start, end, pauses and the time of every fix shift by
// the same amount. With a correct clock nothing changes.
export function alignToNow(activity: RouteActivity, now: number): RouteActivity {
  const endedAt = activity.endedAt ?? activity.startedAt + activity.movingSec * 1000;
  const shift = endedAt - now;
  if (shift <= 0) {
    return activity;
  }
  return {
    ...activity,
    startedAt: activity.startedAt - shift,
    endedAt: endedAt - shift,
    pauses: (activity.pauses ?? []).map(p => ({ from: p.from - shift, to: p.to - shift })),
    points: activity.points.map(p => (p.t === undefined ? p : { ...p, t: p.t - shift })),
  };
}

export type SavePayload = {
  client_id: string;
  sport: RouteSport;
  title: string;
  started_at: string;
  ended_at: string;
  moving_sec: number;
  pauses: RoutePause[];
  track: (number | null)[][];
  planned_route_id: string | null;
  visibility: RouteVisibility;
  hide_endpoints: boolean;
  local_date: string;
};

export function buildSavePayload(activity: RouteActivity, clientId: string): SavePayload {
  const startedAt = activity.startedAt;
  const endedAt = activity.endedAt ?? startedAt + activity.movingSec * 1000;
  return {
    client_id: clientId,
    sport: activity.sport,
    title: activity.title,
    started_at: new Date(startedAt).toISOString(),
    ended_at: new Date(endedAt).toISOString(),
    moving_sec: Math.round(activity.movingSec),
    pauses: (activity.pauses ?? []).map(p => ({ from: Math.round(p.from), to: Math.round(p.to) })),
    track: trackPayload(activity.points),
    planned_route_id: activity.plannedRouteId && isUuid(activity.plannedRouteId) ? activity.plannedRouteId : null,
    visibility: activity.visibility,
    hide_endpoints: activity.hideEndpoints,
    local_date: localDateOf(startedAt),
  };
}

export const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

// A planned route that lives in Tus rutas (a server id). Generated and
// hand-drawn drafts have local ids until saved.
export const isSavedRoute = (id: string) => isUuid(id);

export type RouteSaveError =
  | 'invalid_sport'
  | 'track_too_short'
  | 'track_too_long'
  | 'duration_too_long'
  | 'moving_exceeds_duration'
  | 'impossible_speed'
  | 'unknown';

const SAVE_ERRORS: readonly RouteSaveError[] = [
  'invalid_sport',
  'track_too_short',
  'track_too_long',
  'duration_too_long',
  'moving_exceeds_duration',
  'impossible_speed',
];

export type SaveResult =
  | { ok: true; activityId: string; countedAsWorkout: boolean; pointsAwarded: number }
  | { ok: false; error: RouteSaveError };

export function parseSaveResult(data: unknown): SaveResult {
  const body = asRecord(data);
  const id = asString(body?.activity_id);
  if (body?.ok === true && id) {
    return {
      ok: true,
      activityId: id,
      countedAsWorkout: body.counted_as_workout === true,
      pointsAwarded: firstNumber(body.points_awarded) ?? 0,
    };
  }
  return { ok: false, error: oneOf(SAVE_ERRORS, body?.error) ?? 'unknown' };
}

export function saveErrorCopy(error: RouteSaveError): string {
  switch (error) {
    case 'track_too_short':
      return 'El recorrido es demasiado corto para guardarlo.';
    case 'track_too_long':
      return 'El recorrido tiene demasiados puntos para guardarlo.';
    case 'duration_too_long':
      return 'Una actividad no puede durar más de 24 horas.';
    case 'moving_exceeds_duration':
      return 'Los tiempos de la actividad no cuadran. No la pudimos guardar.';
    case 'impossible_speed':
      return 'La velocidad del recorrido no es posible para este deporte, así que no se guardó.';
    case 'invalid_sport':
      return 'Deporte no válido.';
    default:
      return 'No pudimos guardar la actividad.';
  }
}

// Whether a failed call is worth retrying later with the same client_id.
// Only transport problems and server hiccups are: an answer with a business
// error (`{ok:false,error}`) or a rejected request will fail the same way.
export type RpcFailure = { message?: string; code?: string; status?: number } | null | undefined;

export function isRetryableFailure(error: RpcFailure): boolean {
  if (!error) {
    return false;
  }
  const status = error.status;
  if (typeof status === 'number' && status > 0) {
    return status === 408 || status === 429 || status >= 500;
  }
  // Postgres/PostgREST codes (42xxx, 22xxx, 23xxx, PGRSTxxx…): a rejection.
  if (error.code && /^(\d{5}|PGRST\d+)$/.test(error.code)) {
    return false;
  }
  return true;
}

// ── Privacy and delete ─────────────────────────────────────────────────────
export type RouteWriteError = 'not_found' | 'not_allowed' | 'invalid_visibility' | 'unknown';

export type RouteWriteResult = { ok: true } | { ok: false; error: RouteWriteError };

export function parseWriteResult(data: unknown): RouteWriteResult {
  const body = asRecord(data);
  if (body?.ok === true) {
    return { ok: true };
  }
  const error = asString(body?.error);
  return {
    ok: false,
    error:
      error === 'not_found' || error === 'not_allowed' || error === 'invalid_visibility'
        ? error
        : 'unknown',
  };
}

// ── Planned routes ─────────────────────────────────────────────────────────
export function parsePlannedRoute(value: unknown): PlannedRoute | null {
  const root = asRecord(value);
  const row = asRecord(root?.route) ?? asRecord(root?.planned_route) ?? root;
  const id = asString(row?.id) ?? asString(row?.route_id) ?? asString(row?.planned_route_id);
  const sport = oneOf(SPORTS, row?.sport);
  const points = parseLatLngs(row?.points ?? row?.polyline);
  if (!row || !id || !sport || points.length < 2) {
    return null;
  }
  const surface = row.surface === 'asphalt' || row.surface === 'trail' ? row.surface : 'mixed';
  return {
    id,
    name: asString(row.name) ?? 'Ruta',
    sport,
    points,
    distanceM: firstNumber(row.distance_m) ?? 0,
    elevationGainM: firstNumber(row.elevation_gain_m) ?? 0,
    kind: oneOf(KINDS, row.kind) ?? 'loop',
    surface,
    origin: row.origin === 'manual' ? 'manual' : 'ellie',
  };
}

export function parsePlannedRoutes(data: unknown): PlannedRoute[] {
  const body = asRecord(data);
  const rows = Array.isArray(data) ? data : asArray(body?.routes ?? body?.planned_routes);
  return rows.flatMap(item => {
    const route = parsePlannedRoute(item);
    return route ? [route] : [];
  });
}

export function buildPlannedPayload(route: PlannedRoute) {
  return {
    name: route.name,
    sport: route.sport,
    points: route.points.map(p => [round(p.lat, 6), round(p.lon, 6)]),
    kind: route.kind,
    surface: route.surface,
    origin: route.origin,
    distance_m: Math.round(route.distanceM),
    elevation_gain_m: route.elevationGainM > 0 ? Math.round(route.elevationGainM) : null,
  };
}

// save_planned_route → the saved route; {ok:false,error} → null with the code.
export function parseSavedPlanned(
  data: unknown,
  sent: PlannedRoute,
): { route: PlannedRoute | null; error: 'limit_reached' | 'unknown' | null } {
  const body = asRecord(data);
  if (body?.ok === false || typeof body?.error === 'string') {
    const error = asString(body?.error);
    return { route: null, error: error === 'limit_reached' || error === 'limit' ? 'limit_reached' : 'unknown' };
  }
  const full = parsePlannedRoute(data);
  if (full) {
    return { route: full, error: null };
  }
  const id = asString(body?.id) ?? asString(body?.route_id) ?? asString(body?.planned_route_id);
  if (!id) {
    return { route: null, error: 'unknown' };
  }
  return {
    route: {
      ...sent,
      id,
      distanceM: firstNumber(body?.distance_m) ?? sent.distanceM,
    },
    error: null,
  };
}

// ── generate-route ─────────────────────────────────────────────────────────
export type GenerateRouteError =
  | 'invalid_params'
  | 'no_route_found'
  | 'rate_limited'
  | 'provider_unavailable'
  | 'unsupported_kind'
  | 'unauthorized'
  | 'network'
  | 'unknown';

const GENERATE_ERRORS: readonly GenerateRouteError[] = [
  'invalid_params',
  'no_route_found',
  'rate_limited',
  'provider_unavailable',
  'unsupported_kind',
];

// `status`: HTTP status when the function answered (null: no answer).
export function mapGenerateError(status: number | null, body: unknown): GenerateRouteError {
  const code = asString(asRecord(body)?.error);
  const known = oneOf(GENERATE_ERRORS, code);
  if (known) {
    return known;
  }
  if (status === null) {
    return 'network';
  }
  if (status === 401 || status === 403) {
    return 'unauthorized';
  }
  if (status === 429) {
    return 'rate_limited';
  }
  if (status === 502 || status === 503 || status === 504) {
    return 'provider_unavailable';
  }
  return 'unknown';
}

export function generateErrorCopy(error: GenerateRouteError): string {
  switch (error) {
    case 'invalid_params':
      return 'Esa configuración no es válida. Prueba con otra distancia.';
    case 'no_route_found':
      return 'No encontramos un recorrido así cerca de ti. Prueba otra distancia o recorrido.';
    case 'rate_limited':
      return 'Llegaste al límite de rutas generadas por hoy. Vuelve mañana o créala a mano.';
    case 'provider_unavailable':
      return 'El servicio de mapas no responde ahora. Inténtalo en unos minutos.';
    case 'unsupported_kind':
      return 'Ese tipo de recorrido aún no se puede generar. Prueba con un circuito.';
    case 'unauthorized':
      return 'Tu sesión caducó. Vuelve a entrar para generar rutas.';
    case 'network':
      return 'Sin conexión. Revisa tu red e inténtalo de nuevo.';
    default:
      return 'No pudimos generar la ruta. Inténtalo de nuevo.';
  }
}

// A repeated attempt only helps for a hiccup, not for a bad configuration.
export function canRetryGenerate(error: GenerateRouteError): boolean {
  return error === 'provider_unavailable' || error === 'network' || error === 'unknown';
}

export type GenerateResult =
  | { ok: true; route: PlannedRoute }
  | { ok: false; error: GenerateRouteError };

export function parseGenerateResponse(
  body: unknown,
  request: { sport: RouteSport; kind: RouteKind },
  name = 'Ruta generada',
  id = '',
): GenerateResult {
  const first = asRecord(asArray(asRecord(body)?.routes)[0]);
  const points = parseLatLngs(first?.polyline);
  if (!first || points.length < 2) {
    return { ok: false, error: 'no_route_found' };
  }
  const surface = first.surface === 'asphalt' || first.surface === 'trail' ? first.surface : 'mixed';
  return {
    ok: true,
    route: {
      id,
      name,
      sport: request.sport,
      points,
      distanceM: firstNumber(first.distance_m) ?? 0,
      elevationGainM: firstNumber(first.elevation_gain_m) ?? 0,
      kind: oneOf(KINDS, first.kind) ?? request.kind,
      surface,
      origin: 'ellie',
    },
  };
}

export const ORS_ATTRIBUTION =
  '© openrouteservice.org by HeiGIT | Map data © OpenStreetMap contributors';
