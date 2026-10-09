export const ROOT_ROUTES = {
  AuthFlow: 'AuthFlow',
  OnboardingFlow: 'OnboardingFlow',
  MainTabs: 'MainTabs',
  // Development only: tabs without session for fixture-only screens.
  DevFixtureTabs: 'DevFixtureTabs',
} as const;

export const AUTH_ROUTES = {
  Login: 'Login',
  Register: 'Register',
  ForgotPassword: 'ForgotPassword',
  ResetPassword: 'ResetPassword',
} as const;

export const ONBOARDING_ROUTES = {
  Flow: 'Flow',
  Welcome: 'Welcome',
  Avatar: 'Avatar',
  BirthDate: 'BirthDate',
  Gender: 'Gender',
  Weight: 'Weight',
  Height: 'Height',
  TrainingFrequency: 'TrainingFrequency',
  GoalSelection: 'GoalSelection',
  Complete: 'Complete',
} as const;

export const TAB_ROUTES = {
  Home: 'Home',
  Workouts: 'Workouts',
  Ellie: 'Ellie',
  Progress: 'Progress',
  Community: 'Community',
} as const;

// Screens of the shared root stack (above the tabs). One name per screen:
// the tab bar is hidden on all of them (handoff §6).
export const APP_ROUTES = {
  Profile: 'Profile',
  EditProfile: 'EditProfile',
  Settings: 'Settings',
  HealthSettings: 'HealthSettings',
  Achievements: 'Achievements',
  Notifications: 'Notifications',
  Core33: 'Core33',
  Core33Intro: 'Core33Intro',
  Core33Explore: 'Core33Explore',
  Core33Detail: 'Core33Detail',
  Core33Ready: 'Core33Ready',
  WorkoutDetail: 'WorkoutDetail',
  WorkoutSession: 'WorkoutSession',
  WorkoutSummary: 'WorkoutSummary',
  ExerciseDetail: 'ExerciseDetail',
  ExerciseList: 'ExerciseList',
  RoutineList: 'RoutineList',
  EllieChat: 'EllieChat',
  EllieVoice: 'EllieVoice',
  CreateRoutine: 'CreateRoutine',
  EditRoutine: 'EditRoutine',
  AddExerciseToRoutine: 'AddExerciseToRoutine',
  QuizLanding: 'QuizLanding',
  QuizChallenge: 'QuizChallenge',
  QuizQuestion: 'QuizQuestion',
  QuizResult: 'QuizResult',
  PersonalRecords: 'PersonalRecords',
  RegisterPr: 'RegisterPr',
  NutritionPlan: 'NutritionPlan',
  BodyScience: 'BodyScience',
  BodyScienceArticle: 'BodyScienceArticle',
  // Comunidad · tanda B (personas).
  SocialProfile: 'SocialProfile',
  SocialPrivacy: 'SocialPrivacy',
  SocialInvite: 'SocialInvite',
  SocialBlocked: 'SocialBlocked',
  SocialUsername: 'SocialUsername',
  // Comunidad · tanda UI-A (contenido).
  SocialPost: 'SocialPost',
  SocialCompose: 'SocialCompose',
  // Comunidad · tanda UI-C (retos, notificaciones, moderación, rutina).
  SocialChallenge: 'SocialChallenge',
  SocialCreateChallenge: 'SocialCreateChallenge',
  SocialChallengeDone: 'SocialChallengeDone',
  SocialNotifications: 'SocialNotifications',
  SocialModeration: 'SocialModeration',
  SocialModerationItem: 'SocialModerationItem',
  SocialRoutine: 'SocialRoutine',
} as const;
