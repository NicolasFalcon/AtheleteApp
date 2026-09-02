import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProfileSetupLayout } from '@app/components/onboarding/ProfileSetupLayout';
import { ONBOARDING_ROUTES } from '@app/constants/routes';
import { useAuth } from '@app/hooks/useAuth';
import { useAppTheme } from '@app/hooks/useAppTheme';
import {safeGoBack} from '@app/navigation/safeGoBack';
import type { OnboardingStackParamList } from '@app/types/navigation';

type Props = NativeStackScreenProps<
  OnboardingStackParamList,
  'TrainingFrequency'
>;

export function TrainingFrequencyScreen({ navigation }: Props) {
  const { theme } = useAppTheme();
  const { onboardingDraft, updateOnboardingDraft } = useAuth();
  const styles = createStyles(theme);

  return (
    <ProfileSetupLayout
      continueDisabled={!onboardingDraft.trainingDaysPerWeek}
      onBack={() => safeGoBack(navigation, [ONBOARDING_ROUTES.Height])}
      onContinue={() => navigation.navigate(ONBOARDING_ROUTES.GoalSelection)}
      step={5}
      subtitle="Elige un ritmo realista. Podrás cambiarlo más adelante."
      title="¿Cuántos días entrenas por semana?"
    >
      <View style={styles.valueBlock}>
        <Text style={styles.value}>
          {onboardingDraft.trainingDaysPerWeek || 3}
        </Text>
        <Text style={styles.valueLabel}>días por semana</Text>
      </View>
      <View style={styles.options}>
        {[1, 2, 3, 4, 5, 6, 7].map(days => {
          const selected = onboardingDraft.trainingDaysPerWeek === days;
          return (
            <Pressable
              key={days}
              onPress={() =>
                updateOnboardingDraft({ trainingDaysPerWeek: days })
              }
              style={[styles.option, selected ? styles.optionSelected : null]}
            >
              <Text
                style={[
                  styles.optionText,
                  selected ? styles.optionTextSelected : null,
                ]}
              >
                {days}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.track} />
    </ProfileSetupLayout>
  );
}

type Theme = ReturnType<typeof useAppTheme>['theme'];

function createStyles(theme: Theme) {
  return StyleSheet.create({
    valueBlock: {
      alignItems: 'center',
      marginBottom: theme.spacing.xxl,
    },
    value: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 64,
      fontWeight: theme.typography.weights.bold,
    },
    valueLabel: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
    },
    options: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    option: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionSelected: {
      backgroundColor: theme.colors.accent,
    },
    optionText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      fontWeight: theme.typography.weights.semibold,
    },
    optionTextSelected: {
      color: theme.colors.accentContrast,
    },
    track: {
      height: 3,
      marginHorizontal: 18,
      marginTop: -22,
      backgroundColor: theme.colors.border,
      zIndex: -1,
    },
  });
}
