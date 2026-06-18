import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ONBOARDING_ROUTES } from '@app/constants/routes';
import { AvatarPickerScreen } from '@app/screens/onboarding/AvatarPickerScreen';
import { BirthDateScreen } from '@app/screens/onboarding/BirthDateScreen';
import { GenderSelectionScreen } from '@app/screens/onboarding/GenderSelectionScreen';
import { GoalSelectionScreen } from '@app/screens/onboarding/GoalSelectionScreen';
import { HeightInputScreen } from '@app/screens/onboarding/HeightInputScreen';
import { ProfileSetupCompleteScreen } from '@app/screens/onboarding/ProfileSetupCompleteScreen';
import { TrainingFrequencyScreen } from '@app/screens/onboarding/TrainingFrequencyScreen';
import { WelcomeScreen } from '@app/screens/onboarding/WelcomeScreen';
import { WeightInputScreen } from '@app/screens/onboarding/WeightInputScreen';
import type { OnboardingStackParamList } from '@app/types/navigation';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name={ONBOARDING_ROUTES.Welcome}
        component={WelcomeScreen}
      />
      <Stack.Screen
        name={ONBOARDING_ROUTES.Avatar}
        component={AvatarPickerScreen}
      />
      <Stack.Screen
        name={ONBOARDING_ROUTES.BirthDate}
        component={BirthDateScreen}
      />
      <Stack.Screen
        name={ONBOARDING_ROUTES.Gender}
        component={GenderSelectionScreen}
      />
      <Stack.Screen
        name={ONBOARDING_ROUTES.Weight}
        component={WeightInputScreen}
      />
      <Stack.Screen
        name={ONBOARDING_ROUTES.Height}
        component={HeightInputScreen}
      />
      <Stack.Screen
        name={ONBOARDING_ROUTES.TrainingFrequency}
        component={TrainingFrequencyScreen}
      />
      <Stack.Screen
        name={ONBOARDING_ROUTES.GoalSelection}
        component={GoalSelectionScreen}
      />
      <Stack.Screen
        name={ONBOARDING_ROUTES.Complete}
        component={ProfileSetupCompleteScreen}
      />
    </Stack.Navigator>
  );
}
