import { haversine } from '@app/features/route/routeGeo';
import type { RouteSaveError, SavePayload } from '@app/features/route/routeMappers';
import { saveErrorCopy } from '@app/features/route/routeMappers';
import { SERVER_MAX_SPEED_MS, SPEED_MARGIN } from '@app/features/route/routeTracker';

// Activities the server refused (impossible_speed, moving_exceeds_duration…).
// They are NOT thrown away: they stay on the phone with the error so the
// person can retry or discard them. Pure: the service keeps the JSON in
// AsyncStorage.

export type RejectedSave = {
  clientId: string;
  payload: SavePayload;
  error: RouteSaveError;
  message: string;
  rejectedAt: number;
  distanceM: number;
};

export const REJECTED_KEY = 'athelete.route.rejectedSaves.v1';
export const REJECTED_MAX = 10;

export function parseRejected(raw: string | null): RejectedSave[] {
  if (!raw) {
    return [];
  }
  let list: unknown;
  try {
    list = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(list)) {
    return [];
  }
  return list.flatMap((item): RejectedSave[] => {
    const row = item as Partial<RejectedSave> | null;
    if (
      !row ||
      typeof row.clientId !== 'string' ||
      !row.payload ||
      row.payload.client_id !== row.clientId ||
      !Array.isArray(row.payload.track)
    ) {
      return [];
    }
    const error = (row.error ?? 'unknown') as RouteSaveError;
    return [
      {
        clientId: row.clientId,
        payload: row.payload,
        error,
        message: typeof row.message === 'string' ? row.message : saveErrorCopy(error),
        rejectedAt: typeof row.rejectedAt === 'number' ? row.rejectedAt : 0,
        distanceM: typeof row.distanceM === 'number' ? row.distanceM : 0,
      },
    ];
  });
}

export function serializeRejected(list: readonly RejectedSave[]): string {
  return JSON.stringify(list);
}

// The same client_id replaces its earlier entry (a second rejection updates
// the error, it does not pile up).
export function addRejected(list: readonly RejectedSave[], entry: RejectedSave): RejectedSave[] {
  return [...list.filter(item => item.clientId !== entry.clientId), entry].slice(-REJECTED_MAX);
}

export function removeRejected(list: readonly RejectedSave[], clientId: string): RejectedSave[] {
  return list.filter(item => item.clientId !== clientId);
}

// Drops the points that make an impossible stretch (the same rule the client
// applies while recording), so a retry of an `impossible_speed` rejection can
// succeed. Track rows are [lat, lon, ele, t_ms, accuracy].
export function cleanTrack(payload: SavePayload): SavePayload {
  const limit = SERVER_MAX_SPEED_MS[payload.sport] * SPEED_MARGIN;
  const kept: (number | null)[][] = [];
  for (const row of payload.track) {
    const last = kept[kept.length - 1];
    if (!last) {
      kept.push(row);
      continue;
    }
    const dt = ((row[3] ?? 0) - (last[3] ?? 0)) / 1000;
    const step = haversine(
      { lat: Number(last[0]), lon: Number(last[1]) },
      { lat: Number(row[0]), lon: Number(row[1]) },
    );
    if (dt > 0 && step / dt <= limit) {
      kept.push(row);
    }
  }
  return { ...payload, track: kept };
}
