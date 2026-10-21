import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { haptics } from '@app/components/v2/haptics';
import { getFeedbackPrefs } from '@app/lib/feedbackPrefs';
import { SOUND_ASSETS } from './soundAssets';
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
