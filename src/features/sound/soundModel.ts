// Pure rules of the sound language (handoff v2.15 §25.7–25.8): which file
// each event plays and which haptic goes with it. The files are rendered from
// the prototype's ath-sound.js by scripts/render-sounds.js.

export type ResultTierSound = 'low' | 'mid' | 'perfect';

export type SoundEvent =
  // Quiz countdown: one per second; the file depends on the seconds left.
  | { type: 'tick'; secondsLeft: number }
  // Quiz answer; from 3 in a row the brighter variant.
  | { type: 'correct'; streak: number }
  | { type: 'wrong' }
  // Quiz result counter: step `index` (0-based) of `steps`.
  | { type: 'point'; index: number; steps: number }
  | { type: 'impact' }
  | { type: 'complete'; tier: ResultTierSound }
  | { type: 'day-close' };

export const SOUND_FILES = [
  'tick',
  'tick-urgent-5',
  'tick-urgent-4',
  'tick-urgent-3',
  'tick-urgent-2',
  'tick-final',
  'correct',
  'correct-streak',
  'wrong',
  'point-0',
  'point-1',
  'point-2',
  'point-3',
  'point-4',
  'point-5',
  'point-6',
  'point-7',
  'impact',
  'complete-low',
  'complete-mid',
  'complete-perfect',
  'day-close',
] as const;

export type SoundFile = (typeof SOUND_FILES)[number];

// Notes of the point scale (E5 … B6) in the rendered files.
const POINT_STEPS = 8;

// Countdown (25.7): a calm tick from 15 to 6 s, an urgent tick that rises in
// pitch from 5 to 2 s and a final tick in the last second.
export function tickFile(secondsLeft: number): SoundFile | null {
  if (secondsLeft <= 0) {
    return null;
  }
  if (secondsLeft <= 1) {
    return 'tick-final';
  }
  if (secondsLeft <= 5) {
    return `tick-urgent-${Math.max(2, Math.round(secondsLeft))}` as SoundFile;
  }
  return 'tick';
}

// Same mapping as ath-sound.js point(i, n): the step climbs the scale with
// the progress of the counter.
export function pointFile(index: number, steps: number): SoundFile {
  const k = Math.round((index / Math.max(1, steps - 1)) * (POINT_STEPS - 1));
  return `point-${Math.min(POINT_STEPS - 1, Math.max(0, k))}` as SoundFile;
}

export function soundFile(event: SoundEvent): SoundFile | null {
  switch (event.type) {
    case 'tick':
      return tickFile(event.secondsLeft);
    case 'correct':
      return event.streak >= 3 ? 'correct-streak' : 'correct';
    case 'point':
      return pointFile(event.index, event.steps);
    case 'complete':
      return `complete-${event.tier}`;
    default:
      return event.type;
  }
}

// The haptic that already went with the event (Quiz answer).
export function soundHaptic(event: SoundEvent): 'light' | 'error' | null {
  if (event.type === 'correct') {
    return 'light';
  }
  return event.type === 'wrong' ? 'error' : null;
}

// Result counter (prototype): "complete" at 140 ms, then up to 12 steps every
// 75 ms from 700 ms; each step plays "point" and the last one "impact".
export const RESULT_COUNT = {
  completeAt: 140,
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
