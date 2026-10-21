// Sound files for iOS: Core Audio format (.caf, 16-bit PCM).
// Android uses soundAssets.ts (.wav). Files rendered by scripts/render-sounds.js.
import type { SoundFile } from './soundModel';

export const SOUND_ASSETS: Record<SoundFile, number> = {
  'tick': require('../../assets/sounds/tick.caf'),
  'tick-urgent-5': require('../../assets/sounds/tick-urgent-5.caf'),
  'tick-urgent-4': require('../../assets/sounds/tick-urgent-4.caf'),
  'tick-urgent-3': require('../../assets/sounds/tick-urgent-3.caf'),
  'tick-urgent-2': require('../../assets/sounds/tick-urgent-2.caf'),
  'tick-final': require('../../assets/sounds/tick-final.caf'),
  'correct': require('../../assets/sounds/correct.caf'),
  'correct-streak': require('../../assets/sounds/correct-streak.caf'),
  'wrong': require('../../assets/sounds/wrong.caf'),
  'point-0': require('../../assets/sounds/point-0.caf'),
  'point-1': require('../../assets/sounds/point-1.caf'),
  'point-2': require('../../assets/sounds/point-2.caf'),
  'point-3': require('../../assets/sounds/point-3.caf'),
  'point-4': require('../../assets/sounds/point-4.caf'),
  'point-5': require('../../assets/sounds/point-5.caf'),
  'point-6': require('../../assets/sounds/point-6.caf'),
  'point-7': require('../../assets/sounds/point-7.caf'),
  'impact': require('../../assets/sounds/impact.caf'),
  'complete-low': require('../../assets/sounds/complete-low.caf'),
  'complete-mid': require('../../assets/sounds/complete-mid.caf'),
  'complete-perfect': require('../../assets/sounds/complete-perfect.caf'),
  'day-close': require('../../assets/sounds/day-close.caf'),
};
