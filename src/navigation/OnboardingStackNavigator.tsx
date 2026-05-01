import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ONBOARDING_ROUTES } from '@app/constants/routes';
import { BodyDataScreen } from '@app/screens/onboarding/BodyDataScreen';
import { GoalSelectionScreen } from '@app/screens/onboarding/GoalSelectionScreen';
import { TrainingFrequencyScreen } from '@app/screens/onboarding/TrainingFrequencyScreen';
import { WelcomeScreen } from '@app/screens/onboarding/WelcomeScreen';
import type { OnboardingStackParamList } from '@app/types/navigation';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name={ONBOARDING_ROUTES.Welcome} component={WelcomeScreen} />
      <Stack.Screen
        name={ONBOARDING_ROUTES.GoalSelection}
        component={GoalSelectionScreen}
      />
      <Stack.Screen name={ONBOARDING_ROUTES.BodyData} component={BodyDataScreen} />
      <Stack.Screen
        name={ONBOARDING_ROUTES.TrainingFrequency}
        component={TrainingFrequencyScreen}
      />
    </Stack.Navigator>
  );
}
