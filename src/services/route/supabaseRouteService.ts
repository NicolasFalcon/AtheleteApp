import AsyncStorage from '@react-native-async-storage/async-storage';
import { createUuid } from '@app/lib/uuid';
import { parseCreatePost } from '@app/features/social/feedMappers';
import {
  alignToNow,
  buildPlannedPayload,
  buildSavePayload,
  isRetryableFailure,
  mapGenerateError,
  parseActivityList,
  parseGenerateResponse,
  parseOutdoorMonth,
  parsePlannedRoutes,
  parseRouteForViewer,
  parseSaveResult,
  parseSavedPlanned,
  parseTodayActivity,
  parseWriteResult,
  saveErrorCopy,
  type RouteSaveError,
  type SavePayload,
} from '@app/features/route/routeMappers';
import {
  REJECTED_KEY,
  addRejected,
  cleanTrack,
  parseRejected,
  removeRejected,
  serializeRejected,
  type RejectedSave,
} from '@app/features/route/rejectedSaves';
import {
  QUEUE_KEY,
  enqueue,
  flush,
  hasPending,
  parseQueue,
  serializeQueue,
  type QueuedSave,
  type SendOutcome,
} from '@app/features/route/routeQueue';
import {
  parsePersonalBests,
  parseSetBest,
  validateManualBest,
} from '@app/features/route/routeRecords';
import type { RouteActivity } from '@app/features/route/routeTypes';
import { RouteServiceError, type RouteService } from '@app/services/route/routeService';
import { getSupabaseClient } from '@app/services/supabase/client';

// Supabase implementation of `RouteService` (fase 5c). The RPCs and the Edge
// Function are described in docs/backend/ROUTE_RPC_SHAPES.md; the pure parts
// (mapping, queue, errors) live in `features/route` and are tested there.

function client() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new RouteServiceError('not_configured', 'Supabase no está configurado');
  }
  return supabase;
}

const deviceTimeZone = (): string | undefined => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
};

// ── Save queue (AsyncStorage), one operation at a time ─────────────────────
let queueLock: Promise<unknown> = Promise.resolve();

function withQueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queueLock.then(task, task);
  queueLock = run.catch(() => undefined);
  return run;
}

async function readQueue(): Promise<QueuedSave[]> {
  try {
    return parseQueue(await AsyncStorage.getItem(QUEUE_KEY));
  } catch {
    return [];
  }
}

async function writeQueue(queue: readonly QueuedSave[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, serializeQueue(queue));
  } catch {
    // Without storage the activity stays in memory only; nothing else to do.
  }
}

// ── Rejected saves (kept for the person to retry or discard) ───────────────
async function readRejected(): Promise<RejectedSave[]> {
  try {
    return parseRejected(await AsyncStorage.getItem(REJECTED_KEY));
  } catch {
    return [];
  }
}

async function writeRejected(list: readonly RejectedSave[]): Promise<void> {
  try {
    await AsyncStorage.setItem(REJECTED_KEY, serializeRejected(list));
  } catch {
    // Without storage there is nothing else to do.
  }
}

async function keepRejected(payload: SavePayload, error: RouteSaveError, distanceM: number) {
  await withQueue(async () =>
    writeRejected(
      addRejected(await readRejected(), {
        clientId: payload.client_id,
        payload,
        error,
        message: saveErrorCopy(error),
        rejectedAt: Date.now(),
        distanceM,
      }),
    ),
  );
}

// One save_route_activity call, sorted into saved / rejected / retry.
// A hung request counts as "no network": the same client_id makes the next
// attempt safe even if this one did reach the server.
const SAVE_TIMEOUT_MS = 25_000;

async function sendSave(payload: SavePayload): Promise<SendOutcome> {
  let answer;
  try {
    answer = await Promise.race([
      client().rpc('save_route_activity', { _payload: payload }),
      new Promise<null>(resolve => setTimeout(() => resolve(null), SAVE_TIMEOUT_MS)),
    ]);
  } catch {
    return { kind: 'retry' };
  }
  if (!answer) {
    return { kind: 'retry' };
  }
  const { data, error } = answer;
  if (error) {
    return isRetryableFailure(error as { message?: string; code?: string; status?: number })
      ? { kind: 'retry' }
      : { kind: 'rejected', error: 'unknown' };
  }
  const result = parseSaveResult(data);
  return result.ok ? { kind: 'saved', result } : { kind: 'rejected', error: result.error };
}

// Server numbers (distance, climb, splits are recomputed there) for what was
// just saved; the local ones stand in when that read fails.
async function readBack(
  local: RouteActivity,
  saved: { activityId: string; countedAsWorkout: boolean; pointsAwarded: number },
): Promise<RouteActivity> {
  const merged: RouteActivity = {
    ...local,
    id: saved.activityId,
    countedAsWorkout: saved.countedAsWorkout,
    pointsAwarded: saved.pointsAwarded,
    pending: false,
  };
  try {
    const { data, error } = await client().rpc('get_route_for_viewer', {
      _activity_id: saved.activityId,
    });
    const full = error ? null : parseRouteForViewer(data).activity;
    if (!full) {
      return merged;
    }
    return {
      ...full,
      // What only the client knows (ELLIE's line, and the points when the
      // server read came back without a track).
      ellieLine: local.ellieLine,
      points: full.points.length > 1 ? full.points : local.points,
      newBest: full.newBest ?? local.newBest,
      // A generated route that was never saved is not known to the server.
      plannedRouteId: full.plannedRouteId ?? local.plannedRouteId,
      countedAsWorkout: saved.countedAsWorkout,
      pointsAwarded: saved.pointsAwarded,
      isOwner: true,
      pending: false,
    };
  } catch {
    return merged;
  }
}

async function myId(): Promise<string | null> {
  const { data } = await client().auth.getSession();
  return data.session?.user.id ?? null;
}

// The viewer RPC says who owns the activity; whether that is me decides if the
// screen offers privacy, delete and share.
function withOwnership(activity: RouteActivity | null, me: string | null): RouteActivity | null {
  if (!activity || activity.isOwner !== undefined) {
    return activity;
  }
  return { ...activity, isOwner: activity.owner ? activity.owner.id === me : true };
}

export const supabaseRouteService: RouteService = {
  // ── Tus rutas ───────────────────────────────────────────────────────────
  async getSavedRoutes() {
    const { data, error } = await client().rpc('get_my_planned_routes');
    if (error) {
      throw error;
    }
    return parsePlannedRoutes(data);
  },

  async saveRoute(route) {
    const { data, error } = await client().rpc('save_planned_route', {
      _payload: buildPlannedPayload(route),
    });
    if (error) {
      throw error;
    }
    const saved = parseSavedPlanned(data, route);
    if (!saved.route) {
      throw new RouteServiceError(saved.error ?? 'unknown');
    }
    return saved.route;
  },

  async renameRoute(id, name) {
    const { data, error } = await client().rpc('rename_planned_route', { _id: id, _name: name });
    if (error) {
      throw error;
    }
    const result = parseWriteResult(data);
    if (!result.ok) {
      throw new RouteServiceError(result.error);
    }
  },

  async deleteRoute(id) {
    const { data, error } = await client().rpc('delete_planned_route', { _id: id });
    if (error) {
      throw error;
    }
    const result = parseWriteResult(data);
    if (!result.ok) {
      throw new RouteServiceError(result.error);
    }
  },

  // ── generate-route ──────────────────────────────────────────────────────
  async generateRoute(params) {
    const supabase = client();
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      throw new RouteServiceError('unauthorized');
    }
    const { data, error } = await supabase.functions.invoke('generate-route', {
      body: {
        sport: params.sport,
        origin: { lat: params.origin.lat, lon: params.origin.lon },
        target_km: params.targetKm,
        kind: params.kind,
        elevation: params.elevation,
        surface: params.surface,
        seed: params.seed,
      },
    });
    if (error) {
      // FunctionsHttpError: the answer of the function is in `context`.
      const response = (error as { context?: unknown }).context as
        | { status?: number; json?: () => Promise<unknown> }
        | undefined;
      if (response && typeof response.status === 'number') {
        const body = await response.json?.().catch(() => null);
        throw new RouteServiceError(mapGenerateError(response.status, body));
      }
      throw new RouteServiceError(mapGenerateError(null, null));
    }
    const result = parseGenerateResponse(
      data,
      { sport: params.sport, kind: params.kind },
      'Ruta generada',
      `gen-${params.seed}-${Date.now()}`,
    );
    if (!result.ok) {
      // A 200 with an {error} body is also a code of the function.
      throw new RouteServiceError(mapGenerateError(200, data) === 'unknown' ? result.error : mapGenerateError(200, data));
    }
    return result.route;
  },

  // ── Activities ──────────────────────────────────────────────────────────
  async saveActivity(original) {
    const now = Date.now();
    const clientId = original.clientId ?? createUuid();
    const activity = alignToNow(original, now);
    const payload = buildSavePayload(activity, clientId);
    // Written before the call: if the app dies mid-request the next start
    // sends it again with the same client_id (the server answers with the
    // activity it already has).
    await withQueue(async () => writeQueue(enqueue(await readQueue(), payload, now)));
    const outcome = await sendSave(payload);
    if (outcome.kind === 'saved') {
      await withQueue(async () => {
        const queue = await readQueue();
        await writeQueue(queue.filter(item => item.clientId !== clientId));
      });
      return readBack({ ...activity, clientId }, outcome.result);
    }
    if (outcome.kind === 'rejected') {
      // Never discarded: it moves from the retry queue to the rejected list.
      await keepRejected(payload, outcome.error, activity.distanceM);
      await withQueue(async () => {
        const queue = await readQueue();
        await writeQueue(queue.filter(item => item.clientId !== clientId));
      });
      throw new RouteServiceError(outcome.error, saveErrorCopy(outcome.error));
    }
    // No network: it stays in the queue and goes up later.
    return { ...activity, id: clientId, clientId, pending: true };
  },

  async getActivity(id) {
    // An activity that only exists on this device (queued) has no server row.
    const queue = await withQueue(readQueue);
    if (hasPending(queue, id)) {
      return null;
    }
    const { data, error } = await client().rpc('get_route_for_viewer', { _activity_id: id });
    if (error) {
      throw error;
    }
    return withOwnership(parseRouteForViewer(data).activity, await myId());
  },

  async getTodayActivity() {
    const tz = deviceTimeZone();
    const { data, error } = await client().rpc('get_today_route_activity', tz ? { _tz: tz } : {});
    if (error) {
      throw error;
    }
    return parseTodayActivity(data);
  },

  async getRecentActivities(limit, userId) {
    const supabase = client();
    const id = userId ?? (await supabase.auth.getSession()).data.session?.user.id;
    if (!id) {
      throw new RouteServiceError('unauthorized');
    }
    const { data, error } = await supabase.rpc('get_recent_activities', {
      _user_id: id,
      _limit: limit,
    });
    if (error) {
      throw error;
    }
    const me = await myId();
    // Someone else's profile: whatever comes back is a viewer's trimmed copy.
    return parseActivityList(data).map(item =>
      userId && userId !== me ? { ...item, isOwner: false } : (withOwnership(item, me) as RouteActivity),
    );
  },

  async getOutdoorMonth(userId) {
    const supabase = client();
    const id = userId ?? (await supabase.auth.getSession()).data.session?.user.id;
    if (!id) {
      throw new RouteServiceError('unauthorized');
    }
    const tz = deviceTimeZone();
    const { data, error } = await supabase.rpc('get_outdoor_month', {
      _user_id: id,
      ...(tz ? { _tz: tz } : {}),
    });
    if (error) {
      throw error;
    }
    return parseOutdoorMonth(data);
  },

  async updatePrivacy(activityId, visibility, hideEndpoints) {
    const { data, error } = await client().rpc('update_route_activity_privacy', {
      _activity_id: activityId,
      _visibility: visibility,
      _hide_endpoints: hideEndpoints,
    });
    if (error) {
      throw error;
    }
    const result = parseWriteResult(data);
    if (!result.ok) {
      throw new RouteServiceError(result.error);
    }
  },

  async deleteActivity(activityId) {
    // Still in the queue (never reached the server): just drop it.
    const queue = await withQueue(readQueue);
    if (hasPending(queue, activityId)) {
      await withQueue(async () =>
        writeQueue((await readQueue()).filter(item => item.clientId !== activityId)),
      );
      return;
    }
    const { data, error } = await client().rpc('delete_route_activity', {
      _activity_id: activityId,
    });
    if (error) {
      throw error;
    }
    const result = parseWriteResult(data);
    if (!result.ok) {
      throw new RouteServiceError(result.error);
    }
  },

  // ── Records ─────────────────────────────────────────────────────────────
  async getPersonalBests() {
    const { data, error } = await client().rpc('get_route_personal_bests');
    if (error) {
      throw error;
    }
    return parsePersonalBests(data);
  },

  async setPersonalBest({ sport, distanceKey, timeSec, achievedAt }) {
    if (validateManualBest(sport, distanceKey, timeSec) !== 'ok') {
      throw new RouteServiceError('too_fast');
    }
    const { data, error } = await client().rpc('set_route_personal_best', {
      _sport: sport,
      _distance_key: distanceKey,
      _time_sec: Math.round(timeSec),
      _achieved_at: achievedAt,
    });
    if (error) {
      throw error;
    }
    const result = parseSetBest(data);
    if (!result.ok) {
      throw new RouteServiceError(result.error);
    }
  },

  // ── Comunidad ───────────────────────────────────────────────────────────
  async shareToCommunity(activityId) {
    const { data, error } = await client().rpc('create_post', {
      _type: 'route',
      _source_id: activityId,
    });
    if (error) {
      throw error;
    }
    const result = parseCreatePost(data);
    if (!result.ok) {
      throw new RouteServiceError(result.error);
    }
    return { postId: result.postId, created: result.created };
  },

  // ── Pending saves ───────────────────────────────────────────────────────
  flushPending() {
    return withQueue(async () => {
      const queue = await readQueue();
      if (queue.length === 0) {
        return 0;
      }
      const report = await flush(queue, sendSave, Date.now());
      for (const item of report.rejected) {
        const entry = queue.find(queued => queued.clientId === item.clientId);
        if (entry) {
          await writeRejected(
            addRejected(await readRejected(), {
              clientId: item.clientId,
              payload: entry.payload,
              error: item.error,
              message: saveErrorCopy(item.error),
              rejectedAt: Date.now(),
              distanceM: 0,
            }),
          );
        }
      }
      await writeQueue(report.queue);
      return report.saved.length;
    });
  },

  getRejected() {
    return withQueue(readRejected);
  },

  async retryRejected(clientId) {
    const entry = (await withQueue(readRejected)).find(item => item.clientId === clientId);
    if (!entry) {
      throw new RouteServiceError('not_found', 'Esa actividad ya no está en el teléfono.');
    }
    // An impossible stretch is cut out first: that is what the server refused.
    const payload = entry.error === 'impossible_speed' ? cleanTrack(entry.payload) : entry.payload;
    const outcome = await sendSave(payload);
    if (outcome.kind === 'saved') {
      await withQueue(async () => writeRejected(removeRejected(await readRejected(), clientId)));
      return { activityId: outcome.result.activityId };
    }
    if (outcome.kind === 'rejected') {
      await keepRejected(payload, outcome.error, entry.distanceM);
      throw new RouteServiceError(outcome.error, saveErrorCopy(outcome.error));
    }
    throw new RouteServiceError('network', 'Sin conexión. Inténtalo de nuevo cuando tengas red.');
  },

  async discardRejected(clientId) {
    await withQueue(async () => writeRejected(removeRejected(await readRejected(), clientId)));
  },
};

