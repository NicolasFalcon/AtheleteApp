import {
  bestPaceSecPerKm,
  formatBest,
  parsePersonalBests,
  parseSetBest,
  parseTimeInput,
  validateManualBest,
} from '../src/features/route/routeRecords';

describe('route records · format', () => {
  it('turns seconds into a time and a pace per km', () => {
    expect(formatBest({ sport: 'running', distanceKey: '5k', bestSec: 1481 })).toEqual({
      label: '5K',
      time: '24:41',
      pace: '4:56 /km',
    });
    expect(formatBest({ sport: 'running', distanceKey: '10k', bestSec: 3140 })).toMatchObject({ time: '52:20', pace: '5:14 /km' });
    expect(formatBest({ sport: 'running', distanceKey: '21k', bestSec: 6600 })).toMatchObject({ time: '1:50:00', pace: '5:13 /km' });
    expect(formatBest({ sport: 'running', distanceKey: '1k', bestSec: 232 })).toMatchObject({ time: '03:52', pace: '3:52 /km' });
  });

  it('shows km/h for cycling', () => {
    expect(formatBest({ sport: 'cycling', distanceKey: '10k', bestSec: 1200 }).pace).toBe('30,0 km/h');
  });

  it('divides by the real distance of the half and the marathon', () => {
    expect(bestPaceSecPerKm('42k', 42195 / 10)).toBeCloseTo(100, 5);
  });
});

describe('route records · manual entry', () => {
  it('reads mm:ss and h:mm:ss, and nothing else', () => {
    expect(parseTimeInput('24:41')).toBe(1481);
    expect(parseTimeInput(' 1:52:10 ')).toBe(6730);
    expect(parseTimeInput('0:45')).toBe(45);
    expect(parseTimeInput('24.41')).toBeNull();
    expect(parseTimeInput('2441')).toBeNull();
    expect(parseTimeInput('24:75')).toBeNull();
    expect(parseTimeInput('1:60:00')).toBeNull();
    expect(parseTimeInput('00:00')).toBeNull();
    expect(parseTimeInput('a:b')).toBeNull();
  });

  it('refuses times faster than the server limits', () => {
    // 2:30 min/km running, 72 km/h cycling.
    expect(validateManualBest('running', '5k', 5 * 150 - 1)).toBe('too_fast');
    expect(validateManualBest('running', '5k', 5 * 150)).toBe('ok');
    expect(validateManualBest('cycling', '10k', 499)).toBe('too_fast');
    expect(validateManualBest('cycling', '10k', 500)).toBe('ok');
    expect(validateManualBest('running', '42k', 25 * 3600)).toBe('too_slow');
  });

  it('reads the answer of set_route_personal_best', () => {
    expect(parseSetBest({ ok: true })).toEqual({ ok: true });
    expect(parseSetBest({ ok: false, error: 'impossible_speed' })).toEqual({ ok: false, error: 'too_fast' });
    expect(parseSetBest({ ok: false, error: 'invalid_distance' })).toEqual({ ok: false, error: 'invalid' });
    expect(parseSetBest(null)).toEqual({ ok: false, error: 'unknown' });
  });
});

describe('route records · get_route_personal_bests', () => {
  it('reads the bests in distance order and drops broken rows', () => {
    const bests = parsePersonalBests({
      ok: true,
      bests: [
        { sport: 'running', distance_key: '10k', best_sec: 3140, activity_id: 'a', source: 'auto', achieved_at: '2026-10-01' },
        { sport: 'running', distance_key: '1k', best_sec: 232, activity_id: null, source: 'manual', achieved_at: null },
        { sport: 'running', distance_key: '3k', best_sec: 100 },
        { sport: 'swimming', distance_key: '5k', best_sec: 100 },
        { sport: 'running', distance_key: '5k', best_sec: 0 },
      ],
    });
    expect(bests.map(b => b.distanceKey)).toEqual(['1k', '10k']);
    expect(bests[0]).toMatchObject({ source: 'manual', activityId: null });
    expect(parsePersonalBests(null)).toEqual([]);
  });
});
