import type { WorkoutExercise } from '@app/shared';

// Workout Session v2 (Session.dc.html): pure helpers for the plan, the set
// cursor, the session clock (pauses excluded) and the rest timer.

export const DEFAULT_SETS = 3;
export const DEFAULT_REST_SEC = 60;
export const REST_STEP_SEC = 30;
// Last seconds of a rest: ring and halo turn Ember (handoff, Rest Timer).
export const REST_WARNING_SEC = 3;
// "Tu turno" stays this long before the active card comes back.
export const YOUR_TURN_MS = 1500;

// ── Plan ────────────────────────────────────────────────────────────────────
export type PlannedExercise = {
  position: number; // 0-based, = workout_session_exercises.position
  templateExerciseId: string | null;
  exerciseId: string | null;
  name: string;
  sets: number;
  reps: number | null;
  durationSec: number | null;
  restSec: number;
};

export function buildPlan(exercises: WorkoutExercise[]): PlannedExercise[] {
  return exercises.map((exercise, position) => ({
    position,
    templateExerciseId: exercise.id || null,
    exerciseId: exercise.exerciseId ?? null,
    name: exercise.name,
    sets: exercise.sets && exercise.sets > 0 ? exercise.sets : DEFAULT_SETS,
    reps: exercise.duration ? null : exercise.reps ?? null,
    durationSec: exercise.duration ? exercise.duration : null,
    restSec: exercise.restTime > 0 ? exercise.restTime : DEFAULT_REST_SEC,
  }));
}

// ── Sets ────────────────────────────────────────────────────────────────────
export type LoggedSet = {
  position: number;
  setIndex: number; // 0-based, = workout_session_sets.set_index
  reps: number | null;
  weightKg: number | null;
  durationSec: number | null;
  id?: string; // workout_session_sets.id once saved
};

export function setsFor(logs: LoggedSet[], position: number): LoggedSet[] {
  return logs
    .filter(log => log.position === position)
    .sort((a, b) => a.setIndex - b.setIndex);
}

export function isExerciseDone(
  exercise: PlannedExercise,
  logs: LoggedSet[],
): boolean {
  return setsFor(logs, exercise.position).length >= exercise.sets;
}

export type Cursor = { position: number; setIndex: number };

// First exercise (in order) with sets left; null when everything is done.
export function currentCursor(
  plan: PlannedExercise[],
  logs: LoggedSet[],
): Cursor | null {
  for (const exercise of plan) {
    const done = setsFor(logs, exercise.position).length;
    if (done < exercise.sets) {
      return { position: exercise.position, setIndex: done };
    }
  }
  return null;
}

export function completedExerciseCount(
  plan: PlannedExercise[],
  logs: LoggedSet[],
): number {
  return plan.filter(exercise => isExerciseDone(exercise, logs)).length;
}

// Template exercise ids of the finished exercises (legacy
// workout_sessions.completed_exercises).
export function completedExerciseIds(
  plan: PlannedExercise[],
  logs: LoggedSet[],
): string[] {
  return plan
    .filter(exercise => isExerciseDone(exercise, logs))
    .map(exercise => exercise.templateExerciseId ?? String(exercise.position));
}

// Fraction (0–1) of each exercise for the progress segments.
export function segmentProgress(
  plan: PlannedExercise[],
  logs: LoggedSet[],
): number[] {
  return plan.map(exercise =>
    Math.min(1, setsFor(logs, exercise.position).length / exercise.sets),
  );
}

// Values proposed for the next set: the last set logged in this exercise,
// otherwise the plan (reps) and the user's last weight for the exercise.
export function suggestedSet(
  exercise: PlannedExercise,
  logs: LoggedSet[],
  lastWeightKg?: number | null,
): { reps: number | null; weightKg: number | null } {
  const previous = setsFor(logs, exercise.position).pop();
  return {
    reps: previous?.reps ?? exercise.reps,
    weightKg: previous?.weightKg ?? lastWeightKg ?? null,
  };
}

// Upserts a set into the local list (same exercise + index replaces).
export function withSet(logs: LoggedSet[], next: LoggedSet): LoggedSet[] {
  return [
    ...logs.filter(
      log =>
        !(log.position === next.position && log.setIndex === next.setIndex),
    ),
    next,
  ];
}

// What comes after logging the set at `cursor`.
export type RestKind = 'set' | 'exercise';
export function restAfter(
  plan: PlannedExercise[],
  logsAfter: LoggedSet[],
  cursor: Cursor,
): { kind: RestKind; restSec: number } | null {
  const next = currentCursor(plan, logsAfter);
  if (!next) {
    return null; // all done: no rest, "Finalizar entreno"
  }
  const exercise = plan[cursor.position];
  return {
    kind: next.position === cursor.position ? 'set' : 'exercise',
    restSec: exercise?.restSec ?? DEFAULT_REST_SEC,
  };
}

// ── Clock ───────────────────────────────────────────────────────────────────
export type ClockState = {
  startedAt: number; // ms
  pausedTotalSec: number;
  pausedAt: number | null; // ms, while paused
};

// Training seconds: wall time since the start minus every pause (the current
// one included). Rest counts: it is part of the workout.
export function activeSeconds(clock: ClockState, now: number): number {
  const pausedNow = clock.pausedAt ? Math.max(0, now - clock.pausedAt) : 0;
  const elapsed = now - clock.startedAt - clock.pausedTotalSec * 1000 - pausedNow;
  return Math.max(0, Math.floor(elapsed / 1000));
}

export function pauseClock(clock: ClockState, now: number): ClockState {
  return clock.pausedAt ? clock : { ...clock, pausedAt: now };
}

export function resumeClock(clock: ClockState, now: number): ClockState {
  if (!clock.pausedAt) {
    return clock;
  }
  return {
    ...clock,
    pausedAt: null,
    pausedTotalSec:
      clock.pausedTotalSec +
      Math.max(0, Math.round((now - clock.pausedAt) / 1000)),
  };
}

export function pausedForSeconds(clock: ClockState, now: number): number {
  return clock.pausedAt
    ? Math.max(0, Math.floor((now - clock.pausedAt) / 1000))
    : 0;
}

// ── Rest timer ──────────────────────────────────────────────────────────────
export type RestState = {
  kind: RestKind;
  totalSec: number;
  endsAt: number; // ms
  // Remaining ms frozen while the session is paused.
  frozenRemainingMs: number | null;
};

export function startRest(
  kind: RestKind,
  restSec: number,
  now: number,
): RestState {
  return {
    kind,
    totalSec: restSec,
    endsAt: now + restSec * 1000,
    frozenRemainingMs: null,
  };
}

export function restRemainingMs(rest: RestState, now: number): number {
  return rest.frozenRemainingMs ?? Math.max(0, rest.endsAt - now);
}

export function addRestTime(
  rest: RestState,
  now: number,
  seconds = REST_STEP_SEC,
): RestState {
  const remaining = restRemainingMs(rest, now) + seconds * 1000;
  return {
    ...rest,
    totalSec: rest.totalSec + seconds,
    endsAt: now + remaining,
    frozenRemainingMs:
      rest.frozenRemainingMs === null ? null : remaining,
  };
}

// The rest stops while the session is paused and continues afterwards.
export function freezeRest(rest: RestState, now: number): RestState {
  return rest.frozenRemainingMs !== null
    ? rest
    : { ...rest, frozenRemainingMs: restRemainingMs(rest, now) };
}

export function thawRest(rest: RestState, now: number): RestState {
  return rest.frozenRemainingMs === null
    ? rest
    : { ...rest, endsAt: now + rest.frozenRemainingMs, frozenRemainingMs: null };
}

export type RestPhase = 'counting' | 'warning' | 'go';
export function restPhase(remainingMs: number): RestPhase {
  if (remainingMs <= 0) {
    return 'go';
  }
  return remainingMs <= REST_WARNING_SEC * 1000 ? 'warning' : 'counting';
}

// ── Formatting ──────────────────────────────────────────────────────────────
const pad = (value: number) => String(value).padStart(2, '0');

// 00:45 · 12:34 · 1:02:03
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds % 60)}`
    : `${pad(minutes)}:${pad(seconds % 60)}`;
}

// Countdown rounds up (00:01 until it really reaches zero).
export function formatCountdown(remainingMs: number): string {
  return formatClock(Math.ceil(Math.max(0, remainingMs) / 1000));
}

// "42 min" · "45 s" · "1 h 05 min" (summary)
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  if (seconds < 60) {
    return `${seconds} s`;
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  return `${Math.floor(minutes / 60)} h ${pad(minutes % 60)} min`;
}

// "3 × 12" · "3 × 40 s"
export function planScheme(exercise: PlannedExercise): string {
  return exercise.durationSec
    ? `${exercise.sets} × ${exercise.durationSec} s`
    : `${exercise.sets} × ${exercise.reps ?? '—'}`;
}

// "16 kg" · "16,5 kg"
export function formatKg(value: number | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return `${String(Math.round(value * 10) / 10).replace('.', ',')} kg`;
}

// Text input → number (accepts "16,5"); empty → null.
export function parseNumberInput(value: string): number | null {
  const normalized = value.replace(',', '.').trim();
  if (!normalized) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}
