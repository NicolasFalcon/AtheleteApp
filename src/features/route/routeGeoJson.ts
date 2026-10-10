import { haversine } from '@app/features/route/routeGeo';
import type { LatLng } from '@app/features/route/routeTypes';

// GeoJSON helpers for MapLibre ([lon, lat] order).
export type LineFC = GeoJSON.FeatureCollection<GeoJSON.LineString>;
export type PointFC = GeoJSON.FeatureCollection<GeoJSON.Point, { id: string; kind?: string }>;
export type PolygonFC = GeoJSON.FeatureCollection<GeoJSON.Polygon>;

export const EMPTY_LINE: LineFC = { type: 'FeatureCollection', features: [] };

export function lineFeature(points: readonly LatLng[]): LineFC {
  if (points.length < 2) {
    return EMPTY_LINE;
  }
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: points.map(p => [p.lon, p.lat]) },
      },
    ],
  };
}

export function pointFeatures(
  items: ReadonlyArray<{ id: string; point: LatLng; kind?: string }>,
): PointFC {
  return {
    type: 'FeatureCollection',
    features: items.map(item => ({
      type: 'Feature',
      properties: { id: item.id, kind: item.kind },
      geometry: { type: 'Point', coordinates: [item.point.lon, item.point.lat] },
    })),
  };
}

// A circle of `radiusM` metres around `center` as a polygon (target ring of
// "Planear ruta").
export function circlePolygon(center: LatLng, radiusM: number, steps = 64): PolygonFC {
  const ring: GeoJSON.Position[] = [];
  const dLat = radiusM / 111_195;
  const dLon = radiusM / (111_195 * Math.cos((center.lat * Math.PI) / 180));
  for (let i = 0; i <= steps; i += 1) {
    const a = (i / steps) * Math.PI * 2;
    ring.push([center.lon + Math.cos(a) * dLon, center.lat + Math.sin(a) * dLat]);
  }
  return {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } }],
  };
}

// The camera needs a zoom for a radius: how many metres a pixel covers.
export function zoomForRadius(radiusM: number, viewportPx: number, latitude: number): number {
  const metersPerPixelAtZoom0 = 156_543.03 * Math.cos((latitude * Math.PI) / 180);
  const targetMetersPerPixel = (radiusM * 2) / viewportPx;
  return Math.max(3, Math.min(19, Math.log2(metersPerPixelAtZoom0 / targetMetersPerPixel)));
}

export function distanceBetween(a: LatLng, b: LatLng): number {
  return haversine(a, b);
}
