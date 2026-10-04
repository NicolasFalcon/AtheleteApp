import {
  addDaysToKey,
  daysBetweenKeys,
  dateKeyInZone,
  getChallengeDay,
  getCompletedChallengeDays,
  getCurrentChallengeStreak,
  getLongestChallengeStreak,
  getMissedChallengeDays,
} from '@app/shared/domain/core33';
import {
  challengeOfHabits,
  habitsForChallenge,
  pillarOf,
  recommendedChallenge,
  findChallenge,
} from '@app/features/core33/core33Catalog';
import {
  buildCore33DayView,
  core33DayReference,
  core33ParticipationReference,
  flipHabit,
  startGuard,
} from '@app/features/core33/core33Model';

const challenge = (startDate: string) =>
  ({ id: 'c', userId: 'u', status: 'active', startDate, habits: [] } as never);
const full = [true, true, true];
const logsFor = (dates: string[]) =>
  Object.fromEntries(dates.map(date => [date, full])) as Record<string, boolean[]>;

describe('day of the challenge by time zone', () => {
  it('counts between date keys: day 1 is the start date, capped at 33', () => {
    const start = challenge('2026-10-01');
    expect(getChallengeDay(start, new Date('2026-10-01T12:00:00Z'), 33, 'UTC')).toBe(1);
    expect(getChallengeDay(start, new Date('2026-10-13T12:00:00Z'), 33, 'UTC')).toBe(13);
    expect(getChallengeDay(start, new Date('2027-03-01T12:00:00Z'), 33, 'UTC')).toBe(33);
    // Before the start (clock changes): day 1, never 0 or negative.
    expect(getChallengeDay(start, new Date('2026-09-20T12:00:00Z'), 33, 'UTC')).toBe(1);
    expect(getChallengeDay(null)).toBe(0);
  });

  it('"today" depends on the time zone of the user', () => {
    const instant = new Date('2026-10-02T02:30:00Z'); // still Oct 1 in Santiago? UTC-3 → Oct 1 23:30
    expect(dateKeyInZone(instant, 'UTC')).toBe('2026-10-02');
    expect(dateKeyInZone(instant, 'America/Santiago')).toBe('2026-10-01');
    expect(dateKeyInZone(instant, 'Pacific/Auckland')).toBe('2026-10-02');
    const start = challenge('2026-10-01');
    expect(getChallengeDay(start, instant, 33, 'UTC')).toBe(2);
    expect(getChallengeDay(start, instant, 33, 'America/Santiago')).toBe(1);
    // An invalid zone falls back to the device one instead of failing.
    expect(typeof dateKeyInZone(instant, 'Not/AZone')).toBe('string');
  });

  it('is not moved by daylight saving (23 or 25 hour days)', () => {
    // Europe/Madrid changes clocks on 2026-10-25 (25 h day).
    const start = challenge('2026-10-24');
    expect(getChallengeDay(start, new Date('2026-10-25T23:30:00+01:00'), 33, 'Europe/Madrid')).toBe(2);
    expect(getChallengeDay(start, new Date('2026-10-26T00:30:00+01:00'), 33, 'Europe/Madrid')).toBe(3);
    expect(daysBetweenKeys('2026-10-24', '2026-10-26')).toBe(2);
    expect(addDaysToKey('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('closed days, streak and progress to 33', () => {
  const start = challenge('2026-10-01');
  const today = new Date('2026-10-06T12:00:00Z');

  it('a day closes only with all three habits', () => {
    const logs = {
      '2026-10-01': full,
      '2026-10-02': [true, true, false],
      '2026-10-03': full,
    };
    expect(getCompletedChallengeDays(logs)).toBe(2);
    expect(getCompletedChallengeDays({})).toBe(0);
  });

  it('the streak runs back from today, or from yesterday while today is open', () => {
    const logs = logsFor(['2026-10-03', '2026-10-04', '2026-10-05']);
    expect(getCurrentChallengeStreak(start, logs, today, 33, 'UTC')).toBe(3);
    const withToday = { ...logs, '2026-10-06': full };
    expect(getCurrentChallengeStreak(start, withToday, today, 33, 'UTC')).toBe(4);
    // A gap breaks it.
    expect(getCurrentChallengeStreak(start, logsFor(['2026-10-03', '2026-10-05']), today, 33, 'UTC')).toBe(1);
    expect(getCurrentChallengeStreak(start, {}, today, 33, 'UTC')).toBe(0);
  });

  it('the longest streak is the longest run in the 33 days', () => {
    const logs = logsFor(['2026-10-01', '2026-10-02', '2026-10-04', '2026-10-05', '2026-10-06']);
    expect(getLongestChallengeStreak(start, logs)).toBe(3);
  });
});

describe('missed days', () => {
  const start = challenge('2026-10-01');
  const today = new Date('2026-10-06T12:00:00Z');

  it('counts the past days without closing; today is not missed yet', () => {
    expect(getMissedChallengeDays(start, {}, today, 'UTC')).toBe(5);
    expect(
      getMissedChallengeDays(start, logsFor(['2026-10-01', '2026-10-02', '2026-10-04']), today, 'UTC'),
    ).toBe(2);
    expect(getMissedChallengeDays(start, {}, new Date('2026-10-01T09:00:00Z'), 'UTC')).toBe(0);
    expect(getMissedChallengeDays(null, {}, today)).toBe(0);
  });
});

describe('the day screen model', () => {
  const habits = habitsForChallenge(findChallenge('fuerza')!);
  const base = { status: 'active' as const, startDate: '2026-10-01', habits };
  const today = new Date('2026-10-13T12:00:00Z');

  it('day 13 with one habit done', () => {
    const logs = {
      ...logsFor(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12']),
      '2026-10-13': [true, false, false],
    };
    const view = buildCore33DayView({ challenge: base, habitLogs: logs, today, timeZone: 'UTC' });
    expect(view).toMatchObject({
      title: 'Construye fuerza',
      day: 13,
      closed: 12,
      left: 21,
      streak: 12,
      doneCount: 1,
      todayClosed: false,
      overline: 'Construye fuerza · Día 13',
      sub: '2 hábitos para cerrar el día.',
      todayTitle: 'Hoy',
      missed: 0,
      missedLine: null,
    });
    expect(view.habits.map(habit => habit.pillar)).toEqual(['Entreno', 'Proteína', 'Descanso']);
    expect(view.capsules.filter(state => state === 'closed')).toHaveLength(12);
    expect(view.capsules[12]).toBe('today');
  });

  it('closing the third habit closes the day (pending taps count)', () => {
    const logs = { '2026-10-13': [true, true, false] };
    const view = buildCore33DayView({
      challenge: base,
      habitLogs: logs,
      today,
      timeZone: 'UTC',
      overrides: { 2: true },
    });
    expect(view.todayClosed).toBe(true);
    expect(view.closed).toBe(1);
    expect(view.todayTitle).toBe('Día cerrado');
    expect(view.sub).toBe('Día 13 cerrado. Mañana sigue.');
    expect(view.capsules[0]).toBe('closedToday');
    // Un-doing a habit reopens it.
    expect(
      buildCore33DayView({ challenge: base, habitLogs: { '2026-10-13': full }, today, timeZone: 'UTC', overrides: { 1: false } }).todayClosed,
    ).toBe(false);
  });

  it('a missed day does not end the challenge: it breaks the streak and says so', () => {
    const logs = logsFor(['2026-10-01', '2026-10-04']);
    const view = buildCore33DayView({ challenge: base, habitLogs: logs, today: new Date('2026-10-05T12:00:00Z'), timeZone: 'UTC' });
    expect(view.missed).toBe(2);
    expect(view.streak).toBe(1);
    expect(view.closed).toBe(2);
    expect(view.missedLine).toBe('Llevas 2 días sin cerrar. El reto termina cuando cierres 33.');
  });

  it('the last day and the completed challenge', () => {
    const dates = Array.from({ length: 33 }, (_, i) => addDaysToKey('2026-10-01', i));
    const last = buildCore33DayView({
      challenge: base,
      habitLogs: { ...logsFor(dates.slice(0, 32)), [dates[32]]: [true, true, false] },
      today: new Date(`${dates[32]}T12:00:00Z`),
      timeZone: 'UTC',
    });
    expect(last).toMatchObject({ overline: 'Último día', closed: 32, left: 1, sub: '1 hábito para cerrar el último día.' });
    const done = buildCore33DayView({
      challenge: { ...base, status: 'completed' },
      habitLogs: logsFor(dates),
      today: new Date(`${dates[32]}T12:00:00Z`),
      timeZone: 'UTC',
    });
    expect(done).toMatchObject({ completed: true, overline: 'Reto completado', closed: 33, left: 0, missed: 0, sub: '' });
    expect(done.capsules.every(state => state === 'closed')).toBe(true);
  });

  it('flips one habit without touching the rest', () => {
    expect(flipHabit(undefined, 1, 3)).toEqual([false, true, false]);
    expect(flipHabit([true, true, false], 0, 3)).toEqual([false, true, false]);
  });
});

describe('catalogue', () => {
  it('stores the chosen challenge in the habits and recovers it', () => {
    const habits = habitsForChallenge(findChallenge('recuperacion')!);
    expect(habits.map(habit => habit.category)).toEqual(['training', 'health', 'mind']);
    expect(habits[0].id).toBe('core33:recuperacion:0');
    expect(challengeOfHabits(habits)?.name).toBe('Recupera mejor');
    expect(pillarOf(habits, 1)).toBe('Respiración');
  });

  it('old participations keep working with the generic pillars', () => {
    const old = [
      { id: 'training-123', category: 'training' },
      { id: 'health-123', category: 'health' },
      { id: 'mind-123', category: 'mind' },
    ];
    expect(challengeOfHabits(old)).toBeNull();
    expect(pillarOf(old, 2)).toBe('Mentalidad');
  });

  it('recommends by goal and falls back to the first challenge', () => {
    expect(recommendedChallenge('lose_weight').id).toBe('nutricion');
    expect(recommendedChallenge('gain_muscle').id).toBe('fuerza');
    expect(recommendedChallenge(null).id).toBe('fuerza');
  });
});

describe('starting a challenge', () => {
  it('is not allowed while another one is active', () => {
    expect(startGuard([])).toBe('ok');
    expect(startGuard([{ status: 'completed' }, { status: 'abandoned' }])).toBe('ok');
    expect(startGuard([{ status: 'completed' }, { status: 'active' }])).toBe('alreadyActive');
  });
});

describe('gamification references (server catalogue)', () => {
  it('day closed: participation_id:YYYY-MM-DD; completed and streak: participation_id', () => {
    const id = '6f1c2e0a-9d3b-4c55-8a10-2b7e5f9d4c11';
    expect(core33DayReference(id, '2026-10-04')).toBe(`${id}:2026-10-04`);
    expect(core33DayReference(id, '2026-10-04')).toMatch(/^[0-9a-f-]{36}:\d{4}-\d{2}-\d{2}$/);
    expect(core33ParticipationReference(id)).toBe(id);
  });
});
