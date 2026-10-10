// Number formats of Ruta (Spanish: decimal comma, thousands dot).

// 5,24 (running, 2 decimals) / 42,1 (cycling, 1 decimal).
export function formatKm(distanceM: number, decimals = 2): string {
  return (Math.max(0, distanceM) / 1000).toFixed(decimals).replace('.', ',');
}

// 24:26 or 1:32:40.
export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const x = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(x).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// 5:02 (the unit "/km" is drawn separately). "—" while unknown.
export function formatPace(secPerKm: number | null): string {
  if (secPerKm === null || !Number.isFinite(secPerKm)) {
    return '—';
  }
  const total = Math.round(secPerKm);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function formatSpeed(kmh: number | null): string {
  return kmh === null || !Number.isFinite(kmh) ? '—' : kmh.toFixed(1).replace('.', ',');
}

export function formatElevation(meters: number): string {
  return `+${Math.round(Math.max(0, meters))}`;
}

export const KIND_LABEL = {
  loop: 'Circuito',
  out_and_back: 'Ida y vuelta',
  point_to_point: 'Punto a punto',
} as const;

export const SURFACE_LABEL = {
  mixed: 'Mixta',
  asphalt: 'Asfalto',
  trail: 'Tierra',
} as const;
