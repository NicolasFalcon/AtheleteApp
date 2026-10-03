import { useCallback, useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet } from 'react-native';
import { enableScreens } from 'react-native-screens';
import { APP_ROUTES, ROOT_ROUTES } from '@app/constants/routes';
import { ScreenContainer } from '@app/components';
import { Loader } from '@app/components/ui';
import { useAuth } from '@app/hooks/useAuth';
import {
  hasSeenVisualOnboarding,
  markVisualOnboardingAsSeen,
} from '@app/lib/visualOnboarding';
import { AuthStackNavigator } from '@app/navigation/AuthStackNavigator';
import { MainTabNavigator } from '@app/navigation/MainTabNavigator';
import { OnboardingStackNavigator } from '@app/navigation/OnboardingStackNavigator';
import { VisualOnboardingScreen } from '@app/screens/onboarding/VisualOnboardingScreen';
import { NotificationsScreen } from '@app/screens/home/NotificationsScreen';
import { PersonalRecordsScreen } from '@app/screens/home/PersonalRecordsScreen';
import { QuizLandingScreen } from '@app/screens/home/QuizLandingScreen';
import { NutritionPlanScreen } from '@app/screens/nutrition/NutritionPlanScreen';
import { RegisterPrScreen } from '@app/screens/pr/RegisterPrScreen';
import { AchievementsScreen } from '@app/screens/profile/AchievementsScreen';
import { EditProfileScreen } from '@app/screens/profile/EditProfileScreen';
import { BodyScienceArticleDetailScreen } from '@app/screens/progress/BodyScienceArticleDetailScreen';
import { BodyScienceScreen } from '@app/screens/progress/BodyScienceScreen';
import { ChallengeScreen } from '@app/screens/progress/ChallengeScreen';
import { QuizQuestionScreen } from '@app/screens/quiz/QuizQuestionScreen';
import { QuizResultScreen } from '@app/screens/quiz/QuizResultScreen';
import { ProfileScreen } from '@app/screens/tabs/ProfileScreen';
import { AddExerciseToRoutineScreen } from '@app/screens/workouts/AddExerciseToRoutineScreen';
import { CreateRoutineScreen } from '@app/screens/workouts/CreateRoutineScreen';
import { ExerciseDetailScreen } from '@app/screens/workouts/ExerciseDetailScreen';
import { ExerciseListScreen } from '@app/screens/workouts/ExerciseListScreen';
import { WorkoutDetailScreen } from '@app/screens/workouts/WorkoutDetailScreen';
import { WorkoutSessionScreen } from '@app/screens/workouts/WorkoutSessionScreen';
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
  const { flow, isHydrating, isPasswordRecoveryActive } = useAuth();
  const [visualOnboardingState, setVisualOnboardingState] = useState<
    'loading' | 'pending' | 'seen'
  >('loading');

  useEffect(() => {
    hasSeenVisualOnboarding()
      .then(seen => {
        setVisualOnboardingState(seen ? 'seen' : 'pending');
      })
      .catch(() => {
        setVisualOnboardingState('pending');
      });
  }, []);

  useEffect(() => {
    if (isHydrating || visualOnboardingState !== 'pending' || flow === 'auth') {
      return;
    }

    markVisualOnboardingAsSeen().catch(() => {});
    setVisualOnboardingState('seen');
  }, [flow, isHydrating, visualOnboardingState]);

  const completeVisualOnboarding = useCallback(async () => {
    try {
      await markVisualOnboardingAsSeen();
    } finally {
      setVisualOnboardingState('seen');
    }
  }, []);

  if (isHydrating || visualOnboardingState === 'loading') {
    return <RootLoadingScreen />;
  }

  if (
    flow === 'auth' &&
    visualOnboardingState === 'pending' &&
    !isPasswordRecoveryActive
  ) {
    return <VisualOnboardingScreen onComplete={completeVisualOnboarding} />;
  }

  return (
    <Stack.Navigator key={flow} screenOptions={{ headerShown: false }}>
      {flow === 'auth' ? (
        <Stack.Screen
          name={ROOT_ROUTES.AuthFlow}
          component={AuthStackNavigator}
        />
      ) : null}
      {flow === 'onboarding' ? (
        <Stack.Screen
          name={ROOT_ROUTES.OnboardingFlow}
          component={OnboardingStackNavigator}
        />
      ) : null}
      {flow === 'app' ? (
        <Stack.Group>
          <Stack.Screen
            name={ROOT_ROUTES.MainTabs}
            component={MainTabNavigator}
          />
          {/* Shared screens above the tabs (one registration each). */}
          <Stack.Screen name={APP_ROUTES.Profile} component={ProfileScreen} />
          <Stack.Screen
            name={APP_ROUTES.EditProfile}
            component={EditProfileScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.Achievements}
            component={AchievementsScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.Notifications}
            component={NotificationsScreen}
          />
          <Stack.Screen name={APP_ROUTES.Core33} component={ChallengeScreen} />
          <Stack.Screen
            name={APP_ROUTES.WorkoutDetail}
            component={WorkoutDetailScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.WorkoutSession}
            component={WorkoutSessionScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.ExerciseDetail}
            component={ExerciseDetailScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.ExerciseList}
            component={ExerciseListScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.CreateRoutine}
            component={CreateRoutineScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.EditRoutine}
            component={CreateRoutineScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.AddExerciseToRoutine}
            component={AddExerciseToRoutineScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.QuizLanding}
            component={QuizLandingScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.QuizQuestion}
            component={QuizQuestionScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.QuizResult}
            component={QuizResultScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.PersonalRecords}
            component={PersonalRecordsScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.RegisterPr}
            component={RegisterPrScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.NutritionPlan}
            component={NutritionPlanScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.BodyScience}
            component={BodyScienceScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.BodyScienceArticle}
            component={BodyScienceArticleDetailScreen}
          />
        </Stack.Group>
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
