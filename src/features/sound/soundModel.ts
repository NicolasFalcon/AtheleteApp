import table from './sound-events.json';

// Pure rules of the sound system v2.18 (handoff §28.7–28.8). The event table
// is a copy of design_handoff_v2_18/sounds/sound-events.json (event → files →
// intensity → switch → haptic); the files are the handoff's WAVs, converted
// to .caf for iOS with afconvert. `allowed` is the same rule as playSound.js.

export type SoundIntensity = 'pequeño' | 'medio' | 'grande' | 'error' | 'reservado';
export type SoundSwitch = 'general' | 'sesion';
export type SoundHaptic = 'light' | 'medium' | 'heavy' | 'success' | 'warning';

// Ajustes · Sonido: Todo · Solo logros · Silencio.
export type SoundMode = 'todo' | 'logros' | 'silencio';

export const SOUND_EVENT_IDS = [
  'play-correct',
  'play-combo',
  'play-wrong',
  'play-tick',
  'play-timeup',
  'play-points',
  'play-level-complete',
  'play-level-up',
  'play-record',
  'play-unlock',
  'play-locked',
  'hydration-glass',
  'hydration-goal',
  'habit-check',
  'core33-day-close',
  'exercise-complete',
  'session-complete',
  'set-complete',
  'pr',
  'scan-success',
  'scan-fail',
  'rest-warn',
  'rest-tick',
  'rest-tick-strong',
  'rest-go',
] as const;

export type SoundEventId = (typeof SOUND_EVENT_IDS)[number];

// Every file of the table, without extension (kebab-case = event id + `-N`).
export const SOUND_FILES = [
  'play-correct',
  'play-combo-1',
  'play-combo-2',
  'play-combo-3',
  'play-combo-4',
  'play-combo-5',
  'play-wrong',
  'play-tick',
  'play-timeup',
  'play-points-1',
  'play-points-2',
  'play-points-3',
  'play-level-complete',
  'play-level-up',
  'play-record',
  'play-unlock',
  'play-locked',
  'hydration-glass-1',
  'hydration-glass-2',
  'hydration-glass-3',
  'hydration-glass-4',
  'hydration-glass-5',
  'hydration-glass-6',
  'hydration-glass-7',
  'hydration-glass-8',
  'hydration-goal',
  'habit-check',
  'core33-day-close',
  'exercise-complete',
  'session-complete',
  'set-complete',
  'pr',
  'scan-success',
  'scan-fail',
  'rest-warn',
  'rest-tick',
  'rest-tick-strong',
  'rest-go',
] as const;

export type SoundFile = (typeof SOUND_FILES)[number];

export type SoundEventSpec = {
  id: SoundEventId;
  files: { file: SoundFile; ms: number }[];
  intensity: SoundIntensity;
  sw: SoundSwitch;
  haptic: SoundHaptic;
};

type RawEvent = {
  id: string;
  files: { file: string; ms: number }[];
  intensity: string;
  sw: string;
  haptic: string;
};

export const SOUND_EVENTS = Object.fromEntries(
  (table.events as RawEvent[]).map(event => [
    event.id,
    {
      ...event,
      files: event.files.map(item => ({
        file: item.file.replace(/\.wav$/, '') as SoundFile,
        ms: item.ms,
      })),
    },
  ]),
) as Record<SoundEventId, SoundEventSpec>;

// Ajustes · Sonido (§28.8) and the session switch: Todo plays everything,
// Solo logros only medio and grande, Silencio nothing; session events need
// both switches. `reservado` (set-complete) never plays.
export function allowed(
  event: SoundEventSpec,
  mode: SoundMode,
  sessionOn: boolean,
): boolean {
  if (event.intensity === 'reservado' || mode === 'silencio') {
    return false;
  }
  if (event.sw === 'sesion' && !sessionOn) {
    return false;
  }
  if (mode === 'logros') {
    return event.intensity === 'medio' || event.intensity === 'grande';
  }
  return true;
}

// `variant` is 1-based (combo step, points note, glass of the day); past the
// last file it repeats the last one.
export function eventFile(event: SoundEventSpec, variant = 1): { file: SoundFile; ms: number } {
  const index = Math.min(event.files.length, Math.max(1, Math.round(variant))) - 1;
  return event.files[index];
}

// ── Firing rules (§28.7) ────────────────────────────────────────────────────

export type SoundCue = { id: SoundEventId; variant?: number };

// Play · answer: play-correct with a streak of 0–1, then play-combo-N with
// N = streak − 1 (max 5). `streak` includes this answer.
export function answerCue(isCorrect: boolean, streak: number): SoundCue {
  if (!isCorrect) {
    return { id: 'play-wrong' };
  }
  return streak >= 2
    ? { id: 'play-combo', variant: Math.min(5, streak - 1) }
    : { id: 'play-correct' };
}

// Play · countdown: one tick per second in the last 5 s.
export const PLAY_TICK_FROM_SEC = 5;

export function playTickCue(secondsLeft: number): SoundCue | null {
  return secondsLeft > 0 && secondsLeft <= PLAY_TICK_FROM_SEC ? { id: 'play-tick' } : null;
}

// Play · points counter: one sound every 2 steps, note floor(i / 2) % 3.
export function pointsCue(index: number): SoundCue | null {
  return index % 2 === 0
    ? { id: 'play-points', variant: (Math.floor(index / 2) % 3) + 1 }
    : null;
}

// Play · resultado (Quiz.dc.html · celebrate), from the server's answer:
// `unlocked` (a level or the route), `levelUp` (player level) and `record`.
export type ResultFlags = { score: number; unlocked: boolean; levelUp: boolean; record: boolean };

// The celebration's own sound, 260 ms after it opens (none without one).
export function celebrationSound(flags: ResultFlags): SoundEventId | null {
  if (flags.unlocked || flags.levelUp) {
    return 'play-level-up';
  }
  return flags.record ? 'play-record' : null;
}

// After the counter: level complete from 8/10 (unless the celebration already
// played level-up), the record when level-up took the celebration, and
// unlock for a perfect round.
export function resultSequence(flags: ResultFlags): SoundEventId[] {
  const big = flags.unlocked || flags.levelUp;
  const seq: SoundEventId[] = [];
  if (flags.score >= 8 && !big) {
    seq.push('play-level-complete');
  }
  if (flags.record && big) {
    seq.push('play-record');
  }
  if (flags.score >= 10) {
    seq.push('play-unlock');
  }
  return seq;
}

// Gap between chained result sounds: 85 % of the previous one + 80 ms.
export function chainGapMs(id: SoundEventId): number {
  return Math.round(eventFile(SOUND_EVENTS[id]).ms * 0.85) + 80;
}

// Hydration: glass n of the day plays hydration-glass-n; the glass that
// reaches the goal plays hydration-goal; above the goal the last file.
export function hydrationCue(glasses: number, goal: number | null): SoundCue | null {
  if (glasses <= 0) {
    return null;
  }
  if (goal !== null && glasses === goal) {
    return { id: 'hydration-goal' };
  }
  const last = SOUND_EVENTS['hydration-glass'].files.length;
  return { id: 'hydration-glass', variant: goal !== null && glasses > goal ? last : glasses };
}

// Session rest: warning at 10 s, tick at 5–4–3–2 (rest-tick reused for 5 and
// 4, decided after the handoff, which only lists 3 and 2), strong tick at 1
// (rest-go at 0 goes with "Tu turno"). Fires when the whole second changes.
export const REST_WARN_SEC = 10;

export function restCue(previousSec: number, sec: number): SoundCue | null {
  if (sec === previousSec) {
    return null;
  }
  if (sec === REST_WARN_SEC) {
    return { id: 'rest-warn' };
  }
  if (sec >= 2 && sec <= 5) {
    return { id: 'rest-tick' };
  }
  return sec === 1 ? { id: 'rest-tick-strong' } : null;
}

// Result counter (prototype): up to 12 steps every 75 ms from 700 ms.
export const RESULT_COUNT = {
  firstStepAt: 700,
  stepMs: 75,
  maxSteps: 12,
} as const;

export type CountStep = { at: number; value: number; last: boolean };

export function resultCountSteps(points: number): CountStep[] {
  if (points <= 0) {
    return [];
  }
  const steps = Math.min(RESULT_COUNT.maxSteps, Math.max(1, Math.round(points / 10)));
  return Array.from({ length: steps }, (_, i) => {
    const k = i + 1;
    const last = k === steps;
    return {
      at: RESULT_COUNT.firstStepAt + i * RESULT_COUNT.stepMs,
      value: last ? points : Math.round((points * k) / steps / 10) * 10,
      last,
    };
  });
}
