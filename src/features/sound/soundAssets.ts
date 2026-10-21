// Sound files for Android (and the type for TypeScript): 16-bit PCM WAV.
// iOS uses soundAssets.ios.ts (.caf). Files rendered by scripts/render-sounds.js.
import type { SoundFile } from './soundModel';

export const SOUND_ASSETS: Record<SoundFile, number> = {
  'tick': require('../../assets/sounds/tick.wav'),
  'tick-urgent-5': require('../../assets/sounds/tick-urgent-5.wav'),
  'tick-urgent-4': require('../../assets/sounds/tick-urgent-4.wav'),
  'tick-urgent-3': require('../../assets/sounds/tick-urgent-3.wav'),
  'tick-urgent-2': require('../../assets/sounds/tick-urgent-2.wav'),
  'tick-final': require('../../assets/sounds/tick-final.wav'),
  'correct': require('../../assets/sounds/correct.wav'),
  'correct-streak': require('../../assets/sounds/correct-streak.wav'),
  'wrong': require('../../assets/sounds/wrong.wav'),
  'point-0': require('../../assets/sounds/point-0.wav'),
  'point-1': require('../../assets/sounds/point-1.wav'),
  'point-2': require('../../assets/sounds/point-2.wav'),
  'point-3': require('../../assets/sounds/point-3.wav'),
  'point-4': require('../../assets/sounds/point-4.wav'),
  'point-5': require('../../assets/sounds/point-5.wav'),
  'point-6': require('../../assets/sounds/point-6.wav'),
  'point-7': require('../../assets/sounds/point-7.wav'),
  'impact': require('../../assets/sounds/impact.wav'),
  'complete-low': require('../../assets/sounds/complete-low.wav'),
  'complete-mid': require('../../assets/sounds/complete-mid.wav'),
  'complete-perfect': require('../../assets/sounds/complete-perfect.wav'),
  'day-close': require('../../assets/sounds/day-close.wav'),
};

// Respira's ambient loop (4 s, played in a loop with fades in the app).
export const AMBIENT_ASSET: number = require('../../assets/sounds/breathe-ambient.wav');
