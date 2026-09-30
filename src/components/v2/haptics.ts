import { trigger } from 'react-native-haptic-feedback';

// Thin wrapper so primitives never crash if haptics are unavailable
// (simulator, Android devices without a vibrator, tests).
function safeTrigger(type: Parameters<typeof trigger>[0]) {
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
};
