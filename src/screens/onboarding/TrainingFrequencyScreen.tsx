import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FormMessage } from '@app/components/auth/FormMessage';
import { ScreenContainer } from '@app/components/ScreenContainer';
import { OnboardingProgress } from '@app/components/onboarding/OnboardingProgress';
import { useAuth } from '@app/hooks/useAuth';
import { useAppTheme } from '@app/hooks/useAppTheme';
import type { OnboardingData } from '@app/types/auth';
import type { OnboardingStackParamList } from '@app/types/navigation';
import { Button } from '@app/components/ui';

type Props = NativeStackScreenProps<
  OnboardingStackParamList,
  'TrainingFrequency'
>;

function buildPayload(
  draft: Partial<OnboardingData>,
): OnboardingData | null {
  if (
    !draft.goal ||
    !draft.birthDate ||
    !draft.weight ||
    !draft.height ||
    !draft.trainingDaysPerWeek
  ) {
    return null;
  }

  return {
    goal: draft.goal,
    birthDate: draft.birthDate,
    weight: draft.weight,
    height: draft.height,
    trainingDaysPerWeek: draft.trainingDaysPerWeek,
  };
}

export function TrainingFrequencyScreen({ navigation }: Props) {
  const { theme } = useAppTheme();
  const { onboardingDraft, updateOnboardingDraft, completeOnboarding } =
    useAuth();
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const styles = StyleSheet.create({
    content: {
      gap: theme.spacing.xxl,
    },
    heading: {
      gap: theme.spacing.xs,
    },
    title: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.title,
      fontWeight: theme.typography.weights.bold,
      letterSpacing: -0.6,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      lineHeight: 20,
    },
    options: {
      flexDirection: 'row',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    option: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    optionSelected: {
      backgroundColor: theme.colors.textPrimary,
      borderColor: theme.colors.textPrimary,
    },
    optionText: {
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      fontWeight: theme.typography.weights.semibold,
    },
    optionTextSelected: {
      color: theme.colors.background,
    },
    helperText: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.bodySm,
      textAlign: 'center',
    },
    footer: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    backButton: {
      minWidth: 56,
    },
    finishButton: {
      flex: 1,
    },
  });

  const handleFinish = async () => {
    setFormError('');
    const payload = buildPayload(onboardingDraft);

    if (!payload) {
      setFormError('Faltan datos del onboarding. Vuelve al paso anterior.');
      return;
    }

    setSubmitting(true);

    try {
      await completeOnboarding(payload);
    } catch (nextError) {
      setFormError(
        nextError instanceof Error
          ? nextError.message
          : 'No se pudo guardar el perfil',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer scrollable contentContainerStyle={styles.content}>
      <OnboardingProgress step={3} />
      <View style={styles.heading}>
        <Text style={styles.title}>Frecuencia de entrenamiento</Text>
        <Text style={styles.subtitle}>
          ¿Cuántos días por semana quieres entrenar?
        </Text>
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
              style={[styles.option, selected ? styles.optionSelected : null]}>
              <Text
                style={[
                  styles.optionText,
                  selected ? styles.optionTextSelected : null,
                ]}>
                {days}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {onboardingDraft.trainingDaysPerWeek ? (
        <Text style={styles.helperText}>
          {onboardingDraft.trainingDaysPerWeek} día
          {onboardingDraft.trainingDaysPerWeek > 1 ? 's' : ''} por semana
        </Text>
      ) : null}
      {formError ? <FormMessage message={formError} tone="error" /> : null}
      <View style={styles.footer}>
        <Button
          fullWidth={false}
          label="←"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          variant="outline"
        />
        <Button
          disabled={!onboardingDraft.trainingDaysPerWeek || submitting}
          label={submitting ? 'Guardando…' : 'Completar configuración'}
          loading={submitting}
          onPress={handleFinish}
          style={styles.finishButton}
        />
      </View>
    </ScreenContainer>
  );
}
