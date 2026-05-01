import { format, parse } from 'date-fns';

export function formatLocalDate(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}

export function parseLocalDate(dateStr: string): Date {
  return parse(dateStr, 'yyyy-MM-dd', new Date());
}

export function getLocalWeekStart(date: Date = new Date()): Date {
  const weekStart = new Date(date);
  const dayOfWeek = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - ((dayOfWeek + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

export function getLocalDateFromIso(isoString: string): string {
  return formatLocalDate(new Date(isoString));
}

export function getWorkoutSessionDateKey(session: {
  date: string;
  startedAt?: string | null;
  endedAt?: string | null;
}): string {
  if (session.endedAt) return getLocalDateFromIso(session.endedAt);
  if (session.startedAt) return getLocalDateFromIso(session.startedAt);
  return session.date;
}
