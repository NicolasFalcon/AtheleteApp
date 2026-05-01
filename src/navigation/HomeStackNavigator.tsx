import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {HOME_ROUTES} from '@app/constants/routes';
import {PersonalRecordsScreen} from '@app/screens/home/PersonalRecordsScreen';
import {NutritionPlanScreen} from '@app/screens/nutrition/NutritionPlanScreen';
import {QuizLandingScreen} from '@app/screens/home/QuizLandingScreen';
import {ExerciseDetailScreen} from '@app/screens/workouts/ExerciseDetailScreen';
import {WorkoutDetailScreen} from '@app/screens/workouts/WorkoutDetailScreen';
import {WorkoutSessionScreen} from '@app/screens/workouts/WorkoutSessionScreen';
import {HomeScreen} from '@app/screens/tabs/HomeScreen';
import type {HomeStackParamList} from '@app/types/navigation';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name={HOME_ROUTES.Home} component={HomeScreen} />
      <Stack.Screen
        name={HOME_ROUTES.WorkoutDetail}
        component={WorkoutDetailScreen}
      />
      <Stack.Screen
        name={HOME_ROUTES.WorkoutSession}
        component={WorkoutSessionScreen}
      />
      <Stack.Screen
        name={HOME_ROUTES.ExerciseDetail}
        component={ExerciseDetailScreen}
      />
      <Stack.Screen name={HOME_ROUTES.QuizLanding} component={QuizLandingScreen} />
      <Stack.Screen
        name={HOME_ROUTES.PersonalRecords}
        component={PersonalRecordsScreen}
      />
      <Stack.Screen
        name={HOME_ROUTES.NutritionPlan}
        component={NutritionPlanScreen}
      />
    </Stack.Navigator>
  );
}
