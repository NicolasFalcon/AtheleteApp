import AsyncStorage from '@react-native-async-storage/async-storage';

const VISUAL_ONBOARDING_STORAGE_KEY = '@athelete/has-seen-visual-onboarding-v1';

export async function hasSeenVisualOnboarding(): Promise<boolean> {
  return (await AsyncStorage.getItem(VISUAL_ONBOARDING_STORAGE_KEY)) === 'true';
}

export async function markVisualOnboardingAsSeen(): Promise<void> {
  await AsyncStorage.setItem(VISUAL_ONBOARDING_STORAGE_KEY, 'true');
}
