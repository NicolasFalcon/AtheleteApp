import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type {
  CompositeScreenProps,
  NavigatorScreenParams,
} from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import type { Core33ChallengeId } from '@app/features/core33/core33Catalog';
import type { LibraryExercise, Workout, WorkoutType } from '@app/shared';
import type {
  QuizChallengeRouteParams,
  QuizLandingRouteParams,
  QuizQuestionRouteParams,
  QuizResultRouteParams,
} from '@app/types/quiz';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
};

export type OnboardingStackParamList = {
  // v2: 9 questions + ELLIE welcome in one screen. The routes below belong
  // to the v1 onboarding, no longer registered (pending cleanup).
  Flow: undefined;
  Welcome: undefined;
  Avatar: undefined;
  BirthDate: undefined;
  Gender: undefined;
  Weight: undefined;
  Height: undefined;
  TrainingFrequency: undefined;
  GoalSelection: undefined;
  Complete: undefined;
};

export type WorkoutDetailRouteParams = {
  workoutId: Workout['id'];
};

export type WorkoutSessionRouteParams = {
  workoutId: Workout['id'];
  // A specific session (e.g. one saved for later on another day).
  sessionId?: string;
};

// Resumen de cierre (SESSION_07).
export type WorkoutSummaryRouteParams = {
  sessionId: string;
  // Badges unlocked by workout_completed (from the completion response).
  newBadges?: string[];
};

export type ExerciseDetailRouteParams = {
  exerciseId: LibraryExercise['id'];
  // Opens the MoveKit area in full screen (EXERCISE_02).
  fullscreen?: boolean;
};

// Entrenos · lista filtrada (WORKOUTS_04): a zone, an equipment or all.
export type ExerciseListRouteParams = {
  zone?: string;
  equipment?: string;
  openFilters?: boolean;
  focusSearch?: boolean;
};

// Entrenos · lista de rutinas (D-46): a card (type) or a collection.
export type RoutineListRouteParams = {
  type?: WorkoutType;
  collection?: 'favorites' | 'mine' | 'all';
  focusSearch?: boolean;
};

// Entrenos tab (WORKOUTS_01 / 03).
export type WorkoutsTabParams = {
  segment?: 'routines' | 'exercises';
};

export type RoutineBuilderRouteParams = {
  workoutId?: Workout['id'];
  initialExerciseId?: LibraryExercise['id'];
  initialExerciseName?: string;
};

export type EditRoutineRouteParams = {
  workoutId: Workout['id'];
};

export type AddExerciseToRoutineRouteParams = {
  exerciseId: LibraryExercise['id'];
  exerciseName: string;
};

export type PersonalRecordsRouteParams = {
  exerciseId?: LibraryExercise['id'];
  exerciseName?: string;
};

export type RegisterPrRouteParams = {
  exerciseId?: LibraryExercise['id'];
  exerciseName?: string;
  showExercisePicker?: boolean;
};

// Calorías (Nutrición): the day, with the meals and the photo flow.
export type NutritionPlanRouteParams = undefined;

// Camera of Calorías. From Inicio it says "Hoy llevas X kcal".
export type CaloriesCameraRouteParams = {
  source?: 'home' | 'nutrition';
  todayKcal?: number;
};

// Result / editor of a meal. `draft` is a MealDraft (plain data). With
// `mealId` it edits that meal ("Guardar cambios"); otherwise it adds one with
// `source` (photo of Calorías or the card of the chat).
export type MealReviewRouteParams = {
  draft: import('@app/features/nutrition/mealDraft').MealDraft;
  photoUri?: string | null;
  source: 'photo' | 'chat';
  chatMessageId?: string;
  mealId?: string;
};

export type MealDetailRouteParams = { mealId: string; date?: string | null };

// Progreso tab.
export type ProgressTabParams = {
  segment?: 'summary' | 'challenges';
  period?: 'week' | 'month';
};

// ELLIE conversation (its own screen, no tab bar). `prompt` is sent once on
// arrival, like the prototype's askEllie(prompt).
export type EllieChatRouteParams = {
  prompt?: string;
  mode?: 'generate_workout' | 'generate_nutrition';
  // Open with the composer focused (no prompt).
  focusInput?: boolean;
  // 'new' starts a conversation; an id opens that one; without it the chat
  // continues the latest.
  conversationId?: string;
  // Screen of origin, sent as client_context.
  source?: string;
  // Open with the "Conversaciones" list (ELLIE cover · history button).
  showConversations?: boolean;
};

export type CommunitySegment = 'feed' | 'retos' | 'amigos';

export type CommunityTabParams = {
  segment?: CommunitySegment;
};

export type SocialProfileRouteParams = {
  userId: string;
};

export type SocialPostRouteParams = {
  postId: string;
};

export type SocialComposeRouteParams = {
  // Preselects the attachment (Compartir entreno / récord).
  attach?: 'workout' | 'routine' | 'record' | 'achievement' | 'challenge';
  // The exact item to share (session, record, badge or `core33:<id>`,
  // routine, challenge); without it the latest of that kind is offered.
  sourceId?: string;
};

export type SocialUsernameRouteParams = {
  // 'create' is the required first step before using Comunidad; 'edit'
  // comes from Privacidad social.
  mode: 'create' | 'edit';
};

export type MainTabParamList = {
  Home: undefined;
  Workouts: WorkoutsTabParams | undefined;
  Ellie: undefined;
  Progress: ProgressTabParams | undefined;
  Community: CommunityTabParams | undefined;
};

// Shared screens above the tabs (handoff §6: detail, flows and immersive
// screens hide the tab bar).
export type AppStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
  Settings: undefined;
  HealthSettings: undefined;
  NotificationSettings: undefined;
  Achievements: undefined;
  Notifications: undefined;
  Core33: undefined;
  Core33Intro: undefined;
  Core33Explore: undefined;
  Core33Detail: { challengeId: Core33ChallengeId };
  Core33Ready: {
    challengeId: Core33ChallengeId;
  };
  WorkoutDetail: WorkoutDetailRouteParams;
  WorkoutSession: WorkoutSessionRouteParams;
  WorkoutSummary: WorkoutSummaryRouteParams;
  ExerciseDetail: ExerciseDetailRouteParams;
  ExerciseList: ExerciseListRouteParams | undefined;
  RoutineList: RoutineListRouteParams | undefined;
  CreateRoutine: RoutineBuilderRouteParams | undefined;
  EditRoutine: EditRoutineRouteParams;
  AddExerciseToRoutine: AddExerciseToRoutineRouteParams;
  QuizLanding: QuizLandingRouteParams;
  QuizChallenge: QuizChallengeRouteParams;
  QuizQuestion: QuizQuestionRouteParams;
  QuizResult: QuizResultRouteParams;
  EllieChat: EllieChatRouteParams | undefined;
  Week: undefined;
  Sleep: undefined;
  Breathe: undefined;
  WeekEllie: undefined;
  RouteSoon: undefined;
  RoutePrep: undefined;
  RouteGen: undefined;
  RouteManual: undefined;
  RoutePreview: undefined;
  RouteSaved: undefined;
  RouteActive: undefined;
  RouteResult: { activityId?: string; viewer?: boolean } | undefined;
  RouteShare: { activityId?: string } | undefined;
  Wear: undefined;
  PersonalRecords: PersonalRecordsRouteParams | undefined;
  RegisterPr: RegisterPrRouteParams | undefined;
  NutritionPlan: NutritionPlanRouteParams | undefined;
  CaloriesCamera: CaloriesCameraRouteParams | undefined;
  MealReview: MealReviewRouteParams;
  MealDetail: MealDetailRouteParams;
  MachineScan: undefined;
  BodyScience: undefined;
  BodyScienceArticle: { articleId: string };
  SocialProfile: SocialProfileRouteParams;
  SocialPrivacy: undefined;
  SocialInvite: undefined;
  SocialBlocked: undefined;
  SocialUsername: SocialUsernameRouteParams;
  SocialPost: SocialPostRouteParams;
  SocialCompose: SocialComposeRouteParams;
  SocialChallenge: { challengeId: string };
  SocialCreateChallenge:
    | {
        // "Retar" from a friend's profile preselects them.
        inviteeId?: string;
      }
    | undefined;
  SocialChallengeDone: { challengeId: string };
  SocialOfficialList: undefined;
  SocialNotifications: undefined;
  SocialModeration: undefined;
  SocialModerationItem: { targetId: string };
  SocialRoutine: { postId: string };
};

export type RootStackParamList = {
  AuthFlow: NavigatorScreenParams<AuthStackParamList>;
  OnboardingFlow: NavigatorScreenParams<OnboardingStackParamList>;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
} & AppStackParamList;

export type AppRouteName = keyof AppStackParamList;

// Props of a shared screen (root stack).
export type AppScreenProps<RouteName extends AppRouteName> =
  NativeStackScreenProps<RootStackParamList, RouteName>;

// Props of a tab root: can switch tabs and push shared screens, typed.
export type TabScreenProps<RouteName extends keyof MainTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, RouteName>,
    NativeStackScreenProps<RootStackParamList>
  >;

// Navigation object reachable from any screen of the app (hooks, headers).
export type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

// Every route name a back fallback can target.
export type AnyRouteName =
  | keyof RootStackParamList
  | keyof AuthStackParamList
  | keyof OnboardingStackParamList;
