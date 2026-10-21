import { parseRoutineCategory } from '@app/shared/data/workouts';
import type { Workout, WorkoutType } from '@app/shared/domain/types';

// Tu semana (handoff v2.15 §25.1, contract docs/backend/V2_15_SHAPES.md §2):
// the shapes of get_week_plan and plan_week_with_ellie as the app reads them,
// and the pure rules of the screen (labels, editability, steps). Dates are
// local `YYYY-MM-DD` strings; they are never turned into Date objects in UTC.

export type WeekDayKind = 'session' | 'rest' | 'unavailable' | 'empty';
export type WeekDayStatus =
  | 'done'
  | 'today'
  | 'missed'
  | 'planned'
  | 'rest'
  | 'unavailable'
  | 'empty';

export type WeekRoutine = {
  id: string;
  title: string;
  type: WorkoutType;
  duration: number;
  routineCategory: Workout['routineCategory'];
  exerciseCount: number | null;
  thumbKey: string | null;
};

export type WeekDay = {
  date: string;
  kind: WeekDayKind;
  routine: WeekRoutine | null;
  minutes: number | null;
  movedFrom: string | null;
  skippedResolution: 'rescheduled' | 'kept' | null;
  status: WeekDayStatus;
  core33: { active: boolean; day: number; habitsDone: number } | null;
};

export type WeekFocus = 'strength' | 'hypertrophy' | 'endurance' | 'mixed';
export type WeekMinutes = 30 | 45 | 60 | 75;

export type WeekAnswers = {
  // ISO weekdays, 1 = Monday … 7 = Sunday.
  days: number[];
  focus: WeekFocus;
  minutes: WeekMinutes;
  weekStart?: string;
};

export type WeekPlanInfo = {
  id: string;
  weekStart: string;
  origin: 'ellie' | 'manual';
  active: boolean;
  activatedAt: string | null;
  hasPreview: boolean;
};

export type WeekPlan = {
  weekStart: string;
  today: string;
  plan: WeekPlanInfo | null;
  days: WeekDay[];
  summary: { sessionsDone: number; sessionsPlanned: number; restDays: number };
  missed: { date: string; routineId: string | null; proposedDate: string | null } | null;
};

export type WeekPreviewDay = {
  date: string;
  kind: WeekDayKind;
  minutes: number | null;
  routine: WeekRoutine | null;
};

export type WeekPreview = { planId: string; weekStart: string; days: WeekPreviewDay[] };

// ── Parsing ─────────────────────────────────────────────────────────────────
const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
const str = (value: unknown): string | null => (typeof value === 'string' ? value : null);
const num = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const KINDS: readonly WeekDayKind[] = ['session', 'rest', 'unavailable', 'empty'];
const STATUSES: readonly WeekDayStatus[] = [
  'done',
  'today',
  'missed',
  'planned',
  'rest',
  'unavailable',
  'empty',
];
const TYPES: readonly WorkoutType[] = ['strength', 'cardio', 'fullbody', 'mobility', 'hiit'];

export function parseWeekRoutine(raw: unknown): WeekRoutine | null {
  const row = asRecord(raw);
  const id = str(row?.id);
  if (!row || !id) {
    return null;
  }
  return {
    id,
    title: str(row.title) ?? '',
    type: TYPES.find(item => item === row.type) ?? 'strength',
    duration: num(row.duration) ?? 0,
    routineCategory: parseRoutineCategory(str(row.routine_category)),
    exerciseCount: num(row.exercise_count),
    thumbKey: str(row.thumb_key),
  };
}

// A routine of the library (list_routines) as a day of the week shows it.
export function weekRoutineFrom(workout: Workout): WeekRoutine {
  return {
    id: workout.id,
    title: workout.title,
    type: workout.type,
    duration: workout.duration,
    routineCategory: workout.routineCategory,
    exerciseCount: workout.exerciseCount ?? null,
    thumbKey: workout.thumbKey ?? null,
  };
}

function parseKind(value: unknown): WeekDayKind {
  return KINDS.find(item => item === value) ?? 'empty';
}

export function parseWeekDay(raw: unknown): WeekDay {
  const row = asRecord(raw) ?? {};
  const kind = parseKind(row.kind);
  const core = asRecord(row.core33);
  const resolution = row.skipped_resolution;
  return {
    date: str(row.date) ?? '',
    kind,
    routine: kind === 'session' ? parseWeekRoutine(row.routine) : null,
    minutes: num(row.minutes),
    movedFrom: str(row.moved_from),
    skippedResolution: resolution === 'rescheduled' || resolution === 'kept' ? resolution : null,
    status:
      STATUSES.find(item => item === row.status) ??
      (kind === 'session' ? 'planned' : kind),
    core33: core
      ? {
          active: core.active === true,
          day: num(core.day) ?? 0,
          habitsDone: num(core.habits_done) ?? 0,
        }
      : null,
  };
}

export function parseWeekPlan(body: Record<string, unknown>): WeekPlan {
  const plan = asRecord(body.plan);
  const summary = asRecord(body.summary) ?? {};
  const missed = asRecord(body.missed);
  const planId = str(plan?.id);
  return {
    weekStart: str(body.week_start) ?? '',
    today: str(body.today) ?? '',
    plan:
      plan && planId
        ? {
            id: planId,
            weekStart: str(plan.week_start) ?? str(body.week_start) ?? '',
            origin: plan.origin === 'ellie' ? 'ellie' : 'manual',
            active: plan.active === true,
            activatedAt: str(plan.activated_at),
            hasPreview: plan.has_preview === true,
          }
        : null,
    days: Array.isArray(body.days) ? body.days.map(parseWeekDay) : [],
    summary: {
      sessionsDone: num(summary.sessions_done) ?? 0,
      sessionsPlanned: num(summary.sessions_planned) ?? 0,
      restDays: num(summary.rest_days) ?? 0,
    },
    missed:
      missed && str(missed.date)
        ? {
            date: str(missed.date) as string,
            routineId: str(missed.routine_id),
            proposedDate: str(missed.proposed_date),
          }
        : null,
  };
}

export function parseWeekPreview(body: Record<string, unknown>): WeekPreview {
  const days = Array.isArray(body.days) ? body.days : [];
  return {
    planId: str(body.plan_id) ?? '',
    weekStart: str(body.week_start) ?? '',
    days: days.map(raw => {
      const row = asRecord(raw) ?? {};
      const kind = parseKind(row.kind);
      return {
        date: str(row.date) ?? '',
        kind,
        minutes: num(row.minutes),
        routine: kind === 'session' ? parseWeekRoutine(row.routine) : null,
      };
    }),
  };
}

// ── Dates ───────────────────────────────────────────────────────────────────
export const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const DAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function parts(date: string): { y: number; m: number; d: number } {
  const [y, m, d] = date.split('-').map(Number);
  return { y, m, d };
}

// Calendar arithmetic on noon UTC, so no zone or daylight change moves a day.
function toUtcNoon(date: string): Date {
  const { y, m, d } = parts(date);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

export function addDays(date: string, days: number): string {
  const value = toUtcNoon(date);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

// 0 = Monday … 6 = Sunday.
export function weekdayIndex(date: string): number {
  return (toUtcNoon(date).getUTCDay() + 6) % 7;
}

export function dayNumber(date: string): number {
  return parts(date).d;
}

export function isoWeekNumber(date: string): number {
  const value = toUtcNoon(date);
  const thursday = new Date(value);
  thursday.setUTCDate(value.getUTCDate() + 3 - weekdayIndex(date));
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4, 12));
  return (
    1 +
    Math.round(
      ((thursday.getTime() - firstThursday.getTime()) / 86400000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    )
  );
}

// "23 – 29 sep", or "29 sep – 5 oct" across months.
export function weekRangeLabel(weekStart: string): string {
  const end = addDays(weekStart, 6);
  const a = parts(weekStart);
  const b = parts(end);
  return a.m === b.m
    ? `${a.d} – ${b.d} ${MONTHS[b.m - 1]}`
    : `${a.d} ${MONTHS[a.m - 1]} – ${b.d} ${MONTHS[b.m - 1]}`;
}

// "Martes 24 · Hoy"
export function dayLabel(date: string, today: string): string {
  const base = `${DAY_NAMES[weekdayIndex(date)]} ${dayNumber(date)}`;
  return date === today ? `${base} · Hoy` : base;
}

export function dayName(date: string): string {
  return DAY_NAMES[weekdayIndex(date)].toLowerCase();
}

// ── Rules of the screen ─────────────────────────────────────────────────────
export const MINUTES_MIN = 15;
export const MINUTES_MAX = 90;
export const MINUTES_STEP = 5;

export function stepMinutes(current: number, delta: number): number {
  const next = Math.round((current + delta) / MINUTES_STEP) * MINUTES_STEP;
  return Math.min(MINUTES_MAX, Math.max(MINUTES_MIN, next));
}

// Only today and the days ahead can change, and never a session already done.
export function isEditable(day: WeekDay, today: string): boolean {
  return day.date >= today && day.status !== 'done';
}

export function isWorkDay(day: Pick<WeekDay, 'kind' | 'routine'>): boolean {
  return day.kind === 'session' && Boolean(day.routine);
}

// Minutes of a session day (the plan's, else the routine's).
export function dayMinutes(day: Pick<WeekDay, 'minutes' | 'routine'>): number {
  return day.minutes ?? day.routine?.duration ?? 0;
}

// "1 de 5 sesiones hechas · 2 descansos · 1 sin disponibilidad · 6 sin planificar"
export function weekSummaryLine(plan: Pick<WeekPlan, 'days' | 'summary'>): string {
  const rests = plan.days.filter(day => day.kind === 'rest').length;
  const blocked = plan.days.filter(day => day.kind === 'unavailable').length;
  const empty = plan.days.filter(day => day.kind === 'empty').length;
  const sessions = plan.days.filter(day => day.kind === 'session').length;
  const done = plan.days.filter(day => day.status === 'done').length;
  const items = [
    `${done} de ${sessions} ${sessions === 1 ? 'sesión hecha' : 'sesiones hechas'}`,
    `${rests} ${rests === 1 ? 'descanso' : 'descansos'}`,
  ];
  if (blocked) {
    items.push(`${blocked} sin disponibilidad`);
  }
  if (empty) {
    items.push(`${empty} sin planificar`);
  }
  return items.join(' · ');
}

// Inicio · "n de m sesiones".
export function stripLine(plan: Pick<WeekPlan, 'days'>): string {
  const sessions = plan.days.filter(day => day.kind === 'session').length;
  if (sessions === 0) {
    return 'Planifícala';
  }
  const done = plan.days.filter(day => day.status === 'done').length;
  return `${done} de ${sessions} ${sessions === 1 ? 'sesión' : 'sesiones'}`;
}

// Dot under each day pill (25.1): done Ember, planned ink, missed Ember ring,
// empty grey ring, rest and not available without a dot.
export type PillDot = 'done' | 'planned' | 'missed' | 'empty' | 'none';

export function pillDot(day: WeekDay): PillDot {
  switch (day.status) {
    case 'done':
      return 'done';
    case 'missed':
      return 'missed';
    case 'empty':
      return 'empty';
    case 'today':
    case 'planned':
      return 'planned';
    default:
      return 'none';
  }
}

// "Toca el día al que quieres mover…": the targets are today and the days
// ahead, other than the one being moved.
export function isMoveTarget(date: string, from: string, today: string): boolean {
  return date >= today && date !== from;
}

// After choosing a session in "Hazla tú", the view jumps to the next empty day.
export function nextEmptyIndex(days: WeekDay[], from: number): number {
  return days.findIndex((day, index) => index > from && day.kind === 'empty');
}

// The note on a past day.
export function pastNote(day: WeekDay, movedTo: string | null): string {
  if (day.status === 'done') {
    return `Completada · ${dayMinutes(day)} min`;
  }
  if (day.status === 'missed' || (day.kind === 'session' && day.skippedResolution)) {
    if (day.skippedResolution === 'rescheduled' && movedTo) {
      return `Se movió al ${dayName(movedTo)}.`;
    }
    return 'Esta sesión quedó sin hacer.';
  }
  return 'Día pasado.';
}

// ELLIE's band for a missed session (she proposes, the user confirms).
export function missedText(plan: WeekPlan): string | null {
  const missed = plan.missed;
  if (!missed) {
    return null;
  }
  const day = plan.days.find(item => item.date === missed.date);
  const title = day?.routine?.title ?? 'la sesión';
  const when = missed.date === addDays(plan.today, -1) ? 'Ayer' : `El ${dayName(missed.date)}`;
  if (!missed.proposedDate) {
    return `${when} no hiciste ${title}. Esta semana no queda un día libre para pasarla.`;
  }
  return `${when} no hiciste ${title}. Lo paso al ${dayName(missed.proposedDate)}, que tenías libre, y el resto de la semana queda igual.`;
}

// ── Planificar con ELLIE ────────────────────────────────────────────────────
export const FOCUS_OPTIONS: { key: WeekFocus; title: string; subtitle: string }[] = [
  { key: 'strength', title: 'Fuerza', subtitle: 'Cargas altas, básicos y progresión.' },
  { key: 'hypertrophy', title: 'Hipertrofia', subtitle: 'Volumen por grupo muscular.' },
  { key: 'endurance', title: 'Resistencia', subtitle: 'Circuitos y ritmo cardiaco alto.' },
  { key: 'mixed', title: 'Mixto', subtitle: 'Un poco de todo, equilibrado.' },
];

export const MINUTE_OPTIONS: WeekMinutes[] = [30, 45, 60, 75];

export const GENERATION_STEPS = [
  'Revisando tus días disponibles',
  'Repartiendo grupos musculares',
  'Cuadrando descansos y Core 33',
];
// One step every 650 ms (25.1).
export const GENERATION_STEP_MS = 650;

export const ELLIE_QUESTIONS = [
  '¿Qué días puedes entrenar esta semana?',
  '¿En qué quieres poner el foco?',
  '¿Cuánto tiempo tienes por sesión?',
];

// ISO weekday (1–7) of each date of the week that is today or later.
export function selectableWeekdays(weekStart: string, today: string): number[] {
  return Array.from({ length: 7 }, (_, index) => index + 1).filter(
    weekday => addDays(weekStart, weekday - 1) >= today,
  );
}

// "4 días disponibles desde hoy. El lunes ya pasó."
export function availabilityLine(chosen: number[], weekStart: string, today: string): string {
  const selectable = selectableWeekdays(weekStart, today);
  const count = chosen.filter(day => selectable.includes(day)).length;
  const head = `${count} ${count === 1 ? 'día disponible' : 'días disponibles'} desde hoy.`;
  const past = 7 - selectable.length;
  if (past === 0) {
    return head;
  }
  if (past === 1) {
    return `${head} El lunes ya pasó.`;
  }
  return `${head} Los días hasta el ${DAY_NAMES[past - 1].toLowerCase()} ya pasaron.`;
}

// "Listo. 4 sesiones de fuerza y 2 días para recuperar."
export function previewLine(preview: WeekPreview, today: string, focus: WeekFocus): string {
  const ahead = preview.days.filter(day => day.date >= today);
  const sessions = ahead.filter(day => day.kind === 'session').length;
  const rests = ahead.filter(day => day.kind === 'rest').length;
  const focusName = FOCUS_OPTIONS.find(option => option.key === focus)?.title.toLowerCase() ?? '';
  return `Listo. ${sessions} ${sessions === 1 ? 'sesión' : 'sesiones'} de ${focusName} y ${rests} ${
    rests === 1 ? 'día' : 'días'
  } para recuperar.`;
}
