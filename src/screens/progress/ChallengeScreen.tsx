import {useEffect, useMemo, useState} from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {AppHeader, ScreenContainer} from '@app/components';
import {
  ELLIE_ROUTES,
  HOME_ROUTES,
  PROFILE_ROUTES,
  PROGRESS_ROUTES,
} from '@app/constants/routes';
import {EmptyState, Loader} from '@app/components/ui';
import {Core33HabitSelectionView} from '@app/features/core33/components/Core33HabitSelectionView';
import {Core33IntroView} from '@app/features/core33/components/Core33IntroView';
import {Core33StepIndicator} from '@app/features/core33/components/Core33StepIndicator';
import {Core33SummaryView} from '@app/features/core33/components/Core33SummaryView';
import {Core33TrackerView} from '@app/features/core33/components/Core33TrackerView';
import {useCore33} from '@app/hooks/useCore33';
import {useAppTheme} from '@app/hooks/useAppTheme';
import type {Core33HabitSelection} from '@app/services/supabase/core33';

type Step = 'intro' | 'habits' | 'summary' | 'tracker';

const BACK_FALLBACKS = [
  HOME_ROUTES.Home,
  ELLIE_ROUTES.Ellie,
  PROGRESS_ROUTES.Progress,
  PROFILE_ROUTES.Profile,
];

const EMPTY_SELECTION: Core33HabitSelection = {
  training: '',
  health: '',
  mind: '',
};

const STEP_INDEX: Record<Exclude<Step, 'tracker'>, number> = {
  intro: 1,
  habits: 2,
  summary: 3,
};

export function ChallengeScreen() {
  const {theme} = useAppTheme();
  const core33 = useCore33();
  const [step, setStep] = useState<Step>('intro');
  const [selectedHabits, setSelectedHabits] =
    useState<Core33HabitSelection>(EMPTY_SELECTION);

  const challenge = core33.stateQuery.data?.challenge || null;

  useEffect(() => {
    if (challenge) {
      setStep('tracker');
      return;
    }

    setSelectedHabits(current =>
      step === 'tracker' ? EMPTY_SELECTION : current,
    );

    if (step === 'tracker') {
      setStep('intro');
    }
  }, [challenge, step]);

  const styles = StyleSheet.create({
    topMeta: {
      alignItems: 'center',
      marginTop: -4,
    },
    trackerHint: {
      color: theme.colors.textSecondary,
      fontFamily: theme.typography.fontFamily,
      fontSize: 11,
      textAlign: 'center',
    },
  });

  const summaryTitle = useMemo(() => {
    if (challenge?.status === 'completed') {
      return 'Core 33 completado';
    }

    return 'Core · 33';
  }, [challenge?.status]);

  const handleStartChallenge = async () => {
    await core33.startChallenge(selectedHabits);
    setStep('tracker');
  };

  const handleRestartChallenge = async () => {
    if (!challenge) {
      return;
    }

    Alert.alert(
      challenge.status === 'completed' ? 'Empezar otra vez' : 'Reiniciar reto',
      challenge.status === 'completed'
        ? 'Se cerrará esta versión del reto para que puedas empezar un nuevo Core 33 desde cero.'
        : 'Tu versión actual del Core 33 se cerrará y tendrás que elegir hábitos nuevos para empezar otra vez.',
      [
        {text: 'Cancelar', style: 'cancel'},
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: () => {
            core33
              .restartChallenge()
              .then(() => {
                setSelectedHabits(EMPTY_SELECTION);
                setStep('intro');
              })
              .catch(() => {});
          },
        },
      ],
    );
  };

  if (core33.stateQuery.isLoading) {
    return (
      <ScreenContainer>
        <Loader label="Cargando reto..." />
      </ScreenContainer>
    );
  }

  if (core33.stateQuery.error || !core33.stateQuery.data) {
    return (
      <ScreenContainer>
        <AppHeader
          showBackButton
          title="Core · 33"
          backFallbacks={BACK_FALLBACKS}
        />
        <EmptyState
          title="No pudimos cargar Core 33"
          description="Vuelve a intentarlo en unos minutos o revisa la conexión con Supabase."
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable>
      <AppHeader
        showBackButton
        title={summaryTitle}
        backFallbacks={BACK_FALLBACKS}
      />

      {step !== 'tracker' ? (
        <View style={styles.topMeta}>
          <Core33StepIndicator currentStep={STEP_INDEX[step]} />
        </View>
      ) : (
        <Text style={styles.trackerHint}>
          Tu progreso se guarda en tiempo real y se refleja en Inicio, Progreso y Perfil.
        </Text>
      )}

      {step === 'intro' ? (
        <Core33IntroView onNext={() => setStep('habits')} />
      ) : null}

      {step === 'habits' ? (
        <Core33HabitSelectionView
          value={selectedHabits}
          onChange={setSelectedHabits}
          onBack={() => setStep('intro')}
          onNext={() => setStep('summary')}
        />
      ) : null}

      {step === 'summary' ? (
        <Core33SummaryView
          habits={selectedHabits}
          onBack={() => setStep('habits')}
          onConfirm={() => {
            handleStartChallenge().catch(() => {});
          }}
          loading={core33.isStarting}
        />
      ) : null}

      {step === 'tracker' && challenge ? (
        <Core33TrackerView
          state={core33.stateQuery.data}
          onToggleHabit={habitIndex =>
            core33.toggleHabit({
              date: core33.stateQuery.data!.today,
              habitIndex,
            }).catch(() => {})
          }
          onRestart={handleRestartChallenge}
          toggling={core33.isToggling}
          restarting={core33.isRestarting}
        />
      ) : null}
    </ScreenContainer>
  );
}
