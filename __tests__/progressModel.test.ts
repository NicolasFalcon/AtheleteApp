import {
  axisMonths,
  buildHero,
  buildHydrationWeek,
  buildMonth,
  buildNutritionWeek,
  buildWeek,
  currentStreak,
  levelOf,
  monthComparisonLine,
  weekComparisonLine,
  weekKeys,
} from '../src/features/progress/progressModel';
import type { WorkoutSession } from '../src/shared';

// Saturday 3 Oct 2026. The week is Mon 28 Sep – Sun 4 Oct.
const today = new Date(2026, 9, 3, 12);

let seq = 0;
// A completed session on `date` that lasted `wall` minutes, `paused` of them
// paused (they must not count).
function session(
  date: string,
  wall: number,
  paused = 0,
  patch: Partial<WorkoutSession> = {},
): WorkoutSession {
  seq += 1;
  const start = new Date(`${date}T10:00:00Z`).getTime();
  return {
    id: `s${seq}`,
    workoutId: 'w',
    workoutTitle: 'Rutina',
    userId: 'u',
    date,
    completed: true,
    duration: 0,
    caloriesBurned: 0,
    status: 'completed',
    startedAt: new Date(start).toISOString(),
    endedAt: new Date(start + wall * 60000).toISOString(),
    pausedAt: null,
    pausedTotalSec: paused * 60,
    completedExercises: [],
    totalExercises: 0,
    ...patch,
  };
}

describe('week', () => {
  const sessions = [
    session('2026-09-28', 30), // Mon
    session('2026-09-30', 55, 10), // Wed: 45 active
    session('2026-10-03', 20), // today
    session('2026-09-21', 40), // last week Mon
    session('2026-09-22', 40), // last week Tue
    session('2026-09-26', 40), // last week Sat
  ];

  it('lists Monday to Sunday and leaves the future empty', () => {
    expect(weekKeys(today)[0]).toBe('2026-09-28');
    expect(weekKeys(today)[6]).toBe('2026-10-04');
    const week = buildWeek(sessions, today, {
      goalSessions: 6,
      sessionMinutes: 35,
    });
    expect(week.days.map(day => day.minutes)).toEqual([
      30,
      0,
      45, // 55 min minus 10 paused
      0,
      0,
      20,
      null, // Sunday is still to come
    ]);
    expect(week.days[5].isToday).toBe(true);
    expect(week).toMatchObject({
      sessions: 3,
      minutes: 95,
      activeDays: 3,
      goalSessions: 6,
      goalMinutes: 210,
    });
  });

  it('compares with last week up to the same weekday', () => {
    const week = buildWeek(sessions, today);
    expect(week.lastWeekSameSpan).toBe(3); // Mon, Tue and Sat of last week
    expect(weekComparisonLine(week)).toBe('Vas igual que la semana pasada.');
    expect(
      weekComparisonLine(buildWeek([sessions[0], sessions[1], ...sessions.slice(3)], today)),
    ).toBe('Te falta 1 sesión para igualar la semana pasada.');
    expect(
      weekComparisonLine(buildWeek([...sessions, session('2026-10-02', 30)], today)),
    ).toBe('Vas 1 sesión por delante de la semana pasada.');
    expect(weekComparisonLine(buildWeek([], today))).toBe(
      'Esta semana todavía no tiene sesiones.',
    );
  });

  it('does not count running or canceled sessions, nor a session twice', () => {
    const running = session('2026-10-01', 30, 0, {
      status: 'in_progress',
      completed: false,
    });
    const dup = sessions[0];
    const week = buildWeek([...sessions, running, dup], today);
    expect(week.sessions).toBe(3);
    expect(week.minutes).toBe(95);
  });
});

describe('month', () => {
  const sessions = [
    session('2026-10-01', 25),
    session('2026-10-03', 50),
    session('2026-09-03', 30),
    session('2026-09-04', 30),
    session('2026-09-05', 30),
    session('2026-06-10', 30),
    session('2026-06-11', 30),
    session('2026-06-12', 30),
    session('2026-06-13', 30),
  ];

  it('builds the calendar with intensity levels', () => {
    const month = buildMonth(sessions, today);
    expect(month.title).toBe('Octubre');
    // 1 Oct 2026 is a Thursday: three blanks, Monday first.
    expect(month.cells.slice(0, 3).every(cell => cell.day === null)).toBe(true);
    expect(month.cells[3]).toMatchObject({ day: 1, minutes: 25, level: 2 });
    expect(month.cells[5]).toMatchObject({ day: 3, minutes: 50, level: 3, isToday: true });
    expect(month.cells[6]).toMatchObject({ day: 4, minutes: null });
    expect(month).toMatchObject({ sessions: 2, minutes: 75, activeDays: 2 });
    expect([levelOf(0), levelOf(10), levelOf(30), levelOf(41)]).toEqual([0, 1, 2, 3]);
  });

  it('says since when the month is the most constant', () => {
    // 2 active days now; Sep had 3, Jun had 4 → beaten by Sep.
    expect(monthComparisonLine(buildMonth(sessions, today))).toBe(
      'Tu mes más constante desde septiembre.',
    );
    const better = buildMonth(
      [...sessions, session('2026-10-02', 30), session('2026-10-02', 30)],
      today,
    );
    // 3 active days: Sep (3) still equals it.
    expect(monthComparisonLine(better)).toBe('Tu mes más constante desde septiembre.');
    expect(monthComparisonLine(buildMonth([], today))).toBe(
      'Este mes todavía no tiene sesiones.',
    );
    expect(
      monthComparisonLine(buildMonth([session('2026-10-01', 30)], today)),
    ).toBe('Llevas 1 día activo este mes.');
  });
});

describe('streak', () => {
  it('counts consecutive days, ending yesterday if today has no session yet', () => {
    const days = ['2026-10-03', '2026-10-02', '2026-10-01', '2026-09-29'];
    expect(currentStreak(days.map(d => session(d, 30)), today)).toBe(3);
    expect(
      currentStreak(['2026-10-02', '2026-10-01'].map(d => session(d, 30)), today),
    ).toBe(2);
    expect(currentStreak([session('2026-09-20', 30)], today)).toBe(0);
  });
});

describe('hero', () => {
  it('is empty without completed sessions this year', () => {
    expect(buildHero([], today)).toEqual({ kind: 'empty' });
    expect(buildHero([session('2025-12-01', 30)], today)).toEqual({ kind: 'empty' });
  });

  it('measures strength with the server volume (NULL does not count)', () => {
    const hero = buildHero(
      [
        session('2026-01-10', 40, 0, { volumeKg: 6000 }),
        session('2026-01-20', 40, 0, { volumeKg: 6200 }),
        session('2026-03-05', 40, 0, { volumeKg: 7000 }),
        session('2026-09-02', 40, 0, { volumeKg: 7340 }),
        session('2026-09-03', 40, 0, { volumeKg: null }),
      ],
      today,
    );
    // Jan average 6100 → Sep 7340: +1240 kg, +20 %.
    expect(hero).toMatchObject({
      kind: 'strength',
      pct: 20,
      deltaKg: 1240,
      sinceMonth: 'enero',
      months: [0, 2, 8],
    });
  });

  it('falls back to constancy when there is no volume history', () => {
    const hero = buildHero(
      [
        session('2026-09-02', 30, 0, { volumeKg: null }),
        session('2026-09-03', 30, 10),
        session('2026-08-03', 60),
      ],
      today,
    );
    expect(hero).toMatchObject({
      kind: 'consistency',
      sessions: 3,
      minutes: 110, // 30 + 20 (10 paused) + 60
      sinceMonth: 'agosto',
      values: [60, 50],
    });
    expect(axisMonths([0, 1, 2, 3, 4, 5, 6, 7, 8])).toEqual([0, 2, 4, 6, 8]);
    expect(axisMonths([2, 5])).toEqual([2, 5]);
  });
});

describe('nutrition and hydration of the week', () => {
  const keys = weekKeys(today);
  const todayKey = '2026-10-03';

  it('averages protein over the days with a log', () => {
    const week = buildNutritionWeek(
      [
        { id: 'a', userId: 'u', date: '2026-09-28', calories: 2000, protein: 150 },
        { id: 'b', userId: 'u', date: '2026-09-30', calories: 2000, protein: 170 },
      ],
      168,
      keys,
      todayKey,
    );
    expect(week.average).toBe(160);
    expect(week.goal).toBe(168);
    expect(week.values).toEqual([150, null, 170, null, null, null, null]);
    expect(buildNutritionWeek([], null, keys, todayKey)).toMatchObject({
      average: null,
      goal: null,
      hasData: false,
    });
  });

  it('counts the days that reached the goal in 250 ml glasses', () => {
    const week = buildHydrationWeek(
      [
        { date: '2026-09-28', waterMl: 3500 }, // 14 glasses: met
        { date: '2026-09-29', waterMl: 2250 }, // 9: missed
        { date: '2026-09-30', waterMl: 3750 }, // 15: met
      ],
      14,
      keys,
      todayKey,
    );
    expect(week.dots).toEqual([
      'met',
      'missed',
      'met',
      'missed',
      'missed',
      'today',
      'future',
    ]);
    expect(week.daysMet).toBe(2);
  });
});
