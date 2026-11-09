import type { SessionType } from '@app/components/v2/SessionTypeChip';
import {
  addDays,
  weekStartOf,
  weekdayIndex,
  type PlanSessionInfo,
  type WeekDay,
  type WeekPlan,
  type WeekTrainingPlan,
} from '@app/features/week/weekModel';
import type {
  PlanAnchor,
  PlanDetailBlock,
  PlanDetailGoal,
  PlanDetailWeek,
  PlanMonth,
  PlanMonthDay,
  PlanWeekKind,
  TrainingPlanDetail,
  TrainingPlanState,
} from '@app/services/supabase/trainingPlan';
import { isDeloadWeek } from '@app/features/trainingPlan/trainingPlanModel';

// Pure rules of the plan views (handoff v2.21 §31.0 states, §31.4 Semana,
// §31.5 Mes, §31.6 Plan): what each day is, what a tap does, the month grid,
// and the bars and figures of Plan.

// ── Day states (31.0 table) ─────────────────────────────────────────────────
// done · missed · today (pending, today) · pending · substituted · skipped ·
// added (a routine on a rest day of the plan) · pause (a free day of the
// pause) · rest (no session) · empty.
export type PlanDayState =
  | 'done'
  | 'missed'
  | 'today'
  | 'pending'
  | 'substituted'
  | 'skipped'
  | 'added'
  | 'pause'
  | 'rest'
  | 'empty';

export type PlanContext = {
  today: string;
  paused: boolean;
  pausedUntil: string | null;
};

// The days of a pause: from today up to (not including) the return date.
// Sessions done before the pause are not moved, so past days never are.
export function isInPause(date: string, ctx: PlanContext): boolean {
  return ctx.paused && Boolean(ctx.pausedUntil) && date >= ctx.today && date < (ctx.pausedUntil as string);
}

export type PlanDayView = {
  date: string;
  state: PlanDayState;
  type: SessionType | null;
  // A routine added by the athlete (not a plan session).
  added: boolean;
  title: string;
  minutes: number | null;
  routineId: string | null;
  exerciseCount: number | null;
  substitutedBy: string | null;
  // Moved here from another day (still pending).
  movedFrom: string | null;
  restLabel: string | null;
};

function sessionState(session: PlanSessionInfo, date: string, today: string): PlanDayState {
  switch (session.status) {
    case 'done':
      return 'done';
    case 'missed':
      return 'missed';
    case 'substituted':
      return 'substituted';
    case 'skipped':
      return 'skipped';
    case 'paused':
      return 'pause';
    default:
      // The server marks a missed session lazily: a pending one whose day
      // has passed already reads as missed.
      return date === today ? 'today' : date < today ? 'missed' : 'pending';
  }
}

export function planDayView(day: WeekDay, ctx: PlanContext): PlanDayView {
  const session = day.planSession ?? null;
  const base = {
    date: day.date,
    type: session?.type ?? null,
    title: session?.title ?? day.routine?.title ?? '',
    minutes: session?.minutes ?? day.minutes ?? day.routine?.duration ?? null,
    routineId: day.routine?.id ?? null,
    exerciseCount: day.routine?.exerciseCount ?? null,
    substitutedBy: session?.substitutedByName ?? null,
    movedFrom: session?.moved ? session.originalDate : null,
    restLabel: day.restLabel ?? null,
  };
  if (isInPause(day.date, ctx)) {
    return { ...base, state: 'pause', added: false };
  }
  if (session) {
    return { ...base, state: sessionState(session, day.date, ctx.today), added: false };
  }
  if (day.kind === 'session' && day.routine) {
    return { ...base, state: day.status === 'done' ? 'done' : 'added', added: true };
  }
  return { ...base, state: day.kind === 'rest' ? 'rest' : 'empty', added: false };
}

export function planDayViews(week: WeekPlan, ctx: PlanContext): PlanDayView[] {
  return week.days.map(day => planDayView(day, ctx));
}

// What a tap on a day does (31.4): a free day of the pause and a rest day
// open nothing; a substituted session opens the routine that replaced it; a
// past day opens its summary; today or ahead opens the routine's detail (the
// session with its recommended weight arrives in part 3).
export type PlanDayAction =
  | { kind: 'none' }
  | { kind: 'routine'; routineId: string }
  | { kind: 'past' };

export function planDayAction(view: PlanDayView, today: string): PlanDayAction {
  if (view.state === 'pause') {
    return { kind: 'none' };
  }
  if (view.state === 'substituted' && view.routineId) {
    return { kind: 'routine', routineId: view.routineId };
  }
  if (view.state === 'rest' || view.state === 'empty') {
    return { kind: 'none' };
  }
  if (view.date < today) {
    return { kind: 'past' };
  }
  return view.routineId ? { kind: 'routine', routineId: view.routineId } : { kind: 'none' };
}

// The sessions of the week list: plan sessions and added routines, by date.
export function weekSessions(views: PlanDayView[]): PlanDayView[] {
  return views.filter(view => view.state !== 'rest' && view.state !== 'empty' && view.state !== 'pause');
}

// "Sesiones · x de y hechas": the plan sessions only (an added routine is not
// part of the plan's count).
export function sessionsCount(views: PlanDayView[]): { done: number; total: number } {
  const planned = views.filter(view => !view.added && view.state !== 'rest' && view.state !== 'empty' && view.state !== 'pause');
  return { done: planned.filter(view => view.state === 'done').length, total: planned.length };
}

// Próxima sesión: the first plan session of the week still to do.
export function nextSession(views: PlanDayView[]): PlanDayView | null {
  return (
    views.find(view => !view.added && (view.state === 'today' || view.state === 'pending')) ?? null
  );
}

// ── Header of the plan (31.4) ───────────────────────────────────────────────
// Segments of the phase line, by block of 4 weeks.
export function segmentBlocks<T>(segments: T[]): T[][] {
  const blocks: T[][] = [];
  for (let index = 0; index < segments.length; index += 4) {
    blocks.push(segments.slice(index, index + 4));
  }
  return blocks;
}

export type SegmentTone = 'ink' | 'current' | 'deload' | 'upcoming';

// Done in ink, the current one in Ember, the deloads still to come in blue
// (the rest of the upcoming ones, in hairline).
export function segmentTone(segment: WeekTrainingPlan['segments'][number]): SegmentTone {
  if (segment.state === 'current') {
    return 'current';
  }
  if (segment.state === 'done') {
    return 'ink';
  }
  return isDeloadWeek(segment.kind) ? 'deload' : 'upcoming';
}

// 1 or 2 weeks of pause, from what is left of it (the server stores the
// total in the dates only).
export function pauseWeeks(today: string, pausedUntil: string): 1 | 2 {
  const left = Math.max(0, Math.round((dayNumberOf(pausedUntil) - dayNumberOf(today))));
  return left > 7 ? 2 : 1;
}

function dayNumberOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

// The plan's weeks as the screen navigates them: from the week of the start
// date to the week of the end date. Before the start, the plan's first week
// is the "current" one (it shows "Empieza el …").
export function planWeekRange(
  start: string | null,
  end: string | null,
  today: string,
): { first: string; last: string; current: string } {
  const currentCalendar = weekStartOf(today);
  const first = start ? weekStartOf(start) : currentCalendar;
  const last = end ? weekStartOf(end) : currentCalendar;
  const lastClamped = last < first ? first : last;
  const current = currentCalendar < first ? first : currentCalendar > lastClamped ? lastClamped : currentCalendar;
  return { first, last: lastClamped, current };
}

export const beforeStart = (state: Pick<TrainingPlanState, 'weekIndex'> | null | undefined) =>
  state !== null && state !== undefined && state.weekIndex === null;

// ── Mes (31.5) ──────────────────────────────────────────────────────────────
export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const index = y * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export type MonthCell = { date: string; inMonth: boolean };

// The grid of a month: Monday-first rows from the week of the 1st, 5 or 6.
export function monthGrid(month: string): MonthCell[][] {
  const first = `${month}-01`;
  const offset = weekdayIndex(first);
  const rows = Math.ceil((offset + daysInMonth(month)) / 7);
  const start = addDays(first, -offset);
  return Array.from({ length: rows }, (_row, row) =>
    Array.from({ length: 7 }, (_col, col) => {
      const date = addDays(start, row * 7 + col);
      return { date, inMonth: monthKey(date) === month };
    }),
  );
}

export function monthDayState(day: PlanMonthDay | undefined, today: string): PlanDayState {
  if (!day) {
    return 'empty';
  }
  if (day.inPause) {
    return 'pause';
  }
  if (!day.type) {
    return day.addedRoutine ? (day.status === 'done' ? 'done' : 'added') : 'rest';
  }
  switch (day.status) {
    case 'done':
      return 'done';
    case 'missed':
      return 'missed';
    case 'substituted':
      return 'substituted';
    case 'skipped':
      return 'skipped';
    default:
      return day.date === today ? 'today' : day.date < today ? 'missed' : 'pending';
  }
}

export type MonthRow = {
  cells: (MonthCell & { day: PlanMonthDay | undefined; state: PlanDayState })[];
  weekIndex: number | null;
  kind: PlanWeekKind | null;
  // Every day of the row is a free day of the pause.
  allPaused: boolean;
};

// The month's rows with their week (S5…) and kind. The week of a row is the
// one the answer lists for any of its days, or whose dates cover it.
export function monthRows(month: string, data: PlanMonth | undefined, today: string): MonthRow[] {
  const byDate = new Map((data?.days ?? []).map(day => [day.date, day]));
  return monthGrid(month).map(row => {
    const cells = row.map(cell => {
      const day = byDate.get(cell.date);
      return { ...cell, day, state: monthDayState(day, today) };
    });
    const dates = row.map(cell => cell.date);
    const known = cells.map(cell => cell.day?.weekIndex).find(index => index !== null && index !== undefined);
    const weeks = data?.weeks ?? [];
    const week =
      weeks.find(item => known !== undefined && item.weekIndex === known) ??
      weeks.find(item =>
        item.startDate && item.endDate
          ? dates.some(date => date >= (item.startDate as string) && date <= (item.endDate as string))
          : false,
      );
    return {
      cells,
      weekIndex: week?.weekIndex ?? known ?? null,
      kind: week?.kind ?? null,
      allPaused: cells.every(cell => cell.state === 'pause'),
    };
  });
}

// Months the plan covers: from the start date's to the end date's.
export function monthRange(start: string | null, end: string | null, today: string): { first: string; last: string } {
  const first = monthKey(start ?? today);
  const last = monthKey(end ?? today);
  return { first, last: last < first ? first : last };
}

// "Semanas 5 a 9" of the rows that carry a week.
export function monthWeeksSpan(rows: MonthRow[]): { a: number; b: number } | null {
  const weeks = rows.map(row => row.weekIndex).filter((week): week is number => week !== null);
  return weeks.length > 0 ? { a: Math.min(...weeks), b: Math.max(...weeks) } : null;
}

// ── Plan (31.6) ─────────────────────────────────────────────────────────────
export type BarTone = 'done' | 'current' | 'upcoming' | 'deload-done' | 'deload-upcoming';

export type PlanBar = {
  weekIndex: number;
  // 0–1 of the container.
  height: number;
  tone: BarTone;
  flag: boolean;
};

const BAR_MIN = 0.36;
const BAR_DELOAD = 0.48;

// Bars of a block: height by the week's relative load (normalised by the
// highest of the plan; deloads are never taller than 48 %), tone by where the
// week is, a flag on the test week.
export function blockBars(block: PlanDetailBlock, blocks: PlanDetailBlock[], currentWeek: number): PlanBar[] {
  const loads = blocks.flatMap(item => item.weeks.map(week => week.load)).filter((load): load is number => load !== null);
  const max = Math.max(...loads, 0);
  return block.weeks.map((week, index) => barOf(week, index, max, currentWeek));
}

function barOf(week: PlanDetailWeek, index: number, max: number, currentWeek: number): PlanBar {
  const deload = isDeloadWeek(week.kind);
  const known = week.load !== null && max > 0;
  const relative = known ? BAR_MIN + (1 - BAR_MIN) * Math.min(1, (week.load as number) / max) : 0.6 + index * 0.1;
  const height = deload ? Math.min(relative, BAR_DELOAD) : Math.min(1, relative);
  const past = week.weekIndex < currentWeek;
  const tone: BarTone =
    week.weekIndex === currentWeek
      ? 'current'
      : past
        ? deload
          ? 'deload-done'
          : 'done'
        : deload
          ? 'deload-upcoming'
          : 'upcoming';
  return { weekIndex: week.weekIndex, height, tone, flag: week.kind === 'descarga_test' };
}

export type PlanStat = { key: 'progress' | 'adherence' | 'sessions'; value: string; unit: string };

export function planStats(detail: TrainingPlanDetail): { stats: PlanStat[]; pct: number } {
  const pct = Math.min(100, Math.max(0, detail.progressPct ?? 0));
  return {
    pct,
    stats: [
      { key: 'progress', value: String(Math.round(detail.progressPct ?? 0)), unit: '%' },
      {
        key: 'adherence',
        value: detail.adherencePct === null ? '—' : String(Math.round(detail.adherencePct)),
        unit: detail.adherencePct === null ? '' : '%',
      },
      { key: 'sessions', value: String(detail.sessionsDone), unit: `/${detail.sessionsTotal}` },
    ],
  };
}

// Epley, as the plan computes it.
export const epley = (kg: number, reps: number) => kg * (1 + reps / 30);

const roundHalf = (value: number) => Math.round(value * 2) / 2;

// The anchor a goal belongs to: by exercise id, else by name or slug.
export function goalAnchor(goal: PlanDetailGoal, anchors: PlanAnchor[]): PlanAnchor | null {
  return (
    anchors.find(anchor => goal.exerciseId !== null && anchor.exerciseId === goal.exerciseId) ??
    anchors.find(anchor => goal.exerciseName !== null && anchor.name.toLowerCase() === goal.exerciseName.toLowerCase()) ??
    null
  );
}

export function latestE1rm(anchor: PlanAnchor): number | null {
  const values = anchor.e1rmByWeek.filter(row => row.e1rm !== null).sort((a, b) => a.weekIndex - b.weekIndex);
  return values.length > 0 ? (values[values.length - 1].e1rm as number) : null;
}

// Projection of an anchor as an e1RM, week by week (the planned load).
export function projectedE1rm(anchor: PlanAnchor): { weekIndex: number; e1rm: number }[] {
  return anchor.projection.flatMap(row => {
    if (row.recommendedKg === null) {
      return [];
    }
    return [{ weekIndex: row.weekIndex, e1rm: row.repMax !== null ? epley(row.recommendedKg, row.repMax) : row.recommendedKg }];
  });
}

export type GoalProgress = {
  // The figure now (1RM estimate or max reps), null: no record yet.
  current: number | null;
  target: number;
  kind: 'kg' | 'reps';
  // 0–1 of the bar.
  pct: number;
  remaining: number | null;
  // First planned week whose projection reaches the target.
  reachWeek: number | null;
};

export function goalProgress(goal: PlanDetailGoal, anchors: PlanAnchor[]): GoalProgress {
  const anchor = goal.kind === 'kg' ? goalAnchor(goal, anchors) : null;
  const registered = anchor ? latestE1rm(anchor) : null;
  const current = goal.kind === 'kg' ? registered : registered ?? goal.startEstimate;
  const reach = anchor
    ? projectedE1rm(anchor)
        .sort((a, b) => a.weekIndex - b.weekIndex)
        .find(row => row.e1rm >= goal.target)
    : undefined;
  return {
    current: current === null ? null : roundHalf(current),
    target: goal.target,
    kind: goal.kind,
    pct: current === null ? 0 : Math.min(1, Math.max(0, current / goal.target)),
    remaining: current === null ? null : Math.max(0, roundHalf(goal.target - current)),
    reachWeek: reach?.weekIndex ?? null,
  };
}

export type AnchorBarTone = 'done' | 'current' | 'deload' | 'projection' | 'none';
export type AnchorBar = { weekIndex: number; height: number; tone: AnchorBarTone };

// 12 (or 8, or 4) bars: the registered e1RM in ink (the current week in
// Ember, a deload in blue), the rest as the planned projection in outline.
export function anchorBars(
  anchor: PlanAnchor,
  weeks: { weekIndex: number; kind: PlanWeekKind }[],
  currentWeek: number,
): { bars: AnchorBar[]; hasRecords: boolean; projectionEnd: number | null } {
  const registered = new Map(anchor.e1rmByWeek.filter(row => row.e1rm !== null).map(row => [row.weekIndex, row.e1rm as number]));
  const projected = new Map(projectedE1rm(anchor).map(row => [row.weekIndex, row.e1rm]));
  const values = [...registered.values(), ...projected.values()];
  const min = values.length > 0 ? Math.min(...values) - 5 : 0;
  const max = values.length > 0 ? Math.max(...values) : 1;
  const scale = (value: number) => 0.17 + (0.83 * (value - min)) / Math.max(max - min, 1);
  const kinds = new Map(weeks.map(week => [week.weekIndex, week.kind]));
  const lastProjected = [...projected.entries()].sort((a, b) => a[0] - b[0]).pop();
  return {
    hasRecords: registered.size > 0,
    projectionEnd: lastProjected ? Math.round((lastProjected[1] / 2.5)) * 2.5 : null,
    bars: weeks.map(({ weekIndex }) => {
      const real = registered.get(weekIndex);
      if (real !== undefined) {
        const deload = isDeloadWeek(kinds.get(weekIndex) ?? 'carga');
        return {
          weekIndex,
          height: scale(real),
          tone: weekIndex === currentWeek ? 'current' : deload ? 'deload' : 'done',
        };
      }
      const planned = projected.get(weekIndex);
      return planned !== undefined
        ? { weekIndex, height: scale(planned), tone: 'projection' }
        : { weekIndex, height: 0.17, tone: 'none' };
    }),
  };
}

// ── Inicio y Entrenos (31.4) ────────────────────────────────────────────────
export type PlanSessionRef = {
  view: PlanDayView;
  // The week the session belongs to.
  weekIndex: number | null;
  weeks: number;
};

// The athlete's next plan session out of the weeks read: today's or the
// next one, in this week or, when nothing is left, the next.
export function nextPlanSession(
  weeks: (WeekPlan | null | undefined)[],
  ctx: PlanContext,
): PlanSessionRef | null {
  for (const week of weeks) {
    if (!week) {
      continue;
    }
    const found = nextSession(planDayViews(week, ctx));
    if (found) {
      return {
        view: found,
        weekIndex: week.trainingPlan?.weekIndex ?? null,
        weeks: week.trainingPlan?.weeks ?? 0,
      };
    }
  }
  return null;
}

// Does the first week still have a session to do? (When not, Inicio reads
// the next week for "Mañana · Semana 7 de 12".)
export function hasPendingPlanSession(week: WeekPlan | null | undefined, ctx: PlanContext): boolean {
  return week ? nextSession(planDayViews(week, ctx)) !== null : false;
}

export function planContext(
  today: string,
  state: Pick<TrainingPlanState, 'state' | 'pausedUntil'> | null | undefined,
  header?: Pick<WeekTrainingPlan, 'pausedUntil'> | null,
): PlanContext {
  const paused = state?.state === 'paused';
  return { today, paused, pausedUntil: paused ? state?.pausedUntil ?? header?.pausedUntil ?? null : null };
}
