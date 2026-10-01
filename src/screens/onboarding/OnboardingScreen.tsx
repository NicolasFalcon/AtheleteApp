import { useCallback } from 'react';
import {
  OnboardingFlow,
  type OnboardingFinishTarget,
} from '@app/features/onboarding/components/OnboardingFlow';
import {
  toOnboardingPayload,
  type OnboardingAnswers,
} from '@app/features/onboarding/onboardingModel';
import { useAuth } from '@app/hooks/useAuth';
import { setPostOnboardingTab } from '@app/lib/postOnboarding';

// ONB_02 + ONB_03 · real onboarding of a signed-in user without profile.
// The ELLIE welcome saves the existing profile columns while it is shown
// (saveOnboardingProfile, no refresh so the app stays on the welcome). Its
// buttons only navigate: refreshProfile() marks the user as onboarded and
// RootNavigator swaps to the main tabs (Inicio or ELLIE).
export function OnboardingScreen() {
  const { profile, saveOnboardingProfile, refreshProfile } = useAuth();

  const handleSave = useCallback(
    async (answers: OnboardingAnswers) => {
      const payload = toOnboardingPayload(answers);
      await saveOnboardingProfile(payload.data, payload.name);
    },
    [saveOnboardingProfile],
  );

  const handleFinish = useCallback(
    async (target: OnboardingFinishTarget) => {
      setPostOnboardingTab(target === 'ellie' ? 'Ellie' : 'Home');
      await refreshProfile();
    },
    [refreshProfile],
  );

  return (
    <OnboardingFlow
      initialName={profile?.name ?? ''}
      onSave={handleSave}
      onFinish={handleFinish}
    />
  );
}
