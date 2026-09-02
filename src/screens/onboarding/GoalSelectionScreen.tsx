import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ProfileSetupLayout } from '@app/components/onboarding/ProfileSetupLayout';
import { ONBOARDING_ROUTES } from '@app/constants/routes';
import { useAuth } from '@app/hooks/useAuth';
import { useAppTheme } from '@app/hooks/useAppTheme';
import {safeGoBack} from '@app/navigation/safeGoBack';
import type { OnboardingGoal } from '@app/types/auth';
import type { OnboardingStackParamList } from '@app/types/navigation';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'GoalSelection'>;

const GOALS: Array<{
  value: OnboardingGoal;
  label: string;
  description: string;
}> = [
  {
    value: 'gain_muscle',
    label: 'Ganar músculo',
    description: 'Aumentar masa muscular y tamaño.',
  },
  {
    value: 'lose_weight',
    label: 'Perder grasa',
    description: 'Mejorar composición corporal.',
  },
  {
    value: 'improve_health',
    label: 'Mejorar condición física',
    description: 'Subir energía, resistencia y movilidad.',
  },
  {
    value: 'maintain',
    label: 'Mantenerme activo',
    description: 'Sostener hábitos y sentirme bien.',
  },
];

export function GoalSelectionScreen({ navigation }: Props) {
  const { theme } = useAppTheme();
  const { onboardingDraft, updateOnboardingDraft } = useAuth();
  const styles = createStyles(theme);

  return (
    <ProfileSetupLayout
      continueDisabled={!onboardingDraft.goal}
      continueLabel="Guardar perfil"
      onBack={() =>
        safeGoBack(navigation, [ONBOARDING_ROUTES.TrainingFrequency])
      }
      onContinue={() => navigation.navigate(ONBOARDING_ROUTES.Complete)}
      step={6}
      subtitle="Selecciona el objetivo principal que guiará tus recomendaciones."
      title="¿Cuál es tu objetivo fitness?"
    >
      <View style={styles.list}>
        {GOALS.map(goal => {
          const selected = onboardingDraft.goal === goal.value;
          return (
            <Pressable
              key={goal.value}
              onPress={() => updateOnboardingDraft({ goal: goal.value })}
              style={[styles.option, selected ? styles.selected : null]}
            >
              <View style={styles.copy}>
                <Text
                  style={[styles.label, selected ? styles.labelSelected : null]}
                >
                  {goal.label}
                </Text>
                <Text
                  style={[
                    styles.description,
                    selected ? styles.descriptionSelected : null,
                  ]}
                >
                  {goal.description}
                </Text>
              </View>
              <View
                style={[styles.radio, selected ? styles.radioSelected : null]}
              >
                {selected ? <View style={styles.radioDot} /> : null}
              </View>
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
    list: {
      gap: theme.spacing.sm,
    },
    option: {
      minHeight: 72,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    selected: {
      borderColor: theme.colors.textPrimary,
      backgroundColor: theme.colors.surfaceMuted,
    },
    copy: {
      flex: 1,
      gap: 3,
    },
    label: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      fontWeight: theme.typography.weights.semibold,
    },
    labelSelected: {
      fontWeight: theme.typography.weights.bold,
    },
    description: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.caption,
    },
    descriptionSelected: {
      color: theme.colors.textPrimary,
    },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioSelected: {
      borderColor: theme.colors.textPrimary,
    },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.textPrimary,
    },
  });
}
