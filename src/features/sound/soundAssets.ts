// Sound files for Android (and the type for TypeScript): the handoff's WAVs
// (design_handoff_v2_18/sounds, 48 kHz 16-bit mono). iOS uses soundAssets.ios.ts.
import type { SoundFile } from './soundModel';

export const SOUND_ASSETS: Record<SoundFile, number> = {
  'play-correct': require('../../assets/sounds/play-correct.wav'),
  'play-combo-1': require('../../assets/sounds/play-combo-1.wav'),
  'play-combo-2': require('../../assets/sounds/play-combo-2.wav'),
  'play-combo-3': require('../../assets/sounds/play-combo-3.wav'),
  'play-combo-4': require('../../assets/sounds/play-combo-4.wav'),
  'play-combo-5': require('../../assets/sounds/play-combo-5.wav'),
  'play-wrong': require('../../assets/sounds/play-wrong.wav'),
  'play-tick': require('../../assets/sounds/play-tick.wav'),
  'play-timeup': require('../../assets/sounds/play-timeup.wav'),
  'play-points-1': require('../../assets/sounds/play-points-1.wav'),
  'play-points-2': require('../../assets/sounds/play-points-2.wav'),
  'play-points-3': require('../../assets/sounds/play-points-3.wav'),
  'play-level-complete': require('../../assets/sounds/play-level-complete.wav'),
  'play-level-up': require('../../assets/sounds/play-level-up.wav'),
  'play-record': require('../../assets/sounds/play-record.wav'),
  'play-unlock': require('../../assets/sounds/play-unlock.wav'),
  'play-locked': require('../../assets/sounds/play-locked.wav'),
  'hydration-glass-1': require('../../assets/sounds/hydration-glass-1.wav'),
  'hydration-glass-2': require('../../assets/sounds/hydration-glass-2.wav'),
  'hydration-glass-3': require('../../assets/sounds/hydration-glass-3.wav'),
  'hydration-glass-4': require('../../assets/sounds/hydration-glass-4.wav'),
  'hydration-glass-5': require('../../assets/sounds/hydration-glass-5.wav'),
  'hydration-glass-6': require('../../assets/sounds/hydration-glass-6.wav'),
  'hydration-glass-7': require('../../assets/sounds/hydration-glass-7.wav'),
  'hydration-glass-8': require('../../assets/sounds/hydration-glass-8.wav'),
  'hydration-goal': require('../../assets/sounds/hydration-goal.wav'),
  'habit-check': require('../../assets/sounds/habit-check.wav'),
  'core33-day-close': require('../../assets/sounds/core33-day-close.wav'),
  'exercise-complete': require('../../assets/sounds/exercise-complete.wav'),
  'session-complete': require('../../assets/sounds/session-complete.wav'),
  'set-complete': require('../../assets/sounds/set-complete.wav'),
  'pr': require('../../assets/sounds/pr.wav'),
  'scan-success': require('../../assets/sounds/scan-success.wav'),
  'scan-fail': require('../../assets/sounds/scan-fail.wav'),
  'rest-warn': require('../../assets/sounds/rest-warn.wav'),
  'rest-tick': require('../../assets/sounds/rest-tick.wav'),
  'rest-tick-strong': require('../../assets/sounds/rest-tick-strong.wav'),
  'rest-go': require('../../assets/sounds/rest-go.wav'),
};

// Respira's ambient loop (4 s, played in a loop with fades in the app).
export const AMBIENT_ASSET: number = require('../../assets/sounds/breathe-ambient.wav');
