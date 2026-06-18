import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PROGRESS_ROUTES } from '@app/constants/routes';
import { PersonalRecordsScreen } from '@app/screens/home/PersonalRecordsScreen';
import { NutritionPlanScreen } from '@app/screens/nutrition/NutritionPlanScreen';
import { BodyScienceArticleDetailScreen } from '@app/screens/progress/BodyScienceArticleDetailScreen';
import { BodyScienceScreen } from '@app/screens/progress/BodyScienceScreen';
import { ChallengeScreen } from '@app/screens/progress/ChallengeScreen';
import { RegisterPrScreen } from '@app/screens/pr/RegisterPrScreen';
import { ProgressScreen } from '@app/screens/tabs/ProgressScreen';
import { useTabBarMotion } from '@app/hooks/useTabBarMotion';
import type { ProgressStackParamList } from '@app/types/navigation';

const Stack = createNativeStackNavigator<ProgressStackParamList>();

export function ProgressStackNavigator() {
  const { setTabBarVisible } = useTabBarMotion();

  return (
    <Stack.Navigator
      screenListeners={{
        state: event => {
          const state = event.data.state;
          const activeRoute = state.routes[state.index];

          setTabBarVisible(activeRoute.name === PROGRESS_ROUTES.Progress);
        },
      }}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen
        name={PROGRESS_ROUTES.Progress}
        component={ProgressScreen}
      />
      <Stack.Screen
        name={PROGRESS_ROUTES.PersonalRecords}
        component={PersonalRecordsScreen}
      />
      <Stack.Screen
        name={PROGRESS_ROUTES.RegisterPr}
        component={RegisterPrScreen}
      />
      <Stack.Screen
        name={PROGRESS_ROUTES.Challenge}
        component={ChallengeScreen}
      />
      <Stack.Screen
        name={PROGRESS_ROUTES.NutritionPlan}
        component={NutritionPlanScreen}
      />
      <Stack.Screen
        name={PROGRESS_ROUTES.BodyScience}
        component={BodyScienceScreen}
      />
      <Stack.Screen
        name={PROGRESS_ROUTES.BodyScienceArticle}
        component={BodyScienceArticleDetailScreen}
      />
    </Stack.Navigator>
  );
}
