import type { EllieLanguage } from '@app/features/ellie/ellieCopy';
import type { ExploreBadge, ExploreRoute } from '@app/features/route/routeTypes';

// Ruta copy by i18n key (es/en, profiles.language). Same pattern as
// workoutsCopy: "{n}" placeholders are replaced with `vars.n`.
const COPY = {
  'route.gen.option': { es: 'Opción {n}', en: 'Option {n}' },
  'route.gen.another': { es: 'Otra opción', en: 'Another option' },
  'route.gen.use': { es: 'Usar esta ruta', en: 'Use this route' },
  'route.save': { es: 'Guardar', en: 'Save' },
  'route.saved': { es: 'Guardada', en: 'Saved' },
  'route.save.done': { es: 'Ruta guardada en Tus rutas', en: 'Route saved to Your routes' },
  'route.save.limit': {
    es: 'Llegaste al límite de rutas guardadas. Elimina alguna para guardar otra.',
    en: 'You reached the saved routes limit. Delete one to save another.',
  },
  'route.save.failed': { es: 'No pudimos guardar la ruta', en: "We couldn't save the route" },
  'route.directions': { es: 'Cómo llegar', en: 'Get directions' },
  'route.directions.failed': { es: 'No pudimos abrir Mapas', en: "We couldn't open Maps" },
  'route.back': { es: 'Atrás', en: 'Back' },
  'route.tab.explore': { es: 'Explorar', en: 'Explore' },
  'route.tab.explore.hint': { es: 'Rutas conocidas y populares cerca de ti.', en: 'Known and popular routes near you.' },
  'route.explore.title': { es: 'Explorar', en: 'Explore' },
  'route.explore.locating': { es: 'Buscando tu ubicación…', en: 'Finding your location…' },
  'route.explore.loading': { es: 'Buscando rutas cerca…', en: 'Looking for routes nearby…' },
  'route.explore.count.one': { es: '{n} ruta cerca', en: '{n} route nearby' },
  'route.explore.count.other': { es: '{n} rutas cerca', en: '{n} routes nearby' },
  'route.explore.filter.all': { es: 'Todas', en: 'All' },
  'route.explore.filter.lt5': { es: '< 5 km', en: '< 5 km' },
  'route.explore.filter.5to10': { es: '5–10 km', en: '5–10 km' },
  'route.explore.filter.10to20': { es: '10–20 km', en: '10–20 km' },
  'route.explore.filter.20plus': { es: '20+ km', en: '20+ km' },
  'route.explore.filter.empty': {
    es: 'Ninguna ruta cerca en este rango. Prueba otra distancia.',
    en: 'No routes nearby in this range. Try another distance.',
  },
  'route.explore.empty.title': { es: 'No encontramos rutas cerca', en: 'No routes nearby' },
  'route.explore.empty.body': {
    es: 'No encontramos rutas cerca. Prueba a ampliar la distancia o genera una con ELLIE.',
    en: "We couldn't find routes nearby. Try a wider distance or generate one with ELLIE.",
  },
  'route.explore.empty.cta': { es: 'Planear ruta', en: 'Plan a route' },
  'route.explore.error.title': { es: 'No pudimos cargar las rutas', en: "We couldn't load routes" },
  'route.explore.error.network': {
    es: 'Sin conexión. Revisa tu red e inténtalo de nuevo.',
    en: "You're offline. Check your connection and try again.",
  },
  'route.explore.error.provider': {
    es: 'El servicio de mapas no responde ahora. Inténtalo en unos minutos.',
    en: 'The map service is not responding right now. Try again in a few minutes.',
  },
  'route.explore.error.quota': {
    es: 'Llegaste al límite de búsquedas de rutas por hoy. Vuelve mañana o genera una con ELLIE.',
    en: "You've reached today's route search limit. Come back tomorrow or generate one with ELLIE.",
  },
  'route.explore.error.unauthorized': {
    es: 'Tu sesión caducó. Vuelve a entrar para explorar rutas.',
    en: 'Your session expired. Sign in again to explore routes.',
  },
  'route.explore.error.unknown': {
    es: 'No pudimos cargar las rutas. Inténtalo de nuevo.',
    en: "We couldn't load the routes. Please try again.",
  },
  'route.explore.retry': { es: 'Reintentar', en: 'Try again' },
  'route.explore.osmDown': {
    es: 'OpenStreetMap no responde ahora: solo ves rutas de la comunidad.',
    en: 'OpenStreetMap is not responding: showing community routes only.',
  },
  'route.explore.noLocation.title': { es: 'Ubicación no disponible', en: 'Location unavailable' },
  'route.explore.noLocation.body': {
    es: 'Para ver rutas cerca de ti necesitamos tu ubicación precisa. Actívala en Ajustes.',
    en: 'To show routes near you we need your precise location. Turn it on in Settings.',
  },
  'route.explore.noLocation.cta': { es: 'Abrir Ajustes', en: 'Open Settings' },
  'route.explore.toStart': { es: 'a {d} km del inicio', en: '{d} km to the start' },
  'route.explore.startsHere': { es: 'empieza aquí', en: 'starts here' },
  'route.explore.athletes.one': { es: '{n} atleta', en: '{n} athlete' },
  'route.explore.athletes.other': { es: '{n} atletas', en: '{n} athletes' },
  'route.explore.elevation': { es: '{n} m desnivel', en: '{n} m gain' },
  'route.badge.popular': { es: 'Popular', en: 'Popular' },
  'route.badge.cycleway': { es: 'Ciclovía', en: 'Cycleway' },
  'route.badge.known': { es: 'Ruta conocida', en: 'Known route' },
  'route.badge.track': { es: 'Pista', en: 'Track' },
} as const satisfies Record<string, Record<EllieLanguage, string>>;

export type RouteCopyKey = keyof typeof COPY;

export function routeText(
  language: EllieLanguage,
  key: RouteCopyKey,
  vars: Record<string, string | number> = {},
): string {
  return COPY[key][language].replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export function badgeText(language: EllieLanguage, badge: ExploreBadge): string {
  return routeText(language, `route.badge.${badge}`);
}

// "12,4 km · 84 m desnivel · a 0,4 km del inicio · 4 atletas": the meta of
// an Explorar route (elevation and athletes only when they exist).
export function exploreMetaText(language: EllieLanguage, item: ExploreRoute, km: (m: number) => string): string {
  const parts = [`${km(item.route.distanceM)} km`];
  if (item.elevationGainM !== null) {
    parts.push(routeText(language, 'route.explore.elevation', { n: Math.round(item.elevationGainM) }));
  }
  if (item.distanceToStartM !== null) {
    parts.push(
      item.distanceToStartM < 100
        ? routeText(language, 'route.explore.startsHere')
        : routeText(language, 'route.explore.toStart', { d: km(item.distanceToStartM) }),
    );
  }
  if (item.source === 'community' && item.athletesCount > 0) {
    parts.push(
      routeText(
        language,
        item.athletesCount === 1 ? 'route.explore.athletes.one' : 'route.explore.athletes.other',
        { n: item.athletesCount },
      ),
    );
  }
  return parts.join(' · ');
}
