import {
  buildShelves,
  parseBadgeProgress,
} from '../src/features/progress/badgesModel';
import {
  compareDraft,
  curvePoints,
  defaultDraft,
  deltaSinceFirst,
  draftToInsert,
  formatRecord,
  groupRecords,
  isDraftValid,
  recordDelta,
  recordSource,
} from '../src/features/progress/recordsModel';
import { ALL_BADGES, type PersonalRecord } from '../src/shared';

const today = new Date(2026, 9, 3, 12);
let seq = 0;

function pr(patch: Partial<PersonalRecord>): PersonalRecord {
  seq += 1;
  return {
    id: `r${seq}`,
    userId: 'u',
    exerciseId: 'rdl',
    prType: 'weight_reps',
    valueWeight: 100,
    valueReps: 1,
    valueDurationSec: null,
    valueDistanceM: null,
    unit: 'kg',
    notes: null,
    recordedAt: '2026-04-09T12:00:00',
    createdAt: '',
    source: 'manual',
    workoutSessionId: null,
    sessionSetId: null,
    ...patch,
  };
}

describe('records', () => {
  const history = [
    pr({ valueWeight: 170, valueReps: 3, recordedAt: '2026-01-10T12:00:00' }),
    pr({ valueWeight: 180, valueReps: 3, recordedAt: '2026-02-02T12:00:00' }),
    pr({ valueWeight: 190, valueReps: 2, recordedAt: '2026-03-12T12:00:00' }),
    pr({ valueWeight: 200, valueReps: 1, recordedAt: '2026-04-09T12:00:00', sessionSetId: 's1', source: 'session' }),
  ];
  const other = pr({
    exerciseId: 'arnold',
    prType: 'max_reps',
    valueWeight: null,
    valueReps: 12,
    recordedAt: '2026-09-23T12:00:00',
  });
  const names = (id: string) => (id === 'rdl' ? 'Peso muerto rumano' : 'Arnold press');

  it('groups by exercise, newest first, with the best mark and deltas', () => {
    const groups = groupRecords([...history, other], names, today);
    expect(groups.map(group => group.exerciseName)).toEqual([
      'Arnold press',
      'Peso muerto rumano',
    ]);
    const rdl = groups[1];
    expect(formatRecord(rdl.best)).toEqual({ value: '200', unit: 'kg × 1' });
    expect(rdl.history.map(row => row.delta.text)).toEqual([
      '+10 kg',
      '+10 kg',
      '+10 kg',
      'Primera marca',
    ]);
    expect(rdl.history[0].isLatest).toBe(true);
    expect(deltaSinceFirst(rdl)).toBe('+30 kg desde 10 ene');
    expect(rdl.isNew).toBe(false);
    expect(curvePoints(rdl).map(point => point.label)).toEqual(['170', '180', '190', '200']);
  });

  it('shows whether a mark came from a session or was manual', () => {
    expect(recordSource(history[3])).toBe('session');
    expect(recordSource(history[0])).toBe('manual');
  });

  it('flags a record registered today', () => {
    const fresh = pr({ valueWeight: 210, recordedAt: '2026-10-03T08:00:00' });
    expect(groupRecords([...history, fresh], names, today)[0].isNew).toBe(true);
  });

  it('formats every pr_type with its unit', () => {
    expect(formatRecord(pr({ prType: 'max_weight', valueWeight: 32.5, valueReps: null }))).toEqual({ value: '32,5', unit: 'kg' });
    expect(formatRecord(pr({ prType: 'max_reps', valueReps: 15, valueWeight: null }))).toEqual({ value: '15', unit: 'reps' });
    expect(formatRecord(pr({ prType: 'duration', valueDurationSec: 95, valueWeight: null }))).toEqual({ value: '1:35', unit: 'min' });
    expect(formatRecord(pr({ prType: 'duration', valueDurationSec: 45, valueWeight: null }))).toEqual({ value: '45', unit: 's' });
    expect(formatRecord(pr({ prType: 'distance', valueDistanceM: 1500, valueWeight: null }))).toEqual({ value: '1.500', unit: 'm' });
    expect(formatRecord(pr({ valueWeight: 200, valueReps: 2 }), true).unit).toBe('kg × 2 reps');
  });

  it('uses the reps as the difference at the same weight', () => {
    const a = pr({ valueWeight: 100, valueReps: 5 });
    const b = pr({ valueWeight: 100, valueReps: 3 });
    expect(recordDelta(a, b)).toEqual({ text: '+2 reps', positive: true });
    expect(recordDelta(b, a)).toEqual({ text: '−2 reps', positive: false });
    expect(recordDelta(a, a)).toEqual({ text: 'Igual', positive: false });
  });

  it('builds the manual record and compares it with the best', () => {
    const best = history[3];
    const draft = defaultDraft('weight_reps', best);
    expect(draft).toMatchObject({ weight: 205, reps: 1 });
    expect(compareDraft(draft, best)).toEqual({
      beats: true,
      text: 'Supera tu mejor marca por 5 kg',
    });
    expect(compareDraft({ ...draft, weight: 190 }, best)?.beats).toBe(false);
    expect(compareDraft({ ...draft, prType: 'max_reps' }, best)).toBeNull();
    expect(draftToInsert('rdl', draft, '  buen día  ', '2026-10-03T10:00:00Z')).toEqual({
      exerciseId: 'rdl',
      prType: 'weight_reps',
      valueWeight: 205,
      valueReps: 1,
      unit: 'kg',
      notes: 'buen día',
      recordedAt: '2026-10-03T10:00:00Z',
    });
    expect(draftToInsert('rdl', { ...draft, prType: 'duration', durationSec: 75 }, '', 'x')).toMatchObject({
      prType: 'duration',
      valueDurationSec: 75,
      unit: 's',
    });
    expect(isDraftValid({ ...draft, weight: 0 })).toBe(false);
    expect(isDraftValid({ ...draft, prType: 'max_weight', reps: 0 })).toBe(true);
  });
});

describe('badges (get_badge_progress, BT-24)', () => {
  const rows = parseBadgeProgress([
    { badge_id: 'first_workout', category: 'constancia', current: 1, target: 1, earned: true, earned_at: '2026-01-12T10:00:00' },
    { badge_id: 'streak_7_days', category: 'constancia', current: 3, target: 7, earned: false },
    { badge_id: 'core33_finisher', category: 'retos', current: 20, target: 33, earned: false },
    { badge_id: 'first_pr', category: 'fuerza', current: 1, target: 1, earned: true },
    { badge_id: 'quiz_master', category: 'habitos', current: 0, target: 6, earned: false },
    { badge_id: 'nutrition_activated', category: 'habitos', current: 1, target: 1, earned: true, title: 'Plan activado', icon: 'utensils' },
    { badge_id: 'brand_new', category: 'surprise', current: 0, target: 0, earned: false, title: 'Nueva', icon: 'does-not-exist' },
    { category: 'retos' },
  ]);

  it('reads the rows (list or { badges }) and drops those without an id', () => {
    expect(rows).toHaveLength(7);
    expect(parseBadgeProgress({ badges: [{ badge_id: 'a', earned: true }] })).toHaveLength(1);
    expect(parseBadgeProgress(null)).toEqual([]);
  });

  it('groups by the category of the server, in the order of the design', () => {
    const result = buildShelves(rows, { first_pr: '2026-01-10T10:00:00' });
    expect(result.shelves.map(shelf => shelf.key)).toEqual(['constancia', 'retos', 'fuerza', 'habitos', 'otros']);
    expect(result.shelves[0].items.map(item => item.badge.id)).toEqual(['first_workout', 'streak_7_days']);
    expect(result.shelves[0].earnedCount).toBe(1);
  });

  it('counts N / total from the data, 13 with nutrition_activated', () => {
    const thirteen = parseBadgeProgress(
      Array.from({ length: 13 }, (_, index) => ({
        badge_id: `b${index}`,
        category: 'constancia',
        current: 0,
        target: 5,
        earned: index < 7,
      })),
    );
    const result = buildShelves(thirteen);
    expect(result.total).toBe(13);
    expect(result.earnedCount).toBe(7);
  });

  it('shows dates when earned and "n de m" when locked', () => {
    const result = buildShelves(rows, { first_pr: '2026-01-10T10:00:00' });
    expect(result.shelves[0].items[0]).toMatchObject({ earned: true, sub: '12 ene', progress: null });
    expect(result.shelves[0].items[1]).toMatchObject({ earned: false, sub: '3 de 7' });
    expect(result.shelves[0].items[1].progress?.ratio).toBeCloseTo(3 / 7);
    expect(result.shelves[1].items[0].sub).toBe('20 de 33');
    expect(result.shelves[2].items[0]).toMatchObject({ earned: true, sub: '10 ene' });
    expect(result.shelves[3].items[0]).toMatchObject({ earned: false, sub: '0 de 6' });
  });

  it('uses the row data for a badge the app does not know and keeps unknown categories', () => {
    const result = buildShelves(rows);
    const other = result.shelves.find(shelf => shelf.key === 'otros');
    expect(other?.items[0]).toMatchObject({
      badge: { id: 'brand_new', title: 'Nueva', icon: 'does-not-exist' },
      progress: null,
    });
    const activated = result.shelves[3].items.find(item => item.badge.id === 'nutrition_activated');
    expect(activated?.badge.title).toBe('Plan activado');
  });
});
