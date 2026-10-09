import { quizMasterProgress } from '@app/features/quiz/quizModel';
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

  const coreActive = isChallengeActive(challenge);
  const coreClosed = isCoreClosedToday(challenge);

  const workoutSlot: HomeSlide | null = hasResumableSession
    ? SLIDES.resume
    : workoutDoneToday
    ? null
    : SLIDES.workout;
  const coreSlot: HomeSlide | null =
    coreActive && !coreClosed ? SLIDES.core33 : null;

  const pending: HomeSlide[] =
    core33FirstPriority && !hasResumableSession
      ? [coreSlot, workoutSlot].filter((slide): slide is HomeSlide => slide !== null)
      : [workoutSlot, coreSlot].filter((slide): slide is HomeSlide => slide !== null);

  if (pending.length === 0) {
    return [SLIDES.allDone];
  }

  const closed: HomeSlide[] = [];
  if (workoutDoneToday) {
    closed.push(SLIDES.workoutDone);
  }
  if (coreActive && coreClosed) {
    closed.push(SLIDES.core33Closed);
  }
  return [...pending, ...closed];
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
  DEFAULT_WATER_GOAL_GLASSES,
  GLASS_ML,
  toGlasses,
} from '@app/features/nutrition/nutritionModel';

// ── Tu día ─────────────────────────────────────────────────────────────────
export type DayRingKind = 'core33' | 'workout' | 'nutrition' | 'hydration';

export type DayRing = {
  kind: DayRingKind;
  label: string;
  value: string;
  unit: string;
  progress: number; // 0–1
  done: boolean;
};

export type DayRingsInput = {
  mode: HomeMode;
  challenge: HomeChallengeState;
  workout: {
    minutesToday: number; // trainedMinutesToday
    completedToday: boolean; // a session completed today closes the ring
    targetMinutes: number;
  };
  nutrition: { hasPlan: boolean; calories: number; targetCalories: number };
  hydration: { todayMl: number; goalGlasses: number };
};

const clamp01 = (value: number) =>
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

export { formatThousands } from '@app/features/nutrition/nutritionModel';

export function buildDayRings({
  mode,
  challenge,
  workout,
  nutrition,
  hydration,
}: DayRingsInput): { rings: DayRing[]; dayPct: number } {
  const showCore =
    isChallengeActive(challenge) &&
    (mode === 'workout' || mode === 'resume' || mode === 'workoutDone');

  const first: DayRing = showCore
    ? {
        kind: 'core33',
        label: 'Core 33',
        value: `${challenge!.completedToday}/${challenge!.totalHabits}`,
        unit: 'hábitos',
        progress: clamp01(
          challenge!.completedToday / Math.max(challenge!.totalHabits, 1),
        ),
        done: isCoreClosedToday(challenge),
      }
    : {
        kind: 'workout',
        label: 'Entreno',
        value: String(workout.minutesToday),
        unit: `de ${workout.targetMinutes} min`,
        progress: workout.completedToday
          ? 1
          : clamp01(workout.minutesToday / Math.max(workout.targetMinutes, 1)),
        done:
          workout.completedToday ||
          workout.minutesToday >= Math.max(workout.targetMinutes, 1),
      };

  const glasses = toGlasses(hydration.todayMl);
  const goal = Math.max(1, hydration.goalGlasses);
  const hydrationDone = glasses >= goal;

  const rings: DayRing[] = [
    first,
    {
      kind: 'nutrition',
      label: nutrition.hasPlan ? 'Nutrición' : 'Nutrición · sin plan',
      value: formatThousands(nutrition.calories),
      unit: 'kcal',
      progress: nutrition.hasPlan
        ? ratio(nutrition.calories, nutrition.targetCalories)
        : 0,
      done:
        nutrition.hasPlan &&
        nutrition.calories >= Math.max(nutrition.targetCalories, 1),
    },
    {
      kind: 'hydration',
      label: hydrationDone ? 'Hidratación · cumplida' : 'Hidratación',
      value: String(glasses),
      unit: `de ${goal} vasos`,
      progress: clamp01(glasses / goal),
      done: hydrationDone,
    },
  ];

  if (mode === 'new') {
    return {
      rings: rings.map(ring => ({
        ...ring,
        value: '0',
        progress: 0,
        done: false,
      })),
      dayPct: 0,
    };
  }

  const dayPct = Math.round(
    (rings.reduce((total, ring) => total + ring.progress, 0) / rings.length) *
      100,
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

// ── Quiz: progress towards the Quiz Master badge ───────────────────────────
// Same rule as the Quiz portada (quizModel): share of active categories with
// a perfect (100) best score.
export function quizMastery(categories: Array<{ bestScore?: number }>): {
  mastered: number;
  total: number;
  progress: number;
  line: string;
} {
  return quizMasterProgress(categories);
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

// ── Order of the sections under the hero (v2.12) ───────────────────────────
// Tu día → Tu ruta → [Core 33] → banda de ELLIE → [reto oficial] → Para
// entrenar esta semana → Quiz → Wear. "Tu mejor marca" no longer exists.
export type HomeSectionKey =
  | 'rings'
  | 'route'
  | 'core33Invite'
  | 'ellie'
  | 'challenge'
  | 'routines'
  | 'quiz'
  | 'wear';

export function homeSectionOrder(options: {
  core33Invite: boolean;
  challenge: boolean;
}): HomeSectionKey[] {
  const order: (HomeSectionKey | null)[] = [
    'rings',
    'route',
    options.core33Invite ? 'core33Invite' : null,
    'ellie',
    options.challenge ? 'challenge' : null,
    'routines',
    'quiz',
    'wear',
  ];
  return order.filter((key): key is HomeSectionKey => key !== null);
}
