// Sound files for iOS: the handoff's WAVs converted to Core Audio format
// (afconvert -f caff -d LEI16). Android uses soundAssets.ts (.wav).
import type { SoundFile } from './soundModel';

export const SOUND_ASSETS: Record<SoundFile, number> = {
  'play-correct': require('../../assets/sounds/play-correct.caf'),
  'play-combo-1': require('../../assets/sounds/play-combo-1.caf'),
  'play-combo-2': require('../../assets/sounds/play-combo-2.caf'),
  'play-combo-3': require('../../assets/sounds/play-combo-3.caf'),
  'play-combo-4': require('../../assets/sounds/play-combo-4.caf'),
  'play-combo-5': require('../../assets/sounds/play-combo-5.caf'),
  'play-wrong': require('../../assets/sounds/play-wrong.caf'),
  'play-tick': require('../../assets/sounds/play-tick.caf'),
  'play-timeup': require('../../assets/sounds/play-timeup.caf'),
  'play-points-1': require('../../assets/sounds/play-points-1.caf'),
  'play-points-2': require('../../assets/sounds/play-points-2.caf'),
  'play-points-3': require('../../assets/sounds/play-points-3.caf'),
  'play-level-complete': require('../../assets/sounds/play-level-complete.caf'),
  'play-level-up': require('../../assets/sounds/play-level-up.caf'),
  'play-record': require('../../assets/sounds/play-record.caf'),
  'play-unlock': require('../../assets/sounds/play-unlock.caf'),
  'play-locked': require('../../assets/sounds/play-locked.caf'),
  'hydration-glass-1': require('../../assets/sounds/hydration-glass-1.caf'),
  'hydration-glass-2': require('../../assets/sounds/hydration-glass-2.caf'),
  'hydration-glass-3': require('../../assets/sounds/hydration-glass-3.caf'),
  'hydration-glass-4': require('../../assets/sounds/hydration-glass-4.caf'),
  'hydration-glass-5': require('../../assets/sounds/hydration-glass-5.caf'),
  'hydration-glass-6': require('../../assets/sounds/hydration-glass-6.caf'),
  'hydration-glass-7': require('../../assets/sounds/hydration-glass-7.caf'),
  'hydration-glass-8': require('../../assets/sounds/hydration-glass-8.caf'),
  'hydration-goal': require('../../assets/sounds/hydration-goal.caf'),
  'habit-check': require('../../assets/sounds/habit-check.caf'),
  'core33-day-close': require('../../assets/sounds/core33-day-close.caf'),
  'exercise-complete': require('../../assets/sounds/exercise-complete.caf'),
  'session-complete': require('../../assets/sounds/session-complete.caf'),
  'set-complete': require('../../assets/sounds/set-complete.caf'),
  'pr': require('../../assets/sounds/pr.caf'),
  'scan-success': require('../../assets/sounds/scan-success.caf'),
  'scan-fail': require('../../assets/sounds/scan-fail.caf'),
  'rest-warn': require('../../assets/sounds/rest-warn.caf'),
  'rest-tick': require('../../assets/sounds/rest-tick.caf'),
  'rest-tick-strong': require('../../assets/sounds/rest-tick-strong.caf'),
  'rest-go': require('../../assets/sounds/rest-go.caf'),
};

// Respira's ambient loop (4 s, played in a loop with fades in the app).
export const AMBIENT_ASSET: number = require('../../assets/sounds/breathe-ambient.caf');
