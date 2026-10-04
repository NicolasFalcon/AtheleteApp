import type { WorkoutSession } from '@app/shared';

// BT-23: Progreso · Resumen reads rpc('get_progress_summary', {_from, _tz})
// instead of downloading the sessions. The RPC answers
//   { days:   [{ date, sessions, active_seconds }],
//     months: [{ month: 'YYYY-MM', avg_volume_kg, sessions }] }
// and this module turns it into what the pure model (progressModel) takes.

export type SummaryDay = { date: string; sessions: number; activeSeconds: number };
export type SummaryMonth = {
  month: string; // YYYY-MM
  avgVolumeKg: number | null;
  sessions: number;
};
export type TrainingSummary = { days: SummaryDay[]; months: SummaryMonth[] };

export const emptySummary: TrainingSummary = { days: [], months: [] };

const num = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value)
    ? value
    : typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))
    ? Number(value)
    : null;

// Tolerant reading of the JSON (numbers may arrive as strings; rows without a
// date are dropped; missing lists are empty).
export function parseProgressSummary(raw: unknown): TrainingSummary {
  const source =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const list = (value: unknown): Record<string, unknown>[] =>
    Array.isArray(value)
      ? value.filter(
          (item): item is Record<string, unknown> =>
            Boolean(item) && typeof item === 'object',
        )
      : [];

  return {
    days: list(source.days)
      .filter(row => typeof row.date === 'string')
      .map(row => ({
        date: String(row.date).slice(0, 10),
        sessions: Math.max(0, Math.round(num(row.sessions) ?? 0)),
        activeSeconds: Math.max(0, Math.floor(num(row.active_seconds) ?? 0)),
      })),
    months: list(source.months)
      .filter(row => typeof row.month === 'string')
      .map(row => ({
        month: String(row.month).slice(0, 7),
        avgVolumeKg: num(row.avg_volume_kg),
        sessions: Math.max(0, Math.round(num(row.sessions) ?? 0)),
      })),
  };
}

// The device time zone for `_tz` ('UTC' when it cannot be known).
export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

// The aggregates as the model's input: one completed session per counted
// session on each day (the day's seconds shared between them) and the month's
// average volume on every session of that month, so the model's sums, counts
// and averages come out exactly as the server's.
export function summaryToSessions(summary: TrainingSummary): WorkoutSession[] {
  const volumeByMonth = new Map(
    summary.months.map(month => [month.month, month.avgVolumeKg]),
  );
  const sessions: WorkoutSession[] = [];
  summary.days.forEach(day => {
    const count = Math.max(day.sessions, day.activeSeconds > 0 ? 1 : 0);
    const share = count > 0 ? Math.floor(day.activeSeconds / count) : 0;
    const remainder = count > 0 ? day.activeSeconds - share * count : 0;
    const start = new Date(`${day.date}T12:00:00.000Z`).getTime();
    for (let index = 0; index < count; index += 1) {
      const seconds = share + (index === 0 ? remainder : 0);
      sessions.push({
        id: `summary-${day.date}-${index}`,
        workoutId: 'summary',
        workoutTitle: '',
        userId: '',
        date: day.date,
        completed: true,
        duration: Math.round(seconds / 60),
        caloriesBurned: 0,
        status: 'completed',
        startedAt: new Date(start).toISOString(),
        endedAt: new Date(start + seconds * 1000).toISOString(),
        pausedAt: null,
        pausedTotalSec: 0,
        volumeKg: volumeByMonth.get(day.date.slice(0, 7)) ?? null,
        completedExercises: [],
        totalExercises: 0,
      });
    }
  });
  return sessions;
}
