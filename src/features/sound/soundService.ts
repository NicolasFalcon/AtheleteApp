import { useEffect } from 'react';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { haptics } from '@app/components/v2/haptics';
import { getFeedbackPrefs } from '@app/lib/feedbackPrefs';
import { AMBIENT_ASSET, SOUND_ASSETS } from './soundAssets';
import {
  SOUND_EVENTS,
  allowed,
  eventFile,
  type SoundCue,
  type SoundEventId,
  type SoundFile,
} from './soundModel';

// The app's only way to make a sound: playSound(event) (handoff §28.7). The
// event's haptic always fires (unless Ajustes · Vibración is off); the file
// plays if Ajustes · Sonido allows it (Todo · Solo logros · Silencio) and,
// for session events, the session switch too. The audio session is
// "ambient": it respects the silent switch and mixes with the user's music
// (Spotify, …) without stopping it. expo-audio cannot duck others in ambient
// mode (duckOthers needs playsInSilentMode), so there is no ducking.
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

// Loads the files of these events once, so their first sound has no delay.
export function preloadSounds(ids: readonly SoundEventId[]) {
  if (getFeedbackPrefs().soundMode === 'silencio') {
    return;
  }
  ensureSession();
  ids.forEach(id => SOUND_EVENTS[id].files.forEach(item => playerFor(item.file)));
}

// Preloads the sounds of the screen on screen (Play, session rest, water…).
export function useSoundPreload(ids: readonly SoundEventId[]) {
  const key = ids.join('|');
  useEffect(() => {
    preloadSounds(ids);
    // The list is static per screen; `key` covers a change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

export type PlaySoundOptions = {
  // 1-based file of the event (combo step, points note, glass of the day).
  variant?: number;
  // false where the screen already fires the same haptic (Celebration).
  haptic?: boolean;
  // false where a native module plays the file (rest cues): only the haptic.
  sound?: boolean;
};

export function playSound(id: SoundEventId, options: PlaySoundOptions = {}) {
  const event = SOUND_EVENTS[id];
  if (!event || event.intensity === 'reservado') {
    return;
  }
  if (options.haptic !== false) {
    haptics[event.haptic]();
  }
  if (options.sound === false) {
    return;
  }
  const prefs = getFeedbackPrefs();
  if (!allowed(event, prefs.soundMode, prefs.sessionSound)) {
    return;
  }
  const player = playerFor(eventFile(event, options.variant).file);
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

export function playCue(cue: SoundCue | null, options: Omit<PlaySoundOptions, 'variant'> = {}) {
  if (cue) {
    playSound(cue.id, { ...options, variant: cue.variant });
  }
}

// ── Respira · ambient (handoff §25.8) ───────────────────────────────────────
// A 4 s loop of soft brown noise: fades in over 2.5 s and out over 0.6 s.
// Same rules as the sounds: any Ajustes · Sonido but Silencio, and the
// silent switch.
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
  if (getFeedbackPrefs().soundMode === 'silencio') {
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
