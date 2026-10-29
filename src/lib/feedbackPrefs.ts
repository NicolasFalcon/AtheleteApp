import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SoundMode } from '@app/features/sound/soundModel';

// Ajustes · "Sonido" (Todo · Solo logros · Silencio, §28.8) and "Vibración",
// plus the sound switch and "Mensajes durante el entreno" (Todos · Solo
// esenciales · Ninguno, §28.13) of the session menu "···". Saved on the
// device (not in the account) and kept in memory so playSound and haptics
// read them without waiting; defaults until the saved value is read.
export type SessionMessagesMode = 'todos' | 'esenciales' | 'ninguno';

export type FeedbackPrefs = {
  soundMode: SoundMode;
  sessionSound: boolean;
  vibration: boolean;
  sessionMessages: SessionMessagesMode;
};

export const FEEDBACK_PREFS_KEY = '@athelete/feedback-prefs';
export const DEFAULT_FEEDBACK_PREFS: FeedbackPrefs = {
  soundMode: 'todo',
  sessionSound: true,
  vibration: true,
  sessionMessages: 'todos',
};

const SOUND_MODES: readonly SoundMode[] = ['todo', 'logros', 'silencio'];
const MESSAGE_MODES: readonly SessionMessagesMode[] = ['todos', 'esenciales', 'ninguno'];

let current: FeedbackPrefs = DEFAULT_FEEDBACK_PREFS;
let loading: Promise<FeedbackPrefs> | null = null;
const listeners = new Set<() => void>();

export function parseFeedbackPrefs(raw: string | null): FeedbackPrefs {
  if (!raw) {
    return DEFAULT_FEEDBACK_PREFS;
  }
  try {
    const value = JSON.parse(raw) as Partial<FeedbackPrefs> & { sound?: unknown };
    // Before v2.18 the sound was an on/off switch: off means Silencio.
    const legacy: SoundMode | null =
      typeof value.sound === 'boolean' ? (value.sound ? 'todo' : 'silencio') : null;
    return {
      soundMode: SOUND_MODES.includes(value.soundMode as SoundMode)
        ? (value.soundMode as SoundMode)
        : legacy ?? DEFAULT_FEEDBACK_PREFS.soundMode,
      sessionSound:
        typeof value.sessionSound === 'boolean'
          ? value.sessionSound
          : DEFAULT_FEEDBACK_PREFS.sessionSound,
      vibration:
        typeof value.vibration === 'boolean' ? value.vibration : DEFAULT_FEEDBACK_PREFS.vibration,
      sessionMessages: MESSAGE_MODES.includes(value.sessionMessages as SessionMessagesMode)
        ? (value.sessionMessages as SessionMessagesMode)
        : DEFAULT_FEEDBACK_PREFS.sessionMessages,
    };
  } catch {
    return DEFAULT_FEEDBACK_PREFS;
  }
}

function emit() {
  listeners.forEach(listener => listener());
}

export function getFeedbackPrefs(): FeedbackPrefs {
  return current;
}

// Reads the saved switches once per launch.
export function loadFeedbackPrefs(): Promise<FeedbackPrefs> {
  if (!loading) {
    loading = AsyncStorage.getItem(FEEDBACK_PREFS_KEY)
      .then(raw => {
        current = parseFeedbackPrefs(raw);
        emit();
        return current;
      })
      .catch(() => current);
  }
  return loading;
}

export function setFeedbackPrefs(patch: Partial<FeedbackPrefs>) {
  current = { ...current, ...patch };
  emit();
  AsyncStorage.setItem(FEEDBACK_PREFS_KEY, JSON.stringify(current)).catch(() => undefined);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useFeedbackPrefs(): FeedbackPrefs {
  return useSyncExternalStore(subscribe, getFeedbackPrefs, getFeedbackPrefs);
}
