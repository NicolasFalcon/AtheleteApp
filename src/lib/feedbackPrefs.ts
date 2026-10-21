import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Ajustes · "Sonidos y vibración": two switches saved on the device (not in
// the account). Kept in memory so playSound and haptics read them without
// waiting; both default to on until the saved value is read.
export type FeedbackPrefs = { sound: boolean; vibration: boolean };

export const FEEDBACK_PREFS_KEY = '@athelete/feedback-prefs';
export const DEFAULT_FEEDBACK_PREFS: FeedbackPrefs = { sound: true, vibration: true };

let current: FeedbackPrefs = DEFAULT_FEEDBACK_PREFS;
let loading: Promise<FeedbackPrefs> | null = null;
const listeners = new Set<() => void>();

export function parseFeedbackPrefs(raw: string | null): FeedbackPrefs {
  if (!raw) {
    return DEFAULT_FEEDBACK_PREFS;
  }
  try {
    const value = JSON.parse(raw) as Partial<FeedbackPrefs>;
    return {
      sound: typeof value.sound === 'boolean' ? value.sound : DEFAULT_FEEDBACK_PREFS.sound,
      vibration:
        typeof value.vibration === 'boolean' ? value.vibration : DEFAULT_FEEDBACK_PREFS.vibration,
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
