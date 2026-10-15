import {
  PERSIST_INTERVAL_MS,
  createRecordingPersister,
  loadRecording,
  parseRecording,
  recordingKey,
  saveRecording,
  clearRecording,
  type ActiveRecording,
  type KeyValueStore,
} from '../src/features/route/activeRecording';
import {
  initialTracker,
  restoreTracker,
  trackerActiveSec,
  trackerReducer,
  type TrackerState,
} from '../src/features/route/routeTracker';

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async key => data.get(key) ?? null,
    setItem: async (key, value) => {
      data.set(key, value);
    },
    removeItem: async key => {
      data.delete(key);
    },
  };
}

const T0 = 1_000_000;
const M = 1 / 111_195;
const meta = {
  userId: 'u1',
  clientId: 'c1',
  visibility: 'friends' as const,
  hideEndpoints: true,
  plan: null,
};

function recordingState(points = 3): TrackerState {
  let s = trackerReducer(initialTracker('running'), { type: 'start', t: T0 });
  for (let i = 0; i < points; i += 1) {
    s = trackerReducer(s, { type: 'fix', fix: { lat: i * 20 * M, lon: 0, t: T0 + i * 6000, accuracy: 5 } });
  }
  return trackerReducer(s, { type: 'tick', t: T0 + points * 6000 });
}

describe('stored recording', () => {
  it('survives a round trip and belongs to its user', async () => {
    const store = memoryStore();
    const state = recordingState();
    await saveRecording({ ...meta, version: 1, savedAt: 5, state }, store);
    expect(store.data.has(recordingKey('u1'))).toBe(true);
    const loaded = await loadRecording('u1', store);
    expect(loaded?.clientId).toBe('c1');
    expect(loaded?.state.points).toHaveLength(3);
    expect(await loadRecording('someone-else', store)).toBeNull();
    await clearRecording('u1', store);
    expect(await loadRecording('u1', store)).toBeNull();
  });

  it('ignores corrupt or finished data', () => {
    expect(parseRecording('{not json', 'u1')).toBeNull();
    expect(parseRecording(JSON.stringify({ version: 2 }), 'u1')).toBeNull();
    const finished: ActiveRecording = {
      ...meta,
      version: 1,
      savedAt: 1,
      state: { ...recordingState(), status: 'finished' },
    };
    expect(parseRecording(JSON.stringify(finished), 'u1')).toBeNull();
  });

  it('what was recorded comes back after a restart: points, distance and active time', async () => {
    const store = memoryStore();
    const before = recordingState(5);
    await saveRecording({ ...meta, version: 1, savedAt: 1, state: before }, store);
    const loaded = await loadRecording('u1', store);
    const back = restoreTracker(loaded!.state);
    expect(back.status).toBe('paused');
    expect(back.points).toHaveLength(before.points.length);
    expect(back.distanceM).toBeCloseTo(before.distanceM, 3);
    expect(trackerActiveSec(trackerReducer(back, { type: 'tick', t: T0 + 10 * 60_000 }))).toBe(
      trackerActiveSec(before),
    );
  });
});

describe('createRecordingPersister', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const setup = () => {
    let clock = 1_000;
    const writes: ActiveRecording[] = [];
    const persister = createRecordingPersister(meta, {
      write: async recording => {
        writes.push(recording);
      },
      now: () => clock,
    });
    return { persister, writes, advance: (ms: number) => { clock += ms; jest.advanceTimersByTime(ms); } };
  };

  it('writes the first state at once and then at most once per interval', () => {
    const { persister, writes, advance } = setup();
    persister.update(recordingState(1));
    expect(writes).toHaveLength(1);
    // many point-by-point changes inside the interval: one trailing write, with the latest
    for (let i = 2; i < 12; i += 1) {
      advance(300);
      persister.update(recordingState(i));
    }
    expect(writes).toHaveLength(1);
    advance(PERSIST_INTERVAL_MS);
    expect(writes).toHaveLength(2);
    expect(writes[1].state.points).toHaveLength(11);
  });

  it('a pause or resume is written immediately', () => {
    const { persister, writes } = setup();
    const running = recordingState(2);
    persister.update(running);
    persister.update(trackerReducer(running, { type: 'pause', t: running.now }));
    expect(writes).toHaveLength(2);
    expect(writes[1].state.status).toBe('paused');
  });

  it('flush writes the latest state now (app going to the background)', async () => {
    const { persister, writes } = setup();
    persister.update(recordingState(1));
    persister.update(recordingState(4));
    await persister.flush();
    expect(writes[writes.length - 1].state.points).toHaveLength(4);
  });

  it('after close nothing else is written (the outing ended or was discarded)', async () => {
    const { persister, writes, advance } = setup();
    persister.update(recordingState(1));
    persister.update(recordingState(3));
    persister.close();
    advance(PERSIST_INTERVAL_MS * 2);
    await persister.flush();
    persister.update(recordingState(6));
    expect(writes).toHaveLength(1);
  });

  it('never writes a finished state', async () => {
    const { persister, writes } = setup();
    const running = recordingState(2);
    persister.update(running);
    persister.update(trackerReducer(running, { type: 'finish', t: running.now }));
    await persister.flush();
    expect(writes.every(write => write.state.status !== 'finished')).toBe(true);
  });
});
