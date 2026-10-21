import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { haptics } from '@app/components/v2/haptics';
import { getFeedbackPrefs } from '@app/lib/feedbackPrefs';
import { AMBIENT_ASSET, SOUND_ASSETS } from './soundAssets';
import {
  SOUND_FILES,
  soundFile,
  soundHaptic,
  type SoundEvent,
  type SoundFile,
} from './soundModel';

// The app's only way to make a sound: playSound(event). It plays the event's
// file (if Ajustes · Sonidos is on) and its haptic, where one already existed
// (if Vibración is on). The audio session is "ambient": it respects the
// silent switch and mixes with the user's music instead of stopping it.
const players = new Map<SoundFile, AudioPlayer>();
let sessionReady: Promise<void> | null = null;

function ensureSession(): Promise<void> {
  if (!sessionReady) {
    sessionReady = setAudioModeAsync({
      playsInSilentMode: false,
      interruptionMode: 'mixWithOthers',
      allowsRecording: false,
      shouldPlayInBackground: false,
    }).catch(() => {
      // Without the mode the sounds still play with the system default.
      sessionReady = null;
    });
  }
  return sessionReady;
}

function playerFor(file: SoundFile): AudioPlayer | null {
  let player = players.get(file);
  if (!player) {
    try {
      player = createAudioPlayer(SOUND_ASSETS[file]);
    } catch {
      return null;
    }
    players.set(file, player);
  }
  return player;
}

// Loads every file once (at launch), so the first sound has no delay.
export function preloadSounds() {
  if (!getFeedbackPrefs().sound) {
    return;
  }
  ensureSession();
  SOUND_FILES.forEach(playerFor);
}

export function playSound(event: SoundEvent) {
  const haptic = soundHaptic(event);
  if (haptic) {
    haptics[haptic]();
  }
  if (!getFeedbackPrefs().sound) {
    return;
  }
  const file = soundFile(event);
  const player = file ? playerFor(file) : null;
  if (!player) {
    return;
  }
  ensureSession();
  try {
    // From the start every time, even if it is still sounding.
    player
      .seekTo(0)
      .then(() => player.play())
      .catch(() => undefined);
  } catch {
    // A sound is a nicety; never break the screen for it.
  }
}

// ── Respira · ambient (handoff §25.8) ───────────────────────────────────────
// A 4 s loop of soft brown noise: fades in over 2.5 s and out over 0.6 s.
// Same rules as every sound: Ajustes · Sonidos and the silent switch.
const AMBIENT_IN_MS = 2500;
const AMBIENT_OUT_MS = 600;
const RAMP_STEP_MS = 50;
let ambient: AudioPlayer | null = null;
let ramp: ReturnType<typeof setInterval> | null = null;

function rampVolume(player: AudioPlayer, to: number, ms: number, done?: () => void) {
  if (ramp) {
    clearInterval(ramp);
  }
  const from = player.volume;
  const steps = Math.max(1, Math.round(ms / RAMP_STEP_MS));
  let step = 0;
  ramp = setInterval(() => {
    step += 1;
    try {
      player.volume = from + ((to - from) * step) / steps;
    } catch {
      // The player may be gone; nothing to do.
    }
    if (step >= steps && ramp) {
      clearInterval(ramp);
      ramp = null;
      done?.();
    }
  }, RAMP_STEP_MS);
}

export function startAmbient() {
  if (!getFeedbackPrefs().sound) {
    return;
  }
  ensureSession();
  try {
    if (!ambient) {
      ambient = createAudioPlayer(AMBIENT_ASSET);
      ambient.loop = true;
    }
    ambient.volume = 0;
    ambient.play();
    rampVolume(ambient, 1, AMBIENT_IN_MS);
  } catch {
    // Silence is fine.
  }
}

export function stopAmbient() {
  const player = ambient;
  if (!player) {
    return;
  }
  rampVolume(player, 0, AMBIENT_OUT_MS, () => {
    try {
      player.pause();
      player.seekTo(0).catch(() => undefined);
    } catch {
      // Already stopped.
    }
  });
}
