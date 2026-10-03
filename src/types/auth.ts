import type { AvatarKey } from '@app/types/profileIdentity';

export type AppFlow = 'auth' | 'onboarding' | 'app';

export type OnboardingGoal =
  | 'lose_weight'
  | 'gain_muscle'
  | 'maintain'
  | 'improve_health'
  | 'performance';

// profiles.training_level (CHECK profiles_training_level_check, verified
// against Supabase 2026-10-02; BACKEND_SUMMARY lists the English values).
export type TrainingLevel = 'principiante' | 'intermedio' | 'avanzado';

export type ProfileGender = 'male' | 'female';

export type OnboardingData = {
  avatarKey: AvatarKey | null;
  profilePhotoUrl: string | null;
  goal: OnboardingGoal;
  birthDate: string;
  // Not asked by the v2 onboarding (user decision 2026-09-30): null.
  gender: ProfileGender | null;
  weight: number;
  height: number;
  trainingDaysPerWeek: number;
  // v2 onboarding (step "equipamiento"); written only when provided.
  availableEquipment?: string[];
  // v2 onboarding steps "nivel" and "duración"; written only when provided.
  trainingLevel?: TrainingLevel;
  preferredSessionMinutes?: number;
};

export type ProfileRecord = {
  id: string;
  name: string;
  email: string;
  onboardingCompleted: boolean;
  avatarKey: AvatarKey | null;
  profilePhotoUrl: string | null;
  goal: OnboardingGoal | null;
  birthDate: string | null;
  gender: ProfileGender | null;
  weight: number | null;
  height: number | null;
  trainingDaysPerWeek: number | null;
  dailyCalorieGoal: number | null;
  dailyProteinGoal: number | null;
  dailyCarbsGoal: number | null;
  dailyFatGoal: number | null;
  dailyWaterGoal: number | null;
  trainingEnvironment: string | null;
  availableEquipment: string[];
  trainingLevel: TrainingLevel | null;
  preferredSessionMinutes: number | null;
  // Core 33 in the profile (timestamptz, ISO). Intro and completion are for
  // the Core 33 module; the invite date drives the Inicio discovery card.
  core33IntroSeenAt: string | null;
  core33CompletedAt: string | null;
  core33InviteDismissedAt: string | null;
};
