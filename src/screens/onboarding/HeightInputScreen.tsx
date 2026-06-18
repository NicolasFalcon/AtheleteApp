import { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HeightIcon } from '@app/assets/icons';
import { ProfileSetupLayout } from '@app/components/onboarding/ProfileSetupLayout';
import { ProfileSetupValueInput } from '@app/components/onboarding/ProfileSetupValueInput';
import { ONBOARDING_ROUTES } from '@app/constants/routes';
import { useAuth } from '@app/hooks/useAuth';
import { useAppTheme } from '@app/hooks/useAppTheme';
import type { OnboardingStackParamList } from '@app/types/navigation';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Height'>;

export function HeightInputScreen({ navigation }: Props) {
  const { theme } = useAppTheme();
  const { onboardingDraft, updateOnboardingDraft } = useAuth();
  const [error, setError] = useState('');

  const continueFlow = () => {
    const height = onboardingDraft.height || 0;
    if (height < 100 || height > 250) {
      setError('Ingresa una altura entre 100 y 250 cm.');
      return;
    }
    setError('');
    navigation.navigate(ONBOARDING_ROUTES.TrainingFrequency);
  };

  return (
    <ProfileSetupLayout
      onBack={() => navigation.goBack()}
      onContinue={continueFlow}
      step={4}
      subtitle="La altura mejora la precisión de tus métricas corporales."
      title="¿Cuál es tu altura?"
    >
      <ProfileSetupValueInput
        autoFocus
        error={error}
        icon={<HeightIcon color={theme.colors.textSecondary} />}
        onChangeText={value =>
          updateOnboardingDraft({ height: Number(value) || undefined })
        }
        placeholder="175"
        unit="cm"
        value={onboardingDraft.height ? String(onboardingDraft.height) : ''}
      />
    </ProfileSetupLayout>
  );
}
