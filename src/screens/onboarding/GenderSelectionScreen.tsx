import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FemaleIcon, MaleIcon } from '@app/assets/icons';
import { ProfileSetupLayout } from '@app/components/onboarding/ProfileSetupLayout';
import { ONBOARDING_ROUTES } from '@app/constants/routes';
import { useAuth } from '@app/hooks/useAuth';
import { useAppTheme } from '@app/hooks/useAppTheme';
import {safeGoBack} from '@app/navigation/safeGoBack';
import type { ProfileGender } from '@app/types/auth';
import type { OnboardingStackParamList } from '@app/types/navigation';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Gender'>;

export function GenderSelectionScreen({ navigation }: Props) {
  const { theme } = useAppTheme();
  const { onboardingDraft, updateOnboardingDraft } = useAuth();
  const styles = createStyles(theme);
  const options: Array<{ value: ProfileGender; label: string }> = [
    { value: 'male', label: 'Masculino' },
    { value: 'female', label: 'Femenino' },
  ];

  return (
    <ProfileSetupLayout
      continueDisabled={!onboardingDraft.gender}
      onBack={() => safeGoBack(navigation, [ONBOARDING_ROUTES.BirthDate])}
      onContinue={() => navigation.navigate(ONBOARDING_ROUTES.Weight)}
      step={2}
      subtitle="Este dato es privado y se utiliza únicamente para personalizar cálculos y recomendaciones."
      title="¿Con cuál te identificas?"
    >
      <View style={styles.options}>
        {options.map(option => {
          const selected = onboardingDraft.gender === option.value;
          const color = selected
            ? theme.colors.accentContrast
            : theme.colors.textSecondary;
          return (
            <Pressable
              key={option.value}
              onPress={() => updateOnboardingDraft({ gender: option.value })}
              style={[styles.option, selected ? styles.selected : null]}
            >
              {option.value === 'male' ? (
                <MaleIcon color={color} />
              ) : (
                <FemaleIcon color={color} />
              )}
              <Text
                style={[styles.label, selected ? styles.labelSelected : null]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ProfileSetupLayout>
  );
}

type Theme = ReturnType<typeof useAppTheme>['theme'];

function createStyles(theme: Theme) {
  return StyleSheet.create({
    options: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    option: {
      flex: 1,
      minHeight: 156,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.md,
    },
    selected: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    label: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      fontWeight: theme.typography.weights.semibold,
    },
    labelSelected: {
      color: theme.colors.accentContrast,
    },
  });
}
