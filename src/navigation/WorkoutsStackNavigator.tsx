import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {WORKOUTS_ROUTES} from '@app/constants/routes';
import {PersonalRecordsScreen} from '@app/screens/home/PersonalRecordsScreen';
import {RegisterPrScreen} from '@app/screens/pr/RegisterPrScreen';
import {AddExerciseToRoutineScreen} from '@app/screens/workouts/AddExerciseToRoutineScreen';
import {CreateRoutineScreen} from '@app/screens/workouts/CreateRoutineScreen';
import {ExerciseDetailScreen} from '@app/screens/workouts/ExerciseDetailScreen';
import {WorkoutDetailScreen} from '@app/screens/workouts/WorkoutDetailScreen';
import {WorkoutSessionScreen} from '@app/screens/workouts/WorkoutSessionScreen';
import {WorkoutsScreen} from '@app/screens/tabs/WorkoutsScreen';
import type {WorkoutsStackParamList} from '@app/types/navigation';

const Stack = createNativeStackNavigator<WorkoutsStackParamList>();

export function WorkoutsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name={WORKOUTS_ROUTES.Workouts} component={WorkoutsScreen} />
      <Stack.Screen
        name={WORKOUTS_ROUTES.CreateRoutine}
        component={CreateRoutineScreen}
      />
      <Stack.Screen
        name={WORKOUTS_ROUTES.EditRoutine}
        component={CreateRoutineScreen}
      />
      <Stack.Screen
        name={WORKOUTS_ROUTES.AddExerciseToRoutine}
        component={AddExerciseToRoutineScreen}
      />
      <Stack.Screen
        name={WORKOUTS_ROUTES.WorkoutDetail}
        component={WorkoutDetailScreen}
      />
      <Stack.Screen
        name={WORKOUTS_ROUTES.WorkoutSession}
        component={WorkoutSessionScreen}
      />
      <Stack.Screen
        name={WORKOUTS_ROUTES.ExerciseDetail}
        component={ExerciseDetailScreen}
      />
      <Stack.Screen
        name={WORKOUTS_ROUTES.PersonalRecords}
        component={PersonalRecordsScreen}
      />
      <Stack.Screen
        name={WORKOUTS_ROUTES.RegisterPr}
        component={RegisterPrScreen}
      />
    </Stack.Navigator>
  );
}
