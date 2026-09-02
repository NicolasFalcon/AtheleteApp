import { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WeightIcon } from '@app/assets/icons';
import { ProfileSetupLayout } from '@app/components/onboarding/ProfileSetupLayout';
import { ProfileSetupValueInput } from '@app/components/onboarding/ProfileSetupValueInput';
import { ONBOARDING_ROUTES } from '@app/constants/routes';
import { useAuth } from '@app/hooks/useAuth';
import { useAppTheme } from '@app/hooks/useAppTheme';
import {safeGoBack} from '@app/navigation/safeGoBack';
import type { OnboardingStackParamList } from '@app/types/navigation';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Weight'>;

export function WeightInputScreen({ navigation }: Props) {
  const { theme } = useAppTheme();
  const { onboardingDraft, updateOnboardingDraft } = useAuth();
  const [error, setError] = useState('');

  const continueFlow = () => {
    const weight = onboardingDraft.weight || 0;
    if (weight < 30 || weight > 300) {
      setError('Ingresa un peso entre 30 y 300 kg.');
      return;
    }
    setError('');
    navigation.navigate(ONBOARDING_ROUTES.Height);
  };

  return (
    <ProfileSetupLayout
      onBack={() => safeGoBack(navigation, [ONBOARDING_ROUTES.Gender])}
      onContinue={continueFlow}
      step={3}
      subtitle="Usaremos este dato para personalizar nutrición, hidratación y seguimiento."
      title="¿Cuál es tu peso actual?"
    >
      <ProfileSetupValueInput
        autoFocus
        error={error}
        icon={<WeightIcon color={theme.colors.textSecondary} />}
        onChangeText={value =>
          updateOnboardingDraft({
            weight: Number(value.replace(',', '.')) || undefined,
          })
        }
        placeholder="75"
        unit="kg"
        value={onboardingDraft.weight ? String(onboardingDraft.weight) : ''}
      />
    </ProfileSetupLayout>
  );
}
