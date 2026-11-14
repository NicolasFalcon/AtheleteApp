import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { coachKeys } from '@app/features/coach/useCoach';
import { coachService } from '@app/services/coach/coachService';
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
  const { profile, session, saveOnboardingProfile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  const handleSave = useCallback(
    async (answers: OnboardingAnswers) => {
      const payload = toOnboardingPayload(answers);
      await saveOnboardingProfile(payload.data, payload.name);
      // B-28: only a coach, and only once the profile exists. Idempotent, so
      // the welcome's "Reintentar" can repeat it. A failure fails the save.
      if (answers.role === 'coach') {
        const invite = await coachService.register();
        queryClient.setQueryData(coachKeys.invite(session?.user.id), invite);
      }
    },
    [queryClient, saveOnboardingProfile, session?.user.id],
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
