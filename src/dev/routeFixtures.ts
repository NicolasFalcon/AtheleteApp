import { SAMPLE_POLYLINES, type SamplePolyline } from '@app/dev/routeSamplePolylines';
import {
  cumulativeDistances,
  elevationGain,
  polylineDistance,
} from '@app/features/route/routeGeo';
import type {
  LatLng,
  PlannedRoute,
  RouteActivity,
  RouteGenerationParams,
  RoutePoint,
  RouteSplit,
  RouteSport,
} from '@app/features/route/routeTypes';
import type { OutdoorMonth, RouteService } from '@app/services/route/routeService';

// Sample data and the sample RouteService of Ruta (development only: the real
// app shows none of this; the screens are reached with athelete://dev/route).
// Routes are real street-following polylines of Palermo, Buenos Aires.
// TODO(route-wire): replace with the backend implementation of RouteService.

const toLatLng = (poly: SamplePolyline): LatLng[] => poly.map(([lat, lon]) => ({ lat, lon }));

export const SAMPLE_ORIGIN: LatLng = { lat: -34.5815, lon: -58.4225 };

// Synthetic, gentle elevation: Palermo is flat (~20 to 34 m).
function withElevation(points: LatLng[], base = 22, amp = 6, period = 900): RoutePoint[] {
  const cumulative = cumulativeDistances(points);
  return points.map((p, i) => ({
    ...p,
    ele: base + amp * Math.sin((cumulative[i] / period) * Math.PI * 2) + cumulative[i] / 1500,
  }));
}

export const SAMPLE_TRACKS = {
  parque5k: toLatLng(SAMPLE_POLYLINES.parque5k),
  rio5k: toLatLng(SAMPLE_POLYLINES.rio5k),
  ribera: toLatLng(SAMPLE_POLYLINES.ribera10k),
  tarde8k: toLatLng(SAMPLE_POLYLINES.tarde8k),
  domingo10k: toLatLng(SAMPLE_POLYLINES.domingo10k),
  bici42k: toLatLng(SAMPLE_POLYLINES.bici42k),
  manual: toLatLng(SAMPLE_POLYLINES.manual),
};

const KIND_BY_ID: Record<string, PlannedRoute['kind']> = {};

function plannedRoute(
  id: string,
  name: string,
  sport: RouteSport,
  points: LatLng[],
  origin: PlannedRoute['origin'],
  kind: PlannedRoute['kind'] = 'loop',
): PlannedRoute {
  KIND_BY_ID[id] = kind;
  return {
    id,
    name,
    sport,
    points,
    distanceM: polylineDistance(points),
    elevationGainM: elevationGain(withElevation(points)),
    kind,
    surface: 'mixed',
    origin,
  };
}

export const PLAN_A = plannedRoute('plan-a', 'Ruta generada', 'running', SAMPLE_TRACKS.parque5k, 'ellie');
export const PLAN_B = plannedRoute('plan-b', 'Ruta generada', 'running', SAMPLE_TRACKS.rio5k, 'ellie');
export const PLAN_BIKE = plannedRoute('plan-bike', 'Ruta generada', 'cycling', SAMPLE_TRACKS.bici42k, 'ellie');

export const SAVED_ROUTES: PlannedRoute[] = [
  plannedRoute('saved-1', 'Parque · 4K', 'running', SAMPLE_TRACKS.rio5k, 'ellie'),
  plannedRoute('saved-2', 'Ribera · 7K', 'running', SAMPLE_TRACKS.ribera, 'manual'),
];

// ── Activities ──────────────────────────────────────────────────────────────
function paceSplits(
  points: LatLng[],
  sport: RouteSport,
  movingSec: number,
  bestIndex: number,
): RouteSplit[] {
  const total = polylineDistance(points);
  if (sport === 'cycling') {
    const out: RouteSplit[] = [];
    const speeds = [26.1, 28.4, 25.7, 29.8, 28.2];
    const fills = [58, 74, 50, 86, 70];
    const chunks = Math.ceil(total / 10_000);
    for (let i = 0; i < chunks; i += 1) {
      const from = i * 10;
      const to = Math.min((i + 1) * 10, total / 1000);
      out.push({
        label: i === chunks - 1 && to % 10 !== 0 ? `${from}–${to.toFixed(1).replace('.', ',')}` : `${from}–${to}`,
        value: String(speeds[i % speeds.length]).replace('.', ','),
        fill: fills[i % fills.length],
        best: i === bestIndex,
      });
    }
    return out;
  }
  const km = Math.floor(total / 1000);
  const avg = movingSec / (total / 1000);
  const out: RouteSplit[] = [];
  for (let i = 0; i < km; i += 1) {
    const sec = Math.round(avg + Math.sin(i * 1.7) * 9 - i * 0.6);
    out.push({
      label: `KM ${i + 1}`,
      value: `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`,
      fill: Math.max(30, Math.min(90, Math.round(100 - (sec - avg + 20) * 1.6))),
      best: i === bestIndex,
    });
  }
  const rest = total - km * 1000;
  if (rest > 100) {
    const sec = Math.round((avg * rest) / 1000);
    out.push({
      label: (rest / 1000).toFixed(2).replace('.', ','),
      value: `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`,
      fill: 31,
    });
  }
  return out;
}

function activity(args: {
  id: string;
  sport: RouteSport;
  title: string;
  agoMin: number;
  track: LatLng[];
  speedMs: number;
  plannedRouteId?: string | null;
  newBest?: RouteActivity['newBest'];
  ellieLine?: string | null;
  bestSplit: number;
  avgHr: number;
}): RouteActivity {
  const points = withElevation(args.track);
  const distanceM = polylineDistance(args.track);
  const movingSec = Math.round(distanceM / args.speedMs);
  return {
    id: args.id,
    sport: args.sport,
    title: args.title,
    startedAt: Date.now() - args.agoMin * 60_000,
    movingSec,
    distanceM,
    elevationGainM: elevationGain(points),
    avgHr: args.avgHr,
    calories: Math.round((distanceM / 1000) * (args.sport === 'running' ? 62 : 24)),
    points,
    splits: paceSplits(args.track, args.sport, movingSec, args.bestSplit),
    plannedRouteId: args.plannedRouteId ?? null,
    newBest: args.newBest ?? null,
    ellieLine: args.ellieLine ?? null,
    visibility: 'friends',
    hideEndpoints: true,
  };
}

export const ACTIVITY_RUN = activity({
  id: 'act-run',
  sport: 'running',
  title: 'Carrera de tarde',
  agoMin: 130,
  track: SAMPLE_TRACKS.tarde8k,
  speedMs: 1000 / 301,
  bestSplit: 6,
  avgHr: 148,
  newBest: { title: '24:41', unit: '5K', detail: '38 s menos que tu mejor 5K' },
  ellieLine:
    'Fuiste 18 s/km más rápido que tu promedio reciente. Mañana tienes piernas programadas. Puedo reducir el volumen si quieres.',
});

export const ACTIVITY_BIKE = activity({
  id: 'act-bike',
  sport: 'cycling',
  title: 'Salida en bici de mañana',
  agoMin: 640,
  track: SAMPLE_TRACKS.bici42k,
  speedMs: 27.3 / 3.6,
  bestSplit: 3,
  avgHr: 141,
  ellieLine:
    'Buena base aeróbica para la semana. Mañana tienes tren superior: tus piernas pueden descansar.',
});

export const ACTIVITY_PLANNED = activity({
  id: 'act-planned',
  sport: 'running',
  title: 'Carrera de tarde',
  agoMin: 130,
  track: SAMPLE_TRACKS.parque5k,
  speedMs: 1000 / 302,
  plannedRouteId: PLAN_A.id,
  bestSplit: 3,
  avgHr: 149,
  ellieLine: 'Seguiste tu ruta casi entera: un desvío corto en el km 2. Ritmo estable de principio a fin.',
});

export const ACTIVITY_CARLOS = {
  ...activity({
    id: 'act-carlos',
    sport: 'running',
    title: 'Rodaje del domingo',
    agoMin: 190,
    track: SAMPLE_TRACKS.domingo10k,
    speedMs: 1000 / 308,
    bestSplit: 8,
    avgHr: 151,
  }),
  ellieLine: null,
};

export const SAMPLE_ACTIVITIES: Record<string, RouteActivity> = {
  [ACTIVITY_RUN.id]: ACTIVITY_RUN,
  [ACTIVITY_BIKE.id]: ACTIVITY_BIKE,
  [ACTIVITY_PLANNED.id]: ACTIVITY_PLANNED,
  [ACTIVITY_CARLOS.id]: ACTIVITY_CARLOS,
};

export const SAMPLE_OUTDOOR_MONTH: OutdoorMonth = { runKm: 38.4, runDeltaKm: 6.2, bikeKm: 84.1 };

// ── Sample RouteService ─────────────────────────────────────────────────────
// Keeps its own copy of the saved routes in memory (reset with the dev
// scenario). TODO(route-wire): the real service talks to Supabase.
let saved: PlannedRoute[] = [...SAVED_ROUTES];
let generated = 0;

export function resetSampleRoutes(options: { empty?: boolean } = {}) {
  saved = options.empty ? [] : [...SAVED_ROUTES];
  generated = 0;
}

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export const sampleRouteService: RouteService = {
  async getSavedRoutes() {
    return [...saved];
  },
  async saveRoute(route) {
    const next = { ...route, id: route.id.startsWith('saved-') ? route.id : `saved-${Date.now()}` };
    saved = [next, ...saved.filter(item => item.id !== next.id)];
    return next;
  },
  async renameRoute(id, name) {
    saved = saved.map(item => (item.id === id ? { ...item, name } : item));
  },
  async deleteRoute(id) {
    saved = saved.filter(item => item.id !== id);
  },
  async generateRoute(params: RouteGenerationParams) {
    // ~1,5 s like the prototype; the sample alternates two routes.
    await wait(1500);
    generated += 1;
    if (params.sport === 'cycling') {
      return { ...PLAN_BIKE, id: `plan-bike-${params.seed}` };
    }
    const base = params.seed % 2 === 0 ? PLAN_A : PLAN_B;
    return { ...base, id: `${base.id}-${params.seed}-${generated}` };
  },
  async saveActivity(activityToSave) {
    return activityToSave;
  },
  async getActivity(id) {
    return SAMPLE_ACTIVITIES[id] ?? null;
  },
  async getTodayActivity() {
    return ACTIVITY_RUN;
  },
  async getRecentActivities(limit) {
    return [ACTIVITY_RUN, ACTIVITY_BIKE, ACTIVITY_CARLOS].slice(0, limit);
  },
  async getOutdoorMonth() {
    return SAMPLE_OUTDOOR_MONTH;
  },
  async shareToCommunity(activityId) {
    return { postId: `fx-route-${activityId}` };
  },
};
