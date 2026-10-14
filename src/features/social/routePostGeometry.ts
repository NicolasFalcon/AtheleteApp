import type { LatLng } from '@app/features/route/routeTypes';

// Fits the trimmed polyline of a route post into a box (the map area of the
// post) as an SVG path. No map tiles: the post draws the route cut out on the
// page, as the design does. Pure, so it is tested.

export type FittedRoute = {
  d: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
};

// Equirectangular: longitude shrinks with the cosine of the latitude.
export function fitPolyline(
  points: readonly LatLng[],
  box: { width: number; height: number; padding: number; bottomPadding?: number },
): FittedRoute | null {
  if (points.length < 2) {
    return null;
  }
  const meanLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
  const kx = Math.cos((meanLat * Math.PI) / 180);
  const xs = points.map(p => p.lon * kx);
  const ys = points.map(p => -p.lat);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1e-9;
  const spanY = maxY - minY || 1e-9;
  const availW = box.width - box.padding * 2;
  const availH = box.height - box.padding - (box.bottomPadding ?? box.padding);
  const scale = Math.min(availW / spanX, availH / spanY);
  const offX = box.padding + (availW - spanX * scale) / 2;
  const offY = box.padding + (availH - spanY * scale) / 2;
  const mapped = points.map((_, i) => ({
    x: offX + (xs[i] - minX) * scale,
    y: offY + (ys[i] - minY) * scale,
  }));
  const d = mapped
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join('');
  return { d, start: mapped[0], end: mapped[mapped.length - 1] };
}
