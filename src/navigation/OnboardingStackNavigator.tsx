import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { STACK_SCREEN_OPTIONS } from '@app/navigation/stackScreenOptions';
import { ONBOARDING_ROUTES } from '@app/constants/routes';
import { OnboardingScreen } from '@app/screens/onboarding/OnboardingScreen';
import type { OnboardingStackParamList } from '@app/types/navigation';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

// v2 onboarding (ONB_02 + ONB_03) is a single screen with its own steps.
export function OnboardingStackNavigator() {
  return (
    <Stack.Navigator screenOptions={STACK_SCREEN_OPTIONS}>
      <Stack.Screen
        name={ONBOARDING_ROUTES.Flow}
        component={OnboardingScreen}
      />
    </Stack.Navigator>
  );
}
