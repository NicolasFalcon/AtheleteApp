import { useState } from 'react';
import { ImageBackground, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { visualOnboardingTrainAnywhere } from '@app/assets/images';
import { FormMessage } from '@app/components/auth/FormMessage';
import { Button } from '@app/components/ui';
import { useAuth } from '@app/hooks/useAuth';
import { useAppTheme } from '@app/hooks/useAppTheme';
import type { OnboardingData } from '@app/types/auth';
import type { OnboardingStackParamList } from '@app/types/navigation';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Complete'>;

function buildPayload(draft: Partial<OnboardingData>): OnboardingData | null {
  if (
    (!draft.avatarKey && !draft.profilePhotoUrl) ||
    !draft.birthDate ||
    !draft.gender ||
    !draft.weight ||
    !draft.height ||
    !draft.trainingDaysPerWeek ||
    !draft.goal
  ) {
    return null;
  }

  return {
    ...draft,
    avatarKey: draft.avatarKey ?? null,
    profilePhotoUrl: draft.profilePhotoUrl ?? null,
  } as OnboardingData;
}

export function ProfileSetupCompleteScreen(_props: Props) {
  const { theme } = useAppTheme();
  const { completeOnboarding, onboardingDraft } = useAuth();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const styles = createStyles(theme);

  const finish = async () => {
    const payload = buildPayload(onboardingDraft);
    if (!payload) {
      setError('Faltan datos del perfil. Vuelve atrás y completa cada paso.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await completeOnboarding(payload);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'No se pudo guardar tu perfil.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ImageBackground
      source={visualOnboardingTrainAnywhere}
      style={styles.screen}
    >
      <View style={styles.overlay} />
      <View style={styles.content}>
        <View style={styles.copy}>
          <Text style={styles.title}>Todo listo</Text>
          <Text style={styles.subtitle}>
            Tu perfil está completo. Ya puedes entrenar con una experiencia
            personalizada por Athelete y ELLIE.
          </Text>
        </View>
        {error ? <FormMessage message={error} tone="error" /> : null}
        <Button
          label={submitting ? 'Preparando tu experiencia…' : 'Empezar ahora'}
          loading={submitting}
          onPress={finish}
          style={styles.button}
          textStyle={styles.buttonText}
        />
      </View>
    </ImageBackground>
  );
}

type Theme = ReturnType<typeof useAppTheme>['theme'];

function createStyles(theme: Theme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    overlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0,0,0,0.54)',
    },
    content: {
      gap: theme.spacing.xl,
      paddingHorizontal: theme.spacing.xl,
      paddingBottom: theme.spacing.xxxl,
    },
    copy: {
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    title: {
      color: '#FFFFFF',
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.display,
      fontWeight: theme.typography.weights.bold,
      textAlign: 'center',
    },
    subtitle: {
      maxWidth: 330,
      color: 'rgba(255,255,255,0.78)',
      fontFamily: theme.typography.fontFamily,
      fontSize: theme.typography.sizes.body,
      lineHeight: 24,
      textAlign: 'center',
    },
    button: {
      backgroundColor: '#FFFFFF',
      borderColor: 'rgba(255,255,255,0.5)',
    },
    buttonText: {
      color: '#111111',
    },
  });
}
