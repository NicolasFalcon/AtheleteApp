import type { StyleSpecification } from '@maplibre/maplibre-react-native';

// The one map style of Ruta (handoff: "geografía desaturada en lino (Light) o
// carbón (Dark), recorrido en Ember"). Vector tiles from OpenFreeMap (no key;
// OpenMapTiles schema). No labels: the design draws none, so no glyphs are
// needed. Colours are the ones of `images/ruta-map-*.svg`.
//
// Tiles: OpenFreeMap ToS allow commercial use and ask for no key; the map must
// show "OpenFreeMap © OpenMapTiles Data from OpenStreetMap" (the attribution
// button of MapLibre does it). If its availability is ever not enough, swap the
// `TILES_URL` for MapTiler (key in the env, never in git): nothing else changes.
// TODO(route-wire): decide the production tile provider (ROUTE_PLAN §6).
const TILES_URL = 'https://tiles.openfreemap.org/planet';

export type RouteMapMode = 'light' | 'dark';

type Palette = {
  background: string;
  park: string;
  water: string;
  minor: string;
  main: string;
  primary: string;
  path: string;
};

const PALETTES: Record<RouteMapMode, Palette> = {
  light: {
    background: '#E8E6E1',
    park: '#DCDED3',
    water: '#D3DAE1',
    minor: '#F4F3EF',
    main: '#FBFAF7',
    primary: '#FFFFFF',
    path: '#EFEDE8',
  },
  dark: {
    background: '#181715',
    park: '#1B1E1A',
    water: '#121920',
    minor: '#23211F',
    main: '#2C2A27',
    primary: '#322F2B',
    path: '#201E1C',
  },
};

// Ember of the route and its soft halo (same in both modes).
export const ROUTE_EMBER = '#FF5B1F';

const roadClass = (...classes: string[]) => ['in', ['get', 'class'], ['literal', classes]] as const;

// Road width per zoom, scaled from the sample maps (2,9 / 5,8 / 7,2 px).
const width = (base: number) =>
  ['interpolate', ['exponential', 1.6], ['zoom'], 11, base * 0.12, 14, base * 0.45, 16, base * 0.9, 18, base * 2.2] as const;

export function routeMapStyle(mode: RouteMapMode): StyleSpecification {
  const c = PALETTES[mode];
  return {
    version: 8,
    name: `ATHELETE Ruta · ${mode}`,
    sources: {
      openmaptiles: { type: 'vector', url: TILES_URL },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': c.background } },
      {
        id: 'landcover-green',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landcover',
        filter: ['in', ['get', 'class'], ['literal', ['grass', 'wood', 'farmland']]],
        paint: { 'fill-color': c.park },
      },
      {
        id: 'park',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'park',
        paint: { 'fill-color': c.park },
      },
      {
        id: 'landuse-green',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landuse',
        filter: ['in', ['get', 'class'], ['literal', ['park', 'cemetery', 'pitch', 'playground', 'stadium']]],
        paint: { 'fill-color': c.park },
      },
      {
        id: 'water',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'water',
        paint: { 'fill-color': c.water },
      },
      {
        id: 'waterway',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'waterway',
        paint: { 'line-color': c.water, 'line-width': width(6) as never },
      },
      {
        id: 'roads-path',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        filter: roadClass('path', 'track', 'pedestrian') as never,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': c.path, 'line-width': width(1.6) as never },
      },
      {
        id: 'roads-minor',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        filter: roadClass('minor', 'service', 'tertiary', 'busway') as never,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': c.minor, 'line-width': width(2.9) as never },
      },
      {
        id: 'roads-main',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        filter: roadClass('secondary', 'primary') as never,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': c.main, 'line-width': width(5.8) as never },
      },
      {
        id: 'roads-primary',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        filter: roadClass('trunk', 'motorway') as never,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': c.primary, 'line-width': width(7.2) as never },
      },
    ],
  } as StyleSpecification;
}
