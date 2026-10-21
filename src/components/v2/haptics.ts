import { trigger } from 'react-native-haptic-feedback';
import { getFeedbackPrefs } from '@app/lib/feedbackPrefs';

// Thin wrapper so primitives never crash if haptics are unavailable
// (simulator, Android devices without a vibrator, tests). Ajustes ·
// "Vibración" off silences every haptic of the app here.
function safeTrigger(type: Parameters<typeof trigger>[0]) {
  if (!getFeedbackPrefs().vibration) {
    return;
  }
  try {
    trigger(type, { enableVibrateFallback: false });
  } catch {
    // Haptics are a nicety; ignore failures.
  }
}

export const haptics = {
  selection: () => safeTrigger('selection'),
  light: () => safeTrigger('impactLight'),
  success: () => safeTrigger('notificationSuccess'),
  error: () => safeTrigger('notificationError'),
};
