// Tab to open once, right after the onboarding ends ("Hablar con ELLIE" on
// the ELLIE welcome). The main tabs mount after the profile is saved, so the
// intent is stored here and read once by MainTabNavigator.
export type PostOnboardingTab = 'Home' | 'Ellie';

let pendingTab: PostOnboardingTab | null = null;

export function setPostOnboardingTab(tab: PostOnboardingTab) {
  pendingTab = tab;
}

export function consumePostOnboardingTab(): PostOnboardingTab | null {
  const tab = pendingTab;
  pendingTab = null;
  return tab;
}
