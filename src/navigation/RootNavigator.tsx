import { useCallback, useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet } from 'react-native';
import { enableScreens } from 'react-native-screens';
import { ROOT_ROUTES } from '@app/constants/routes';
import { ScreenContainer } from '@app/components';
import { Loader } from '@app/components/ui';
import { useAuth } from '@app/hooks/useAuth';
import {
  hasSeenVisualOnboarding,
  markVisualOnboardingAsSeen,
} from '@app/lib/visualOnboarding';
import { AuthStackNavigator } from '@app/navigation/AuthStackNavigator';
import { MainTabNavigator } from '@app/navigation/MainTabNavigator';
import { OnboardingStackNavigator } from '@app/navigation/OnboardingStackNavigator';
import { VisualOnboardingScreen } from '@app/screens/onboarding/VisualOnboardingScreen';
import type { RootStackParamList } from '@app/types/navigation';

enableScreens();

const Stack = createNativeStackNavigator<RootStackParamList>();

function RootLoadingScreen() {
  return (
    <ScreenContainer contentContainerStyle={styles.loadingContent}>
      <Loader label="Restaurando sesión..." />
    </ScreenContainer>
  );
}

export function RootNavigator() {
  const { flow, isHydrating, isPasswordRecoveryActive } = useAuth();
  const [visualOnboardingState, setVisualOnboardingState] = useState<
    'loading' | 'pending' | 'seen'
  >('loading');

  useEffect(() => {
    hasSeenVisualOnboarding()
      .then(seen => {
        setVisualOnboardingState(seen ? 'seen' : 'pending');
      })
      .catch(() => {
        setVisualOnboardingState('pending');
      });
  }, []);

  useEffect(() => {
    if (isHydrating || visualOnboardingState !== 'pending' || flow === 'auth') {
      return;
    }

    markVisualOnboardingAsSeen().catch(() => {});
    setVisualOnboardingState('seen');
  }, [flow, isHydrating, visualOnboardingState]);

  const completeVisualOnboarding = useCallback(async () => {
    try {
      await markVisualOnboardingAsSeen();
    } finally {
      setVisualOnboardingState('seen');
    }
  }, []);

  if (isHydrating || visualOnboardingState === 'loading') {
    return <RootLoadingScreen />;
  }

  if (
    flow === 'auth' &&
    visualOnboardingState === 'pending' &&
    !isPasswordRecoveryActive
  ) {
    return <VisualOnboardingScreen onComplete={completeVisualOnboarding} />;
  }

  return (
    <Stack.Navigator key={flow} screenOptions={{ headerShown: false }}>
      {flow === 'auth' ? (
        <Stack.Screen
          name={ROOT_ROUTES.AuthFlow}
          component={AuthStackNavigator}
        />
      ) : null}
      {flow === 'onboarding' ? (
        <Stack.Screen
          name={ROOT_ROUTES.OnboardingFlow}
          component={OnboardingStackNavigator}
        />
      ) : null}
      {flow === 'app' ? (
        <Stack.Screen
          name={ROOT_ROUTES.MainTabs}
          component={MainTabNavigator}
        />
      ) : null}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
  },
});
