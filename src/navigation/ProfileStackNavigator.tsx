import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {PROFILE_ROUTES} from '@app/constants/routes';
import {NutritionPlanScreen} from '@app/screens/nutrition/NutritionPlanScreen';
import {AchievementsScreen} from '@app/screens/profile/AchievementsScreen';
import {EditProfileScreen} from '@app/screens/profile/EditProfileScreen';
import {ChallengeScreen} from '@app/screens/progress/ChallengeScreen';
import {ProfileScreen} from '@app/screens/tabs/ProfileScreen';
import type {ProfileStackParamList} from '@app/types/navigation';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name={PROFILE_ROUTES.Profile} component={ProfileScreen} />
      <Stack.Screen
        name={PROFILE_ROUTES.Challenge}
        component={ChallengeScreen}
      />
      <Stack.Screen
        name={PROFILE_ROUTES.EditProfile}
        component={EditProfileScreen}
      />
      <Stack.Screen
        name={PROFILE_ROUTES.Achievements}
        component={AchievementsScreen}
      />
      <Stack.Screen
        name={PROFILE_ROUTES.NutritionPlan}
        component={NutritionPlanScreen}
      />
    </Stack.Navigator>
  );
}
