import { getSupabaseClient } from '@app/services/supabase/client';
import { normalizeAvatarKey } from '@app/assets/avatars';
import { normalizeProfilePhotoReference } from '@app/services/supabase/profile-photo';
import type {
  OnboardingData,
  OnboardingGoal,
  ProfileGender,
  ProfileRecord,
  TrainingLevel,
} from '@app/types/auth';
import type { Database } from '@app/types/supabase';
import type { AvatarKey } from '@app/types/profileIdentity';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

function mapGoal(value: string | null): OnboardingGoal | null {
  if (
    value === 'lose_weight' ||
    value === 'gain_muscle' ||
    value === 'maintain' ||
    value === 'improve_health' ||
    value === 'performance'
  ) {
    return value;
  }

  return null;
}

function mapTrainingLevel(value: string | null): TrainingLevel | null {
  return value === 'principiante' ||
    value === 'intermedio' ||
    value === 'avanzado'
    ? value
    : null;
}

function mapGender(value: string | null): ProfileGender | null {
  return value === 'male' || value === 'female' ? value : null;
}

function mapProfileRow(row: ProfileRow, email: string): ProfileRecord {
  return {
    id: row.id,
    name: row.name,
    email,
    onboardingCompleted: row.onboarding_completed,
    avatarKey: normalizeAvatarKey(row.avatar_key),
    profilePhotoUrl: normalizeProfilePhotoReference(row.profile_photo_url),
    goal: mapGoal(row.goal),
    birthDate: row.birth_date,
    gender: mapGender(row.gender),
    weight: row.weight,
    height: row.height,
    trainingDaysPerWeek: row.training_days_per_week,
    dailyCalorieGoal: row.daily_calorie_goal,
    dailyProteinGoal: row.daily_protein_goal,
    dailyCarbsGoal: row.daily_carbs_goal,
    dailyFatGoal: row.daily_fat_goal,
    dailyWaterGoal: row.daily_water_goal,
    trainingEnvironment: row.training_environment,
    availableEquipment: row.available_equipment || [],
    trainingLevel: mapTrainingLevel(row.training_level),
    preferredSessionMinutes: row.preferred_session_minutes,
    core33IntroSeenAt: row.core33_intro_seen_at,
    core33CompletedAt: row.core33_completed_at,
    core33InviteDismissedAt: row.core33_invite_dismissed_at,
    createdAt: (row as { created_at?: string | null }).created_at ?? null,
  };
}

export async function fetchProfile(
  userId: string,
  email: string,
  fallbackName = '',
): Promise<ProfileRecord> {
  const client = getSupabaseClient();

  if (!client) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return mapProfileRow(data, email);
  }

  const { error: insertError } = await (client.from('profiles') as any).upsert({
    id: userId,
    name: fallbackName,
  } as ProfileInsert);

  if (insertError) {
    throw insertError;
  }

  const { data: nextData, error: nextError } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (nextError) {
    throw nextError;
  }

  return mapProfileRow(nextData, email);
}

export async function updateOnboardingProfile(
  userId: string,
  onboarding: OnboardingData,
  // v2 onboarding asks the name again (prefilled from sign-up).
  name?: string,
): Promise<void> {
  const client = getSupabaseClient();

  if (!client) {
    throw new Error('Supabase is not configured.');
  }

  const { error } = await (client.from('profiles') as any)
    .update({
      avatar_key: onboarding.avatarKey,
      profile_photo_url: normalizeProfilePhotoReference(
        onboarding.profilePhotoUrl,
      ),
      goal: onboarding.goal,
      birth_date: onboarding.birthDate,
      gender: onboarding.gender,
      weight: onboarding.weight,
      height: onboarding.height,
      training_days_per_week: onboarding.trainingDaysPerWeek,
      ...(onboarding.trainingLevel
        ? { training_level: onboarding.trainingLevel }
        : {}),
      ...(onboarding.preferredSessionMinutes
        ? { preferred_session_minutes: onboarding.preferredSessionMinutes }
        : {}),
      ...(onboarding.availableEquipment
        ? { available_equipment: onboarding.availableEquipment }
        : {}),
      ...(name ? { name } : {}),
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    } as ProfileUpdate)
    .eq('id', userId);

  if (error) {
    if (__DEV__) {
      console.warn('[onboarding] profiles update failed', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
    }
    throw error;
  }
}

export async function updateProfileDetails(
  userId: string,
  patch: {
    name?: string;
    avatarKey?: AvatarKey | null;
    profilePhotoUrl?: string | null;
    goal?: OnboardingGoal | null;
    birthDate?: string | null;
    gender?: ProfileGender | null;
    weight?: number | null;
    height?: number | null;
    trainingDaysPerWeek?: number | null;
    // CHECK profiles_training_level_check: principiante | intermedio | avanzado.
    trainingLevel?: TrainingLevel | null;
    // CHECK: 5–240.
    preferredSessionMinutes?: number | null;
  },
): Promise<void> {
  const client = getSupabaseClient();

  if (!client) {
    throw new Error('Supabase is not configured.');
  }

  const payload: ProfileUpdate = {
    updated_at: new Date().toISOString(),
  };

  if (typeof patch.name !== 'undefined') {
    payload.name = patch.name;
  }
  if (typeof patch.avatarKey !== 'undefined') {
    payload.avatar_key = patch.avatarKey;
  }
  if (typeof patch.profilePhotoUrl !== 'undefined') {
    payload.profile_photo_url = normalizeProfilePhotoReference(
      patch.profilePhotoUrl,
    );
  }
  if (typeof patch.goal !== 'undefined') {
    payload.goal = patch.goal;
  }
  if (typeof patch.birthDate !== 'undefined') {
    payload.birth_date = patch.birthDate;
  }
  if (typeof patch.gender !== 'undefined') {
    payload.gender = patch.gender;
  }
  if (typeof patch.weight !== 'undefined') {
    payload.weight = patch.weight;
  }
  if (typeof patch.height !== 'undefined') {
    payload.height = patch.height;
  }
  if (typeof patch.trainingDaysPerWeek !== 'undefined') {
    payload.training_days_per_week = patch.trainingDaysPerWeek;
  }

  if (typeof patch.trainingLevel !== 'undefined') {
    payload.training_level = patch.trainingLevel;
  }
  if (typeof patch.preferredSessionMinutes !== 'undefined') {
    payload.preferred_session_minutes = patch.preferredSessionMinutes;
  }

  const { error } = await (client.from('profiles') as any)
    .update(payload)
    .eq('id', userId);

  if (error) {
    throw error;
  }
}

// ── Core 33 in the profile ──────────────────────────────────────────────────
// Each function writes one timestamptz column of the user's own profile row
// (ISO string, or null to clear it).
async function setCore33Column(
  userId: string,
  column:
    | 'core33_invite_dismissed_at'
    | 'core33_intro_seen_at'
    | 'core33_completed_at',
  value: string | null,
): Promise<void> {
  const client = getSupabaseClient();

  if (!client) {
    throw new Error('Supabase is not configured.');
  }

  const { error } = await (client.from('profiles') as any)
    .update({ [column]: value })
    .eq('id', userId);

  if (error) {
    throw error;
  }
}

// "Ahora no" of the Inicio discovery card (null clears it: dev reset).
export const setCore33InviteDismissedAt = (
  userId: string,
  value: string | null,
) => setCore33Column(userId, 'core33_invite_dismissed_at', value);

// For the Core 33 module (Intro seen / challenge completed).
export const markCore33IntroSeen = (userId: string, at = new Date()) =>
  setCore33Column(userId, 'core33_intro_seen_at', at.toISOString());

export const markCore33Completed = (userId: string, at = new Date()) =>
  setCore33Column(userId, 'core33_completed_at', at.toISOString());
