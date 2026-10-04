import {
  buildHero,
  buildMonth,
  buildWeek,
  currentStreak,
} from '@app/features/progress/progressModel';
import {
  deviceTimeZone,
  parseProgressSummary,
  summaryToSessions,
} from '@app/features/progress/summaryAdapter';

const raw = {
  days: [
    { date: '2026-10-01', sessions: 1, active_seconds: 2520 },
    { date: '2026-10-03', sessions: 2, active_seconds: '3001' },
    { date: '2026-02-10', sessions: 1, active_seconds: 1800 },
    { sessions: 1, active_seconds: 10 },
  ],
  months: [
    { month: '2026-02', avg_volume_kg: 7000, sessions: 1 },
    { month: '2026-10', avg_volume_kg: '8100.5', sessions: 3 },
  ],
};

describe('get_progress_summary → model', () => {
  it('reads the JSON tolerantly', () => {
    const summary = parseProgressSummary(raw);
    expect(summary.days).toHaveLength(3);
    expect(summary.days[1]).toEqual({ date: '2026-10-03', sessions: 2, activeSeconds: 3001 });
    expect(summary.months[1].avgVolumeKg).toBe(8100.5);
    expect(parseProgressSummary(null)).toEqual({ days: [], months: [] });
    expect(parseProgressSummary({ days: 'x' }).days).toEqual([]);
  });

  it('keeps the counts, seconds and volume the server sent', () => {
    const sessions = summaryToSessions(parseProgressSummary(raw));
    expect(sessions).toHaveLength(4);
    const third = sessions.filter(session => session.date === '2026-10-03');
    expect(third).toHaveLength(2);
    // The day's seconds are shared between its sessions, none is lost.
    const week = buildWeek(sessions, new Date(2026, 9, 4, 12));
    expect(week.sessions).toBe(3);
    expect(week.minutes).toBe(Math.floor((2520 + 3001) / 60));
    const month = buildMonth(sessions, new Date(2026, 9, 4, 12));
    expect(month.sessions).toBe(3);
    expect(month.activeDays).toBe(2);
    expect(month.previous.find(item => item.month === 1)?.activeDays).toBe(1);
  });

  it('feeds the hero with the monthly average volume', () => {
    const hero = buildHero(summaryToSessions(parseProgressSummary(raw)), new Date(2026, 9, 4, 12));
    expect(hero.kind).toBe('strength');
    if (hero.kind === 'strength') {
      expect(hero.values).toEqual([7000, 8100.5]);
      expect(hero.deltaKg).toBe(1101);
    }
  });

  it('keeps the streak from the days with sessions', () => {
    const sessions = summaryToSessions(
      parseProgressSummary({
        days: [
          { date: '2026-10-02', sessions: 1, active_seconds: 600 },
          { date: '2026-10-03', sessions: 1, active_seconds: 600 },
          { date: '2026-10-04', sessions: 1, active_seconds: 600 },
        ],
      }),
    );
    expect(currentStreak(sessions, new Date(2026, 9, 4, 12))).toBe(3);
  });

  it('uses the device time zone, UTC when unknown', () => {
    expect(typeof deviceTimeZone()).toBe('string');
    expect(deviceTimeZone().length).toBeGreaterThan(0);
  });
});
