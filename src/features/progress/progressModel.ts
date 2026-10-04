import {
  sessionActiveSeconds,
  toGlasses,
} from '@app/features/home/homePriority';
import { getLocalDateKey } from '@app/lib/date';
import type {
  DailyNutritionLog,
  HydrationLog,
  WorkoutSession,
} from '@app/shared';

// Progreso · Resumen (Progress.dc.html): pure aggregates by period. Minutes
// are the active duration without pauses, the same rule as the Entreno ring
// of Inicio (`sessionActiveSeconds`); volume is the server's `volume_kg`.

export type ProgressPeriod = 'week' | 'month';

export const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];
export const MONTH_ABBR = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];
export const WEEKDAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// Capsule scale: this many minutes fill a day capsule (prototype: 45).
export const CAPSULE_FULL_MINUTES = 45;
// Weekly minutes target when the profile gives no session length.
export const DEFAULT_SESSION_MINUTES = 35;
export const DEFAULT_WEEKLY_SESSIONS = 3;

const pad = (value: number) => String(value).padStart(2, '0');
const dayKey = (year: number, month: number, day: number) =>
  `${year}-${pad(month + 1)}-${pad(day)}`;

// Noon avoids DST edges when adding days.
function atNoon(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
}

function addDays(date: Date, days: number): Date {
  const next = atNoon(date);
  next.setDate(next.getDate() + days);
  return next;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// ── Seconds per day ─────────────────────────────────────────────────────────
// Completed sessions, each row once.
export function completedSessions(
  sessions: WorkoutSession[],
): WorkoutSession[] {
  const seen = new Set<string>();
  return sessions.filter(session => {
    if (
      !(session.status === 'completed' || session.completed) ||
      seen.has(session.id)
    ) {
      return false;
    }
    seen.add(session.id);
    return true;
  });
}

// date → active seconds (each session once, pauses excluded).
export function secondsByDate(
  sessions: WorkoutSession[],
): Record<string, number> {
  const result: Record<string, number> = {};
  completedSessions(sessions).forEach(session => {
    result[session.date] =
      (result[session.date] ?? 0) + sessionActiveSeconds(session);
  });
  return result;
}

const minutesOf = (seconds: number) => Math.floor(seconds / 60);

// ── Streak ──────────────────────────────────────────────────────────────────
// Consecutive days with a completed session, ending today (or yesterday when
// nothing is logged yet today).
export function currentStreak(sessions: WorkoutSession[], today: Date): number {
  const days = new Set(
    completedSessions(sessions).map(session => session.date),
  );
  let streak = 0;
  for (let offset = 0; offset < 400; offset += 1) {
    if (days.has(getLocalDateKey(addDays(today, -offset)))) {
      streak += 1;
    } else if (offset > 0) {
      break;
    }
  }
  return streak;
}

// Longest run of consecutive days with a completed session.
export function longestStreak(sessions: WorkoutSession[]): number {
  const days = [
    ...new Set(completedSessions(sessions).map(session => session.date)),
  ].sort();
  let longest = 0;
  let run = 0;
  let previous: Date | null = null;
  days.forEach(key => {
    const date = new Date(`${key}T12:00:00`);
    run =
      previous &&
      Math.round((date.getTime() - previous.getTime()) / 86400000) === 1
        ? run + 1
        : 1;
    longest = Math.max(longest, run);
    previous = date;
  });
  return longest;
}

// First day of the history Progreso needs: January 1st (hero "desde enero")
// or 120 days back, whichever is earlier (the streak crosses new year).
export function trainingSinceKey(today: Date): string {
  const january = new Date(today.getFullYear(), 0, 1, 12);
  const back = addDays(today, -120);
  return getLocalDateKey(january < back ? january : back);
}

// ── Week ────────────────────────────────────────────────────────────────────
export type WeekDay = {
  key: string;
  letter: string;
  minutes: number | null; // null: still to come
  isToday: boolean;
};

export type WeekStats = {
  days: WeekDay[];
  sessions: number;
  minutes: number;
  activeDays: number;
  goalSessions: number;
  goalMinutes: number;
  // Sessions of last week up to the same weekday (for the comparison line).
  lastWeekSameSpan: number;
};

export function weekKeys(today: Date): string[] {
  const offset = (atNoon(today).getDay() + 6) % 7; // Monday = 0
  const monday = addDays(today, -offset);
  return Array.from({ length: 7 }, (_, index) =>
    getLocalDateKey(addDays(monday, index)),
  );
}

export function buildWeek(
  sessions: WorkoutSession[],
  today: Date,
  options: {
    goalSessions?: number | null;
    sessionMinutes?: number | null;
  } = {},
): WeekStats {
  const todayKey = getLocalDateKey(today);
  const keys = weekKeys(today);
  const seconds = secondsByDate(sessions);
  const done = completedSessions(sessions);
  const goalSessions = options.goalSessions || DEFAULT_WEEKLY_SESSIONS;
  const goalMinutes =
    goalSessions * (options.sessionMinutes || DEFAULT_SESSION_MINUTES);

  const days = keys.map((key, index) => ({
    key,
    letter: WEEKDAY_LETTERS[index],
    minutes: key > todayKey ? null : minutesOf(seconds[key] ?? 0),
    isToday: key === todayKey,
  }));

  const inWeek = done.filter(session => keys.includes(session.date));
  const totalSeconds = keys.reduce((sum, key) => sum + (seconds[key] ?? 0), 0);

  const todayIndex = Math.max(0, keys.indexOf(todayKey));
  const lastWeek = weekKeys(addDays(today, -7)).slice(0, todayIndex + 1);

  return {
    days,
    sessions: inWeek.length,
    minutes: minutesOf(totalSeconds),
    activeDays: days.filter(day => (day.minutes ?? 0) > 0).length,
    goalSessions,
    goalMinutes,
    lastWeekSameSpan: done.filter(session => lastWeek.includes(session.date))
      .length,
  };
}

export function weekComparisonLine(week: WeekStats): string {
  const diff = week.sessions - week.lastWeekSameSpan;
  const plural = (n: number) => (n === 1 ? 'sesión' : 'sesiones');
  if (diff > 0) {
    return `Vas ${diff} ${plural(diff)} por delante de la semana pasada.`;
  }
  if (diff < 0) {
    return `Te ${-diff === 1 ? 'falta' : 'faltan'} ${-diff} ${plural(
      -diff,
    )} para igualar la semana pasada.`;
  }
  return week.sessions > 0
    ? 'Vas igual que la semana pasada.'
    : 'Esta semana todavía no tiene sesiones.';
}

// ── Month ───────────────────────────────────────────────────────────────────
export type MonthCell = {
  day: number | null; // null: blank before the 1st
  minutes: number | null; // null: still to come
  level: 0 | 1 | 2 | 3;
  isToday: boolean;
};

export type MonthStats = {
  title: string; // "Septiembre"
  cells: MonthCell[];
  sessions: number;
  minutes: number;
  activeDays: number;
  // Active days of the earlier months of the same year, newest first.
  previous: { month: number; activeDays: number }[];
};

// Intensity of a day (legend: Menos … Más).
export function levelOf(minutes: number): 0 | 1 | 2 | 3 {
  if (minutes <= 0) {
    return 0;
  }
  if (minutes <= 20) {
    return 1;
  }
  return minutes <= 40 ? 2 : 3;
}

function activeDaysIn(
  seconds: Record<string, number>,
  year: number,
  month: number,
): number {
  const prefix = `${year}-${pad(month + 1)}-`;
  return Object.keys(seconds).filter(
    key => key.startsWith(prefix) && seconds[key] > 0,
  ).length;
}

export function buildMonth(
  sessions: WorkoutSession[],
  today: Date,
): MonthStats {
  const year = today.getFullYear();
  const month = today.getMonth();
  const todayKey = getLocalDateKey(today);
  const seconds = secondsByDate(sessions);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lead = (new Date(year, month, 1, 12).getDay() + 6) % 7;

  const cells: MonthCell[] = Array.from({ length: lead }, () => ({
    day: null,
    minutes: null,
    level: 0 as const,
    isToday: false,
  }));
  let totalSeconds = 0;
  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = dayKey(year, month, day);
    const future = key > todayKey;
    const minutes = future ? null : minutesOf(seconds[key] ?? 0);
    totalSeconds += future ? 0 : seconds[key] ?? 0;
    cells.push({
      day,
      minutes,
      level: minutes === null ? 0 : levelOf(minutes),
      isToday: key === todayKey,
    });
  }

  const prefix = `${year}-${pad(month + 1)}-`;
  const sessionsInMonth = completedSessions(sessions).filter(session =>
    session.date.startsWith(prefix),
  ).length;

  const previous = Array.from({ length: month }, (_, index) => {
    const m = month - 1 - index;
    return { month: m, activeDays: activeDaysIn(seconds, year, m) };
  });

  return {
    title: capitalize(MONTH_NAMES[month]),
    cells,
    sessions: sessionsInMonth,
    minutes: minutesOf(totalSeconds),
    activeDays: activeDaysIn(seconds, year, month),
    previous,
  };
}

// "Tu mes más constante desde junio." = the latest earlier month that had at
// least as many active days.
export function monthComparisonLine(month: MonthStats): string {
  if (month.activeDays === 0) {
    return 'Este mes todavía no tiene sesiones.';
  }
  const withData = month.previous.filter(item => item.activeDays > 0);
  if (withData.length === 0) {
    return `Llevas ${month.activeDays} ${
      month.activeDays === 1 ? 'día activo' : 'días activos'
    } este mes.`;
  }
  const beaten = month.previous.find(
    item => item.activeDays >= month.activeDays,
  );
  return beaten
    ? `Tu mes más constante desde ${MONTH_NAMES[beaten.month]}.`
    : 'Tu mes más constante hasta ahora.';
}

// ── Hero: evolution since January ───────────────────────────────────────────
export type ProgressHero =
  | { kind: 'empty' }
  | {
      kind: 'strength';
      pct: number; // +18
      deltaKg: number; // 1240 kg more per session than in `sinceMonth`
      sinceMonth: string;
      values: number[]; // monthly average volume per session
      months: number[];
    }
  | {
      kind: 'consistency';
      sessions: number;
      minutes: number;
      sinceMonth: string;
      values: number[]; // monthly active minutes
      months: number[];
    };

export function buildHero(
  sessions: WorkoutSession[],
  today: Date,
): ProgressHero {
  const year = today.getFullYear();
  const done = completedSessions(sessions).filter(session =>
    session.date.startsWith(`${year}-`),
  );
  if (done.length === 0) {
    return { kind: 'empty' };
  }

  const monthOf = (session: WorkoutSession) =>
    Number(session.date.slice(5, 7)) - 1;

  // Average server volume per session, by month (NULL does not count).
  const volume = new Map<number, number[]>();
  done.forEach(session => {
    if (session.volumeKg !== null && session.volumeKg !== undefined) {
      volume.set(monthOf(session), [
        ...(volume.get(monthOf(session)) ?? []),
        session.volumeKg,
      ]);
    }
  });
  const volumeMonths = [...volume.keys()].sort((a, b) => a - b);
  if (volumeMonths.length >= 2) {
    const values = volumeMonths.map(m => {
      const list = volume.get(m) ?? [];
      return list.reduce((sum, v) => sum + v, 0) / list.length;
    });
    const first = values[0];
    const last = values[values.length - 1];
    return {
      kind: 'strength',
      pct: first > 0 ? Math.round(((last - first) / first) * 100) : 0,
      deltaKg: Math.round(last - first),
      sinceMonth: MONTH_NAMES[volumeMonths[0]],
      values,
      months: volumeMonths,
    };
  }

  // Without volume history: constancy (active minutes by month).
  const seconds = secondsByDate(done);
  const perMonth = new Map<number, number>();
  Object.keys(seconds).forEach(key => {
    const m = Number(key.slice(5, 7)) - 1;
    perMonth.set(m, (perMonth.get(m) ?? 0) + seconds[key]);
  });
  const months = [...perMonth.keys()].sort((a, b) => a - b);
  return {
    kind: 'consistency',
    sessions: done.length,
    minutes: minutesOf([...perMonth.values()].reduce((sum, s) => sum + s, 0)),
    sinceMonth: MONTH_NAMES[months[0]],
    values: months.map(m => minutesOf(perMonth.get(m) ?? 0)),
    months,
  };
}

// Up to five month labels, evenly spaced, always the first and the last.
export function axisMonths(months: number[]): number[] {
  if (months.length <= 5) {
    return months;
  }
  return Array.from(
    { length: 5 },
    (_, i) => months[Math.round((i * (months.length - 1)) / 4)],
  );
}

// ── Nutrition (protein) and hydration of the week ───────────────────────────
export type NutritionWeek = {
  values: (number | null)[]; // protein per day, null: no log / still to come
  average: number | null;
  goal: number | null;
  hasData: boolean;
};

export function buildNutritionWeek(
  logs: DailyNutritionLog[],
  goalProtein: number | null | undefined,
  keys: string[],
  todayKey: string,
): NutritionWeek {
  const byDate = new Map(logs.map(log => [log.date, log.protein]));
  const values = keys.map(key =>
    key > todayKey || !byDate.has(key) ? null : byDate.get(key) ?? 0,
  );
  const present = values.filter((v): v is number => v !== null && v > 0);
  return {
    values,
    average: present.length
      ? Math.round(present.reduce((sum, v) => sum + v, 0) / present.length)
      : null,
    goal: goalProtein && goalProtein > 0 ? goalProtein : null,
    hasData: present.length > 0,
  };
}

export type HydrationDot = 'met' | 'missed' | 'today' | 'future';

export type HydrationWeek = {
  dots: HydrationDot[];
  daysMet: number;
  goalGlasses: number;
};

// daily_water_goal is a number of 250 ml glasses (DA-39).
export function buildHydrationWeek(
  logs: HydrationLog[],
  goalGlasses: number,
  keys: string[],
  todayKey: string,
): HydrationWeek {
  const goal = Math.max(1, goalGlasses);
  const byDate = new Map(logs.map(log => [log.date, log.waterMl]));
  const dots = keys.map<HydrationDot>(key => {
    if (key > todayKey) {
      return 'future';
    }
    const met = toGlasses(byDate.get(key) ?? 0) >= goal;
    if (met) {
      return 'met';
    }
    return key === todayKey ? 'today' : 'missed';
  });
  return {
    dots,
    daysMet: dots.filter(dot => dot === 'met').length,
    goalGlasses: goal,
  };
}
