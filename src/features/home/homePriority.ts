import {
  formatThousands,
  ratio,
  toGlasses,
} from '@app/features/nutrition/nutritionModel';
import { getPRMainValue, type PersonalRecord, type PRType } from '@app/shared';

// Inicio v2 hero modes (Home.dc.html · renderVals), in priority order:
// pending session (saved or in progress) → new user → whole day closed →
// workout done → priority (Core 33 or workout).
export type HomeMode =
  | 'new'
  | 'allDone'
  | 'workoutDone'
  | 'resume'
  | 'core33'
  | 'workout';

export const HOME_MODES: HomeMode[] = [
  'new',
  'allDone',
  'workoutDone',
  'resume',
  'core33',
  'workout',
];

export type HomeChallengeState = {
  active: boolean;
  completedToday: number;
  totalHabits: number;
} | null;

export type HomeModeInput = {
  hasCompletedEver: boolean;
  workoutDoneToday: boolean;
  hasResumableSession: boolean;
  challenge: HomeChallengeState;
};

export function isChallengeActive(challenge: HomeChallengeState): boolean {
  return Boolean(challenge?.active);
}

export function isCoreClosedToday(challenge: HomeChallengeState): boolean {
  return Boolean(
    challenge?.active &&
      challenge.totalHabits > 0 &&
      challenge.completedToday >= challenge.totalHabits,
  );
}

export function resolveHomeMode({
  hasCompletedEver,
  workoutDoneToday,
  hasResumableSession,
  challenge,
}: HomeModeInput): HomeMode {
  // A session left halfway goes first, even for a new user (never
  // completed one) or after another workout today.
  if (hasResumableSession) {
    return 'resume';
  }

  if (!hasCompletedEver) {
    return 'new';
  }

  const coreActive = isChallengeActive(challenge);
  const coreClosed = isCoreClosedToday(challenge);

  if (workoutDoneToday) {
    // Without an active Core 33 the workout closes the day on its own.
    return !coreActive || coreClosed ? 'allDone' : 'workoutDone';
  }

  // Same rule as the v1 priority: an open Core 33 day goes first.
  if (coreActive && !coreClosed) {
    return 'core33';
  }

  return 'workout';
}

// ── Hero slides (v2.12 · carrusel de estados) ──────────────────────────────
// One slide per thing of the day: first the pending ones (Retomar | Entreno,
// Core 33), then those already closed today. Nothing pending → a single
// "Día completo". A new user → a single "Primera sesión".
export type HomeSlideKind =
  | 'resume'
  | 'workout'
  | 'core33'
  | 'workoutDone'
  | 'core33Closed'
  | 'allDone'
  | 'new';

export type HomeSlide = {
  kind: HomeSlideKind;
  // Name in the capsule of the indicator.
  label: string;
  // Closed today: the capsule carries an Ember dot.
  closed: boolean;
};

export type HomeSlidesInput = HomeModeInput & {
  // The user pinned Core 33 as the priority: it goes first unless there is a
  // saved session. TODO(core33-priority): no such preference exists yet (BT-54).
  core33FirstPriority?: boolean;
};

const SLIDES: Record<HomeSlideKind, HomeSlide> = {
  resume: { kind: 'resume', label: 'Retomar', closed: false },
  workout: { kind: 'workout', label: 'Entreno', closed: false },
  core33: { kind: 'core33', label: 'Core 33', closed: false },
  workoutDone: { kind: 'workoutDone', label: 'Entreno', closed: true },
  core33Closed: { kind: 'core33Closed', label: 'Core 33', closed: true },
  allDone: { kind: 'allDone', label: 'Día completo', closed: false },
  new: { kind: 'new', label: 'Primera sesión', closed: false },
};

export function slideFor(kind: HomeSlideKind): HomeSlide {
  return SLIDES[kind];
}

export function resolveHomeSlides({
  hasCompletedEver,
  workoutDoneToday,
  hasResumableSession,
  challenge,
  core33FirstPriority = false,
}: HomeSlidesInput): HomeSlide[] {
  // First session: a single slide (a half-done session still goes first).
  if (!hasResumableSession && !hasCompletedEver) {
    return [SLIDES.new];
  }

  // v2.18: at most 2 slides, the action of the day and Core 33 when a
  // challenge is active (Home.dc.html `order`).
  const coreActive = isChallengeActive(challenge);
  const coreClosed = isCoreClosedToday(challenge);
  const coreSlide = coreClosed ? SLIDES.core33Closed : SLIDES.core33;

  if (workoutDoneToday && !hasResumableSession) {
    // Session done: Core 33 (if still open) goes to slide 1.
    return coreActive && !coreClosed ? [SLIDES.core33, SLIDES.workoutDone] : [SLIDES.allDone];
  }

  const action = hasResumableSession ? SLIDES.resume : SLIDES.workout;
  if (!coreActive) {
    return [action];
  }
  return core33FirstPriority && !hasResumableSession && !coreClosed
    ? [coreSlide, action]
    : [action, coreSlide];
}

// Changes when the set or the order of slides changes (to bring the carousel
// back to the first one, the next pending action).
export function slidesKey(slides: readonly HomeSlide[]): string {
  return slides.map(slide => slide.kind).join('|');
}

// ── Training time: active seconds of a session (pauses excluded) ─────────
export type SessionTiming = {
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  pausedAt?: string | null;
  pausedTotalSec?: number;
  // Active minutes stored on the row. While a session runs the app rewrites
  // it on every logged set and on resume ("last recorded activity").
  duration: number;
};

const ms = (value: string | null | undefined) =>
  value ? new Date(value).getTime() : NaN;

// completed → ended − started − pauses; saved → paused_at − started −
// pauses (saving freezes the clock in paused_at); paused → the same up to
// the pause. A running session (not paused) is counted up to its last
// recorded activity only (`duration`), never up to "now": closing the app or
// locking the phone does not keep adding minutes. Falls back to `duration`.
export function sessionActiveSeconds(session: SessionTiming): number {
  const started = ms(session.startedAt);
  const paused = session.pausedTotalSec ?? 0;
  const stored = Math.max(0, session.duration * 60);

  if (session.status === 'in_progress' && !session.pausedAt) {
    return stored;
  }

  let end = NaN;
  if (session.status === 'completed') {
    end = ms(session.endedAt);
  } else if (session.status === 'saved' || session.status === 'in_progress') {
    end = ms(session.pausedAt);
  } else {
    return 0;
  }
  if (!Number.isFinite(started) || !Number.isFinite(end)) {
    return stored;
  }
  return Math.max(0, Math.floor((end - started) / 1000 - paused));
}

// "Entreno" ring: today's completed, saved and in-progress sessions, each
// row once (a resumed session is the same row).
export function trainedMinutesToday(
  sessions: Array<SessionTiming & { id: string }>,
): number {
  const seen = new Set<string>();
  let seconds = 0;
  sessions.forEach(session => {
    if (seen.has(session.id)) {
      return;
    }
    seen.add(session.id);
    seconds += sessionActiveSeconds(session);
  });
  return Math.floor(seconds / 60);
}

// "Tu primera sesión" is for someone who never completed a workout:
// workout_sessions with completed = true, any date, any routine, with or
// without logged sets (count of the whole history) or one completed today.
export function hasCompletedEver(
  completedCount: number | null,
  completedToday: boolean,
): boolean {
  return (completedCount ?? 0) > 0 || completedToday;
}

// ── Water and totals: one model (features/nutrition/nutritionModel) ───────
export {
  GLASS_ML,
  toGlasses,
  waterGoalGlasses,
} from '@app/features/nutrition/nutritionModel';

// ── Tu día (v2.18 §28.14 · anillos dinámicos) ─────────────────────────────
// From outside in: Entrenamiento (always), Core 33 (active challenge),
// Nutrición (with a plan, or without one once kcal are logged) and
// Hidratación (always). "N % completado" is the mean of the visible rings.
export type DayRingKind = 'workout' | 'core33' | 'nutrition' | 'hydration';

export type DayRing = {
  kind: DayRingKind;
  label: string;
  value: string;
  unit: string;
  progress: number; // 0–1
  done: boolean;
  // Text instead of a figure (Descanso, Sin entreno hoy, Hecho): 15/600.
  text?: boolean;
  // "Sin entreno hoy" carries the "Entrenar →" link.
  link?: boolean;
  // Rest day: the ring is full at 30 % opacity.
  opacity?: number;
};

// Today's training: a planned session (its sets), a rest day of the week
// plan, or nothing planned.
export type DayWorkout =
  | { plan: 'session'; setsDone: number; setsTotal: number | null; completedToday: boolean }
  | { plan: 'rest' }
  | { plan: 'none' };

export type DayRingsInput = {
  isNewUser: boolean;
  challenge: HomeChallengeState;
  workout: DayWorkout;
  nutrition: { hasPlan: boolean; calories: number; targetCalories: number };
  // profiles.daily_water_goal; null: no goal (the ring only counts).
  hydration: { todayMl: number; goalGlasses: number | null };
};

const clamp01 = (value: number) =>
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

export { formatThousands } from '@app/features/nutrition/nutritionModel';

function workoutRing(workout: DayWorkout): DayRing {
  const base = { kind: 'workout' as const, label: 'Entrenamiento', unit: '' };
  if (workout.plan === 'rest') {
    return { ...base, value: 'Descanso', progress: 1, done: false, text: true, opacity: 0.3 };
  }
  if (workout.plan === 'none') {
    return { ...base, value: 'Sin entreno hoy', progress: 0, done: false, text: true, link: true };
  }
  const total = workout.setsTotal;
  if (total === null || total <= 0) {
    // Sets unknown (a route session, or the routine has not loaded yet).
    return workout.completedToday
      ? { ...base, value: 'Hecho', progress: 1, done: true, text: true }
      : { ...base, value: '—', unit: 'series', progress: 0, done: false };
  }
  const done = workout.completedToday ? total : Math.min(workout.setsDone, total);
  return {
    ...base,
    value: `${done}/${total}`,
    unit: 'series',
    progress: clamp01(done / total),
    done: done >= total,
  };
}

export function buildDayRings({
  isNewUser,
  challenge,
  workout,
  nutrition,
  hydration,
}: DayRingsInput): { rings: DayRing[]; dayPct: number } {
  const rings: DayRing[] = [workoutRing(workout)];

  if (isChallengeActive(challenge)) {
    rings.push({
      kind: 'core33',
      label: 'Core 33',
      value: `${challenge!.completedToday}/${challenge!.totalHabits}`,
      unit: 'hábitos',
      progress: clamp01(challenge!.completedToday / Math.max(challenge!.totalHabits, 1)),
      done: isCoreClosedToday(challenge),
    });
  }

  if (nutrition.hasPlan || nutrition.calories > 0) {
    rings.push({
      kind: 'nutrition',
      label: nutrition.hasPlan ? 'Nutrición' : 'Nutrición · sin plan',
      value: formatThousands(nutrition.calories),
      unit: 'kcal',
      // Without a plan there is no daily target: the ring stays empty.
      progress: nutrition.hasPlan ? ratio(nutrition.calories, nutrition.targetCalories) : 0,
      done: nutrition.hasPlan && nutrition.calories >= Math.max(nutrition.targetCalories, 1),
    });
  }

  const glasses = toGlasses(hydration.todayMl);
  const goal = hydration.goalGlasses && hydration.goalGlasses > 0 ? hydration.goalGlasses : null;
  const hydrationDone = goal !== null && glasses >= goal;
  rings.push({
    kind: 'hydration',
    label: hydrationDone ? 'Hidratación · cumplida' : 'Hidratación',
    value: String(glasses),
    // "11 / 14 vasos": short enough to stay on one line next to +1.
    unit: goal ? `/ ${goal} vasos` : glasses === 1 ? 'vaso' : 'vasos',
    progress: goal ? clamp01(glasses / goal) : 0,
    done: hydrationDone,
  });

  if (isNewUser) {
    return {
      rings: rings.map(ring => ({
        ...ring,
        value: ring.text ? ring.value : '0',
        progress: 0,
        done: false,
      })),
      dayPct: 0,
    };
  }

  const dayPct = Math.round(
    (rings.reduce((total, ring) => total + ring.progress, 0) / rings.length) * 100,
  );
  return { rings, dayPct };
}

// "Entreno, Core 33 y agua cerrados." listing only what is really closed.
export function allDoneLine(params: {
  coreActive: boolean;
  coreClosed: boolean;
  waterDone: boolean;
}): string {
  const parts = ['Entreno'];

  if (params.coreActive && params.coreClosed) {
    parts.push('Core 33');
  }

  if (params.waterDone) {
    parts.push('agua');
  }

  if (parts.length === 1) {
    return 'Entreno cerrado.';
  }

  const last = parts.pop();
  return `${parts.join(', ')} y ${last} cerrados.`;
}

// ── Tu mejor marca ─────────────────────────────────────────────────────────
// Mini curve (112 × 36 viewport) of an exercise's records over time, as in
// the prototype: oldest → newest, newest is the highlighted dot.
export function prCurve(
  records: PersonalRecord[],
  prType: PRType,
  width = 104,
  height = 34,
): { points: string; last: [number, number] } | null {
  const history = records
    .filter(record => record.prType === prType)
    .sort(
      (left, right) =>
        new Date(left.recordedAt).getTime() -
        new Date(right.recordedAt).getTime(),
    )
    .map(getPRMainValue);

  if (history.length === 0) {
    return null;
  }

  const values = history.length === 1 ? [history[0], history[0]] : history;
  const min = Math.min(...values) - 5;
  const max = Math.max(...values) + 2;
  const range = Math.max(max - min, 1);
  const coords = values.map((value, index): [number, number] => [
    (index / (values.length - 1)) * width,
    height - ((value - min) / range) * (height - 4),
  ]);

  return {
    points: coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '),
    last: coords[coords.length - 1],
  };
}

// ── Formatting ─────────────────────────────────────────────────────────────
const MONTHS = [
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
const WEEKDAYS = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

export function isSameLocalDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

// "Martes 24 sep · Racha de 6 días" (streak only when there is one).
export function homeDateLine(date: Date, streakDays: number): string {
  const day = `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${
    MONTHS[date.getMonth()]
  }`;
  const streak = Number.isFinite(streakDays) ? Math.floor(streakDays) : 0;
  // No separator without a streak.
  return [
    day,
    streak > 0 ? `Racha de ${streak} ${streak === 1 ? 'día' : 'días'}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

// "hoy" or "9 abr".
export function shortDay(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  return isSameLocalDay(date, now)
    ? 'hoy'
    : `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

// Big value + unit line of "Tu mejor marca": "140" · "kg × 1 · 9 abr".
export function bestMarkParts(
  record: PersonalRecord,
  now: Date = new Date(),
): { value: string; unit: string; isNew: boolean } {
  const when = shortDay(record.recordedAt, now);
  const isNew = when === 'hoy';

  switch (record.prType) {
    case 'max_weight':
      return {
        value: String(record.valueWeight ?? 0),
        unit: `kg × ${record.valueReps ?? 1} · ${when}`,
        isNew,
      };
    case 'weight_reps':
      return {
        value: String(record.valueWeight ?? 0),
        unit: `kg × ${record.valueReps ?? 0} · ${when}`,
        isNew,
      };
    case 'max_reps':
      return {
        value: String(record.valueReps ?? 0),
        unit: `reps · ${when}`,
        isNew,
      };
    case 'duration': {
      const seconds = record.valueDurationSec ?? 0;
      const minutes = Math.floor(seconds / 60);
      const rest = String(seconds % 60).padStart(2, '0');
      return { value: `${minutes}:${rest}`, unit: `min · ${when}`, isNew };
    }
    case 'distance':
      return {
        value: formatThousands(record.valueDistanceM ?? 0),
        unit: `m · ${when}`,
        isNew,
      };
  }
}

// ── Order of the sections under the hero (v2.18) ───────────────────────────
// Tu día → [Core 33 invitation] → RECUPERA (Sueño + Respira) → MUÉVETE Y
// COMPITE ([reto oficial] + Tu ruta) → APRENDE Y JUEGA (Athelete Play) →
// Wear. "Tu semana" lives inside Tu día; the ELLIE band and "Para entrenar
// esta semana" are gone.
export type HomeSectionKey = 'day' | 'core33Invite' | 'recovery' | 'compete' | 'play' | 'wear';

export function homeSectionOrder(options: { core33Invite: boolean }): HomeSectionKey[] {
  const order: (HomeSectionKey | null)[] = [
    'day',
    options.core33Invite ? 'core33Invite' : null,
    'recovery',
    'compete',
    'play',
    'wear',
  ];
  return order.filter((key): key is HomeSectionKey => key !== null);
}
