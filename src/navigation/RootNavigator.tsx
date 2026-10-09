import { Core33Screen } from '@app/screens/core33/Core33Screen';
import { Core33IntroScreen } from '@app/screens/core33/Core33IntroScreen';
import { Core33ExploreScreen } from '@app/screens/core33/Core33ExploreScreen';
import { Core33DetailScreen } from '@app/screens/core33/Core33DetailScreen';
import { Core33ReadyScreen } from '@app/screens/core33/Core33ReadyScreen';
import { SettingsScreen } from '@app/screens/profile/SettingsScreen';
import { HealthSettingsScreen } from '@app/screens/profile/HealthSettingsScreen';
import { EllieChatScreen } from '@app/screens/ellie/EllieChatScreen';
import { EllieVoiceScreen } from '@app/screens/ellie/EllieVoiceScreen';
import { RouteSoonScreen } from '@app/screens/home/RouteSoonScreen';
import { WearScreen } from '@app/screens/wear/WearScreen';
import { useCallback, useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet } from 'react-native';
import { enableScreens } from 'react-native-screens';
import { APP_ROUTES, ROOT_ROUTES } from '@app/constants/routes';
import { ScreenContainer } from '@app/components';
import { Loader } from '@app/components/ui';
import { markFirstScreenReady } from '@app/app/launchGate';
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
import { QuizChallengeScreen } from '@app/screens/quiz/QuizChallengeScreen';
import { QuizQuestionScreen } from '@app/screens/quiz/QuizQuestionScreen';
import { DevFixtureTabs } from '@app/dev/DevFixtureTabs';
import { QuizResultScreen } from '@app/screens/quiz/QuizResultScreen';
import { SocialChallengeDoneScreen } from '@app/screens/social/SocialChallengeDoneScreen';
import { SocialChallengeScreen } from '@app/screens/social/SocialChallengeScreen';
import { SocialCreateChallengeScreen } from '@app/screens/social/SocialCreateChallengeScreen';
import { SocialModerationItemScreen } from '@app/screens/social/SocialModerationItemScreen';
import { SocialModerationScreen } from '@app/screens/social/SocialModerationScreen';
import { SocialNotificationsScreen } from '@app/screens/social/SocialNotificationsScreen';
import { SocialRoutineScreen } from '@app/screens/social/SocialRoutineScreen';
import { SocialComposeScreen } from '@app/screens/social/SocialComposeScreen';
import { SocialPostScreen } from '@app/screens/social/SocialPostScreen';
import { SocialBlockedScreen } from '@app/screens/social/SocialBlockedScreen';
import { SocialInviteScreen } from '@app/screens/social/SocialInviteScreen';
import { SocialPrivacyScreen } from '@app/screens/social/SocialPrivacyScreen';
import { SocialProfileScreen } from '@app/screens/social/SocialProfileScreen';
import { SocialUsernameScreen } from '@app/screens/social/SocialUsernameScreen';
import { ProfileScreen } from '@app/screens/tabs/ProfileScreen';
import { AddExerciseToRoutineScreen } from '@app/screens/workouts/AddExerciseToRoutineScreen';
import { CreateRoutineScreen } from '@app/screens/workouts/CreateRoutineScreen';
import { ExerciseDetailScreen } from '@app/screens/workouts/ExerciseDetailScreen';
import { ExerciseListScreen } from '@app/screens/workouts/ExerciseListScreen';
import { RoutineListScreen } from '@app/screens/workouts/RoutineListScreen';
import { WorkoutDetailScreen } from '@app/screens/workouts/WorkoutDetailScreen';
import { WorkoutSessionScreen } from '@app/screens/workouts/WorkoutSessionScreen';
import { WorkoutSummaryScreen } from '@app/screens/workouts/WorkoutSummaryScreen';
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

  const isRestoring = isHydrating || visualOnboardingState === 'loading';

  useEffect(() => {
    if (!isRestoring) {
      markFirstScreenReady();
    }
  }, [isRestoring]);

  if (isRestoring) {
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
      {/* Development only: screens that use sample data open without a
          session (athelete://dev/social, athelete://dev/quiz). */}
      {__DEV__ && flow === 'auth' ? (
        <Stack.Group>
          <Stack.Screen
            name={ROOT_ROUTES.DevFixtureTabs}
            component={DevFixtureTabs}
          />
          <Stack.Screen
            name={APP_ROUTES.SocialProfile}
            component={SocialProfileScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.SocialPrivacy}
            component={SocialPrivacyScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.SocialInvite}
            component={SocialInviteScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.SocialBlocked}
            component={SocialBlockedScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.SocialChallenge}
            component={SocialChallengeScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.SocialCreateChallenge}
            component={SocialCreateChallengeScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.SocialChallengeDone}
            component={SocialChallengeDoneScreen}
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen
            name={APP_ROUTES.SocialNotifications}
            component={SocialNotificationsScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.SocialModeration}
            component={SocialModerationScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.SocialModerationItem}
            component={SocialModerationItemScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.SocialRoutine}
            component={SocialRoutineScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.SocialPost}
            component={SocialPostScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.SocialCompose}
            component={SocialComposeScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen
            name={APP_ROUTES.SocialUsername}
            component={SocialUsernameScreen}
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen
            name={APP_ROUTES.QuizLanding}
            component={QuizLandingScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.QuizChallenge}
            component={QuizChallengeScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.QuizQuestion}
            component={QuizQuestionScreen}
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen
            name={APP_ROUTES.QuizResult}
            component={QuizResultScreen}
            options={{ gestureEnabled: false }}
          />
        </Stack.Group>
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
            name={APP_ROUTES.EllieChat}
            component={EllieChatScreen}
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen
            name={APP_ROUTES.EllieVoice}
            component={EllieVoiceScreen}
            options={{ animation: 'fade', gestureEnabled: false }}
          />
          <Stack.Screen name={APP_ROUTES.RouteSoon} component={RouteSoonScreen} />
          <Stack.Screen name={APP_ROUTES.Wear} component={WearScreen} />
          <Stack.Screen
            name={APP_ROUTES.EditProfile}
            component={EditProfileScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.Settings}
            component={SettingsScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.HealthSettings}
            component={HealthSettingsScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.Achievements}
            component={AchievementsScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.Notifications}
            component={NotificationsScreen}
          />
          <Stack.Screen name={APP_ROUTES.Core33} component={Core33Screen} />
          <Stack.Screen name={APP_ROUTES.Core33Intro} component={Core33IntroScreen} />
          <Stack.Screen name={APP_ROUTES.Core33Explore} component={Core33ExploreScreen} />
          <Stack.Screen name={APP_ROUTES.Core33Detail} component={Core33DetailScreen} />
          <Stack.Screen
            name={APP_ROUTES.Core33Ready}
            component={Core33ReadyScreen}
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen
            name={APP_ROUTES.WorkoutDetail}
            component={WorkoutDetailScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.WorkoutSession}
            component={WorkoutSessionScreen}
            // Leaving goes through "Salir del entreno" (no swipe back).
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen
            name={APP_ROUTES.WorkoutSummary}
            component={WorkoutSummaryScreen}
            options={{ gestureEnabled: false }}
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
            name={APP_ROUTES.RoutineList}
            component={RoutineListScreen}
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
            name={APP_ROUTES.QuizChallenge}
            component={QuizChallengeScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.QuizQuestion}
            component={QuizQuestionScreen}
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen
            name={APP_ROUTES.QuizResult}
            component={QuizResultScreen}
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen
            name={APP_ROUTES.SocialProfile}
            component={SocialProfileScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.SocialPrivacy}
            component={SocialPrivacyScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.SocialInvite}
            component={SocialInviteScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.SocialBlocked}
            component={SocialBlockedScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.SocialChallenge}
            component={SocialChallengeScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.SocialCreateChallenge}
            component={SocialCreateChallengeScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.SocialChallengeDone}
            component={SocialChallengeDoneScreen}
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen
            name={APP_ROUTES.SocialNotifications}
            component={SocialNotificationsScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.SocialModeration}
            component={SocialModerationScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.SocialModerationItem}
            component={SocialModerationItemScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.SocialRoutine}
            component={SocialRoutineScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.SocialPost}
            component={SocialPostScreen}
          />
          <Stack.Screen
            name={APP_ROUTES.SocialCompose}
            component={SocialComposeScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen
            name={APP_ROUTES.SocialUsername}
            component={SocialUsernameScreen}
            options={{ gestureEnabled: false }}
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
