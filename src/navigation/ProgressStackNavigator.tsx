import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {PROGRESS_ROUTES} from '@app/constants/routes';
import {PersonalRecordsScreen} from '@app/screens/home/PersonalRecordsScreen';
import {NutritionPlanScreen} from '@app/screens/nutrition/NutritionPlanScreen';
import {ChallengeScreen} from '@app/screens/progress/ChallengeScreen';
import {ProgressScreen} from '@app/screens/tabs/ProgressScreen';
import type {ProgressStackParamList} from '@app/types/navigation';

const Stack = createNativeStackNavigator<ProgressStackParamList>();

export function ProgressStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name={PROGRESS_ROUTES.Progress} component={ProgressScreen} />
      <Stack.Screen
        name={PROGRESS_ROUTES.PersonalRecords}
        component={PersonalRecordsScreen}
      />
      <Stack.Screen
        name={PROGRESS_ROUTES.Challenge}
        component={ChallengeScreen}
      />
      <Stack.Screen
        name={PROGRESS_ROUTES.NutritionPlan}
        component={NutritionPlanScreen}
      />
    </Stack.Navigator>
  );
}
