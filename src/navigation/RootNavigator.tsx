import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet } from 'react-native';
import { enableScreens } from 'react-native-screens';
import { ROOT_ROUTES } from '@app/constants/routes';
import { ScreenContainer } from '@app/components';
import { Loader } from '@app/components/ui';
import { useAuth } from '@app/hooks/useAuth';
import { AuthStackNavigator } from '@app/navigation/AuthStackNavigator';
import { MainTabNavigator } from '@app/navigation/MainTabNavigator';
import { OnboardingStackNavigator } from '@app/navigation/OnboardingStackNavigator';
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
  const {flow, isHydrating} = useAuth();

  if (isHydrating) {
    return <RootLoadingScreen />;
  }

  return (
    <Stack.Navigator key={flow} screenOptions={{headerShown: false}}>
      {flow === 'auth' ? (
        <Stack.Screen name={ROOT_ROUTES.AuthFlow} component={AuthStackNavigator} />
      ) : null}
      {flow === 'onboarding' ? (
        <Stack.Screen
          name={ROOT_ROUTES.OnboardingFlow}
          component={OnboardingStackNavigator}
        />
      ) : null}
      {flow === 'app' ? (
        <Stack.Screen name={ROOT_ROUTES.MainTabs} component={MainTabNavigator} />
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
