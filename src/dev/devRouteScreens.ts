import { StackActions } from '@react-navigation/native';
import { openHomeTabDev } from '@app/dev/devHomeNav';
import { setHomeRouteScenario } from '@app/dev/homeRouteScenario';
import { setRouteDevConfig } from '@app/dev/routeDevConfig';
import {
  ACTIVITY_BIKE,
  ACTIVITY_CARLOS,
  ACTIVITY_PLANNED,
  ACTIVITY_RUN,
  PLAN_A,
  resetSampleRoutes,
} from '@app/dev/routeFixtures';
import { waitForApp } from '@app/dev/devWorkoutsScreens';
import { DEFAULT_CONFIG, routeStore } from '@app/features/route/routeStore';
import { navigationRef } from '@app/navigation/navigationRef';

// Development only: the Ruta screens with sample data (nothing is read or
// written on the backend). athelete://dev/route?screen=<key>
type Scenario = {
  key: string;
  label: string;
  route: string;
  params?: Record<string, unknown>;
  setup?: () => void;
};

const reset = (patch: Parameters<typeof routeStore.reset>[0] = {}) => {
  setHomeRouteScenario(false);
  routeStore.reset(patch);
  setRouteDevConfig({});
  resetSampleRoutes();
};

const MID = 2400; // metres already covered in the pre-played scenarios

export const ROUTE_DEV_SCREENS: Scenario[] = [
  { key: 'select', label: 'ROUTE_01 · Selector', route: 'RoutePrep', setup: () => reset() },
  { key: 'prepRun', label: 'ROUTE_02 · Preparar correr', route: 'RoutePrep', setup: () => reset() },
  {
    key: 'prepBike',
    label: 'ROUTE_03 · Preparar bici',
    route: 'RoutePrep',
    setup: () => reset({ sport: 'cycling', config: DEFAULT_CONFIG.cycling }),
  },
  { key: 'privacy', label: 'ROUTE_04 · Privacidad', route: 'RoutePrep', params: { dev: 'privacy' }, setup: () => reset() },
  {
    key: 'gpsReady',
    label: 'ROUTE_22 · GPS listo con ruta',
    route: 'RoutePrep',
    setup: () => reset({ plan: PLAN_A }),
  },
  { key: 'planConfig', label: 'ROUTE_13 · Planear', route: 'RoutePrep', setup: () => reset({ mode: 'plan' }) },
  {
    key: 'planConfigBike',
    label: '14b · Planear bici',
    route: 'RoutePrep',
    setup: () => reset({ mode: 'plan', sport: 'cycling', config: DEFAULT_CONFIG.cycling }),
  },
  { key: 'planGenerating', label: 'ROUTE_14 · Generando', route: 'RouteGen', params: { dev: 'generating' }, setup: () => reset({ mode: 'plan' }) },
  { key: 'planResult', label: 'ROUTE_15 · Ruta generada', route: 'RouteGen', params: { dev: 'result' }, setup: () => reset({ mode: 'plan' }) },
  { key: 'planAlt', label: 'ROUTE_16 · Otra alternativa', route: 'RouteGen', params: { dev: 'alt' }, setup: () => reset({ mode: 'plan' }) },
  { key: 'planManual', label: 'ROUTE_17 · Creación manual', route: 'RouteManual', params: { dev: 'drawing' }, setup: () => reset({ mode: 'plan' }) },
  { key: 'planEdit', label: 'ROUTE_18 · Editar puntos', route: 'RouteManual', params: { dev: 'editing' }, setup: () => reset({ mode: 'plan' }) },
  { key: 'planPreview', label: 'ROUTE_19 · Preview final', route: 'RoutePreview', params: { dev: 'preview' }, setup: () => reset({ mode: 'plan', draft: PLAN_A }) },
  { key: 'saved', label: 'ROUTE_20 · Tus rutas', route: 'RouteSaved', setup: () => reset({ mode: 'plan' }) },
  {
    key: 'savedEmpty',
    label: 'ROUTE_21 · Tus rutas vacío',
    route: 'RouteSaved',
    setup: () => {
      reset({ mode: 'plan' });
      resetSampleRoutes({ empty: true });
    },
  },
  {
    key: 'activeRun',
    label: 'ROUTE_05 · En curso correr',
    route: 'RouteActive',
    params: { dev: 'live' },
    setup: () => {
      reset();
      setRouteDevConfig({ startM: MID, elapsedSec: 745, speedup: 1 });
    },
  },
  {
    key: 'activeBike',
    label: 'ROUTE_06 · En curso bici',
    route: 'RouteActive',
    params: { dev: 'live' },
    setup: () => {
      reset({ sport: 'cycling', config: DEFAULT_CONFIG.cycling });
      setRouteDevConfig({ startM: 9300, elapsedSec: 1260, speedup: 1 });
    },
  },
  {
    key: 'pause',
    label: 'ROUTE_07 · Pausa',
    route: 'RouteActive',
    params: { dev: 'paused' },
    setup: () => {
      reset();
      setRouteDevConfig({ startM: MID, elapsedSec: 745, startPaused: true, speedup: 1 });
    },
  },
  {
    key: 'follow',
    label: 'ROUTE_23 · Siguiendo ruta',
    route: 'RouteActive',
    params: { dev: 'live' },
    setup: () => {
      reset({ plan: PLAN_A });
      setRouteDevConfig({ startM: MID, elapsedSec: 745, speedup: 1 });
    },
  },
  {
    key: 'offRoute',
    label: 'ROUTE_24 · Desviado de ruta',
    route: 'RouteActive',
    params: { dev: 'live' },
    setup: () => {
      reset({ plan: PLAN_A });
      setRouteDevConfig({
        startM: MID,
        elapsedSec: 745,
        speedup: 1,
        detour: { startM: MID - 60, lengthM: 400, offsetM: 120 },
      });
    },
  },
  {
    key: 'noSignal',
    label: 'Estado · sin señal GPS',
    route: 'RouteActive',
    params: { dev: 'live' },
    setup: () => {
      reset();
      setRouteDevConfig({ startM: MID, elapsedSec: 745, speedup: 1, noSignal: true });
    },
  },
  {
    key: 'permissionDenied',
    label: 'Estado · ubicación denegada',
    route: 'RoutePrep',
    setup: () => {
      reset();
      setRouteDevConfig({ permission: 'denied' });
    },
  },
  {
    key: 'mapOffline',
    label: 'Estado · mapa sin conexión',
    route: 'RoutePrep',
    setup: () => {
      reset();
      setRouteDevConfig({ mapOffline: true });
    },
  },
  {
    key: 'resultRun',
    label: 'ROUTE_08 · Resultado correr',
    route: 'RouteResult',
    params: { activityId: ACTIVITY_RUN.id },
    setup: () => reset({ finished: ACTIVITY_RUN }),
  },
  {
    key: 'resultBike',
    label: 'ROUTE_09 · Resultado bici',
    route: 'RouteResult',
    params: { activityId: ACTIVITY_BIKE.id },
    setup: () => reset({ sport: 'cycling', finished: ACTIVITY_BIKE }),
  },
  {
    key: 'resultPlanned',
    label: 'ROUTE_25 · Resultado con ruta',
    route: 'RouteResult',
    params: { activityId: ACTIVITY_PLANNED.id },
    setup: () => reset({ finished: ACTIVITY_PLANNED, plan: PLAN_A }),
  },
  {
    key: 'resultViewer',
    label: 'ROUTE_11 · Detalle desde Comunidad',
    route: 'RouteResult',
    params: { activityId: ACTIVITY_CARLOS.id, viewer: true },
    setup: () => reset({ finished: ACTIVITY_CARLOS }),
  },
  {
    key: 'share',
    label: 'ROUTE_10 · Compartir',
    route: 'RouteShare',
    params: { activityId: ACTIVITY_RUN.id },
    setup: () => reset({ finished: ACTIVITY_RUN }),
  },
];

ROUTE_DEV_SCREENS.push(
  {
    key: 'profile',
    label: 'ROUTE_12 · Actividad reciente en Perfil',
    route: 'Profile',
    params: { devState: 'data' },
    setup: () => setHomeRouteScenario(true),
  },
  {
    key: 'homeCardActive',
    label: 'Inicio · tu ruta real',
    route: 'Home',
    setup: () => setHomeRouteScenario(true),
  },
  {
    key: 'homeCardInvite',
    label: 'Inicio · invitación',
    route: 'Home',
    setup: () => setHomeRouteScenario(false),
  },
);

export type RouteDevScreen = string;

export function isRouteDevScreen(value: string | null): value is RouteDevScreen {
  return ROUTE_DEV_SCREENS.some(screen => screen.key === value);
}

export async function openRouteDevScreen(key: string): Promise<boolean> {
  if (!__DEV__ || !(await waitForApp())) {
    return false;
  }
  const entry = ROUTE_DEV_SCREENS.find(screen => screen.key === key);
  if (!entry) {
    return false;
  }
  entry.setup?.();
  if (entry.route === 'Home') {
    return openHomeTabDev();
  }
  if ((navigationRef.getRootState()?.routes.length ?? 0) > 1) {
    navigationRef.dispatch(StackActions.popToTop());
  }
  navigationRef.dispatch(
    StackActions.push(entry.route as never, { ...entry.params, dev: entry.params?.dev ?? key } as never),
  );
  return true;
}

