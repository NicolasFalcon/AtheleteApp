import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {HOME_ROUTES} from '@app/constants/routes';
import {PersonalRecordsScreen} from '@app/screens/home/PersonalRecordsScreen';
import {NutritionPlanScreen} from '@app/screens/nutrition/NutritionPlanScreen';
import {NotificationsScreen} from '@app/screens/home/NotificationsScreen';
import {RegisterPrScreen} from '@app/screens/pr/RegisterPrScreen';
import {QuizLandingScreen} from '@app/screens/home/QuizLandingScreen';
import {QuizQuestionScreen} from '@app/screens/quiz/QuizQuestionScreen';
import {QuizResultScreen} from '@app/screens/quiz/QuizResultScreen';
import {ChallengeScreen} from '@app/screens/progress/ChallengeScreen';
import {AddExerciseToRoutineScreen} from '@app/screens/workouts/AddExerciseToRoutineScreen';
import {CreateRoutineScreen} from '@app/screens/workouts/CreateRoutineScreen';
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
        name={HOME_ROUTES.Notifications}
        component={NotificationsScreen}
      />
      <Stack.Screen
        name={HOME_ROUTES.Challenge}
        component={ChallengeScreen}
      />
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
      <Stack.Screen
        name={HOME_ROUTES.CreateRoutine}
        component={CreateRoutineScreen}
      />
      <Stack.Screen
        name={HOME_ROUTES.EditRoutine}
        component={CreateRoutineScreen}
      />
      <Stack.Screen
        name={HOME_ROUTES.AddExerciseToRoutine}
        component={AddExerciseToRoutineScreen}
      />
      <Stack.Screen name={HOME_ROUTES.QuizLanding} component={QuizLandingScreen} />
      <Stack.Screen
        name={HOME_ROUTES.QuizQuestion}
        component={QuizQuestionScreen}
      />
      <Stack.Screen
        name={HOME_ROUTES.QuizResult}
        component={QuizResultScreen}
      />
      <Stack.Screen
        name={HOME_ROUTES.PersonalRecords}
        component={PersonalRecordsScreen}
      />
      <Stack.Screen name={HOME_ROUTES.RegisterPr} component={RegisterPrScreen} />
      <Stack.Screen
        name={HOME_ROUTES.NutritionPlan}
        component={NutritionPlanScreen}
      />
    </Stack.Navigator>
  );
}
