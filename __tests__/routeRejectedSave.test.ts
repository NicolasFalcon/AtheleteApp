import { cleanTrack, addRejected, parseRejected, serializeRejected, type RejectedSave } from '../src/features/route/rejectedSaves';
import type { SavePayload } from '../src/features/route/routeMappers';

const mockStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async (key: string) => mockStore.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      mockStore.set(key, value);
    },
    removeItem: async (key: string) => {
      mockStore.delete(key);
    },
  },
}));

const mockRpc = jest.fn();
jest.mock('../src/services/supabase/client', () => ({
  getSupabaseClient: () => ({ rpc: (...args: unknown[]) => mockRpc(...args) }),
}));

import { saveFinishedRecording } from '../src/features/route/finishRecording';
import { loadRecording, saveRecording } from '../src/features/route/activeRecording';
import { initialTracker, trackerReducer } from '../src/features/route/routeTracker';
import { supabaseRouteService } from '../src/services/route/supabaseRouteService';
import { RouteServiceError } from '../src/services/route/routeService';

const M = 1 / 111_195;
const T0 = Date.now() - 600_000;

function finishedState() {
  let s = trackerReducer(initialTracker('running'), { type: 'start', t: T0 });
  for (let i = 0; i < 40; i += 1) {
    s = trackerReducer(s, { type: 'fix', fix: { lat: i * 10 * M, lon: 0, t: T0 + i * 3000, accuracy: 5 } });
  }
  return trackerReducer(s, { type: 'finish', t: T0 + 120_000 });
}

const refused = { data: { ok: false, error: 'impossible_speed' }, error: null };
const network = { data: null, error: { message: 'Network request failed' } };
const ok = { data: { ok: true, activity_id: 'srv-1', counted_as_workout: true, points_awarded: 10 }, error: null };

beforeEach(() => {
  mockStore.clear();
  mockRpc.mockReset();
});

const args = () => ({
  service: supabaseRouteService,
  state: finishedState(),
  userId: 'u1',
  clientId: 'client-1',
  visibility: 'friends' as const,
  hideEndpoints: true,
  plannedRouteId: null,
});

describe('a refused activity is never thrown away', () => {
  it('impossible_speed: kept on the phone with its error, and the local recording is cleared only after', async () => {
    await saveRecording(
      { version: 1, savedAt: 1, userId: 'u1', clientId: 'client-1', visibility: 'friends', hideEndpoints: true, plan: null, state: { ...finishedState(), status: 'paused' } },
      undefined,
    );
    mockRpc.mockResolvedValue(refused);
    const outcome = await saveFinishedRecording(args());
    expect(outcome.kind).toBe('rejected');
    const kept = await supabaseRouteService.getRejected();
    expect(kept).toHaveLength(1);
    expect(kept[0]).toMatchObject({ clientId: 'client-1', error: 'impossible_speed' });
    expect(kept[0].message).toMatch(/velocidad/i);
    expect(kept[0].payload.track.length).toBeGreaterThan(2);
    // it is not in the retry queue (that would loop) and the recording is gone
    expect(await loadRecording('u1')).toBeNull();
  });

  it('a network error goes to the retry queue, not to the rejected list', async () => {
    mockRpc.mockResolvedValue(network);
    const outcome = await saveFinishedRecording(args());
    expect(outcome).toMatchObject({ kind: 'saved', activity: { pending: true } });
    expect(await supabaseRouteService.getRejected()).toHaveLength(0);
    mockRpc.mockResolvedValue(ok);
    expect(await supabaseRouteService.flushPending()).toBe(1);
  });

  it('a queued activity that the server later refuses moves to the rejected list', async () => {
    mockRpc.mockResolvedValue(network);
    await saveFinishedRecording(args());
    mockRpc.mockResolvedValue(refused);
    expect(await supabaseRouteService.flushPending()).toBe(0);
    expect(await supabaseRouteService.getRejected()).toHaveLength(1);
    // and it does not come back into the queue: a second flush sends nothing
    mockRpc.mockClear();
    await supabaseRouteService.flushPending();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('Reintentar cuts the impossible stretches and saves; the entry disappears', async () => {
    mockRpc.mockResolvedValueOnce(refused);
    await saveFinishedRecording(args());
    mockRpc.mockResolvedValueOnce(ok);
    const result = await supabaseRouteService.retryRejected('client-1');
    expect(result.activityId).toBe('srv-1');
    expect(await supabaseRouteService.getRejected()).toHaveLength(0);
  });

  it('Reintentar offline keeps it; refused again keeps it with the new error', async () => {
    mockRpc.mockResolvedValueOnce(refused);
    await saveFinishedRecording(args());
    mockRpc.mockResolvedValueOnce(network);
    await expect(supabaseRouteService.retryRejected('client-1')).rejects.toMatchObject({ code: 'network' });
    expect(await supabaseRouteService.getRejected()).toHaveLength(1);
    mockRpc.mockResolvedValueOnce({ data: { ok: false, error: 'moving_exceeds_duration' }, error: null });
    await expect(supabaseRouteService.retryRejected('client-1')).rejects.toBeInstanceOf(RouteServiceError);
    const kept = await supabaseRouteService.getRejected();
    expect(kept).toHaveLength(1);
    expect(kept[0].error).toBe('moving_exceeds_duration');
  });

  it('Descartar is the only way it leaves', async () => {
    mockRpc.mockResolvedValueOnce(refused);
    await saveFinishedRecording(args());
    await supabaseRouteService.discardRejected('client-1');
    expect(await supabaseRouteService.getRejected()).toHaveLength(0);
  });

  it('an unexpected failure leaves the recording untouched on the phone', async () => {
    await saveRecording(
      { version: 1, savedAt: 1, userId: 'u1', clientId: 'client-1', visibility: 'friends', hideEndpoints: true, plan: null, state: { ...finishedState(), status: 'paused' } },
      undefined,
    );
    const broken = { ...supabaseRouteService, saveActivity: async () => { throw new RouteServiceError('not_configured'); } };
    const outcome = await saveFinishedRecording({ ...args(), service: broken });
    expect(outcome.kind).toBe('failed');
    expect(await loadRecording('u1')).not.toBeNull();
  });
});

describe('rejected list helpers', () => {
  const payload = (track: (number | null)[][]): SavePayload => ({
    client_id: 'c',
    sport: 'running',
    title: 't',
    started_at: '',
    ended_at: '',
    moving_sec: 10,
    pauses: [],
    track,
    planned_route_id: null,
    visibility: 'me',
    hide_endpoints: true,
    local_date: '2026-01-01',
  });

  it('cleanTrack removes only the impossible stretches', () => {
    const row = (m: number, t: number) => [m * M, 0, null, t, 5];
    const cleaned = cleanTrack(payload([row(0, 0), row(10, 3000), row(500, 4000), row(20, 6000)]));
    expect(cleaned.track.map(r => Math.round(Number(r[0]) / M))).toEqual([0, 10, 20]);
  });

  it('the same client_id replaces its entry and the list survives serialisation', () => {
    const entry = (message: string): RejectedSave => ({
      clientId: 'c',
      payload: payload([[0, 0, null, 1, 5]]),
      error: 'impossible_speed',
      message,
      rejectedAt: 1,
      distanceM: 0,
    });
    const list = addRejected(addRejected([], entry('a')), entry('b'));
    expect(list).toHaveLength(1);
    expect(parseRejected(serializeRejected(list))[0].message).toBe('b');
    expect(parseRejected('garbage')).toEqual([]);
  });
});
