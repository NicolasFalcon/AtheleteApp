import type { ProfileGender } from '@app/types/auth';

// profiles.gender (TEXT, nullable). The CHECK profiles_gender_check from the
// web migration 20260611090000 only accepts 'male' | 'female' (or NULL). The
// third option "Otro" is stored as 'other' since backend extended the CHECK
// (BT-41, resolved 2026-10-06). Set the flag to false to write it as NULL.
export const GENDER_OTHER_STORED = true;

export const GENDER_OPTIONS: ReadonlyArray<{
  value: ProfileGender;
  label: string;
  subtitle: string;
}> = [
  { value: 'female', label: 'Mujer', subtitle: 'Ajusta tus estimaciones' },
  { value: 'male', label: 'Hombre', subtitle: 'Ajusta tus estimaciones' },
  { value: 'other', label: 'Otro', subtitle: 'Usamos una estimación neutra' },
];

export function genderFromDb(value: string | null): ProfileGender | null {
  return value === 'male' || value === 'female' || value === 'other'
    ? value
    : null;
}

// Value written to profiles.gender; null clears it.
export function genderToDb(
  value: ProfileGender | null,
  otherStored: boolean = GENDER_OTHER_STORED,
): string | null {
  if (value === 'male' || value === 'female') {
    return value;
  }
  return value === 'other' && otherStored ? 'other' : null;
}

export function genderLabel(value: string | null | undefined): string {
  return GENDER_OPTIONS.find(option => option.value === value)?.label ?? '';
}

// Mifflin–St Jeor resting energy (kcal/day). The sex constant is +5 for men
// and −161 for women; "Otro" or empty uses the neutral midpoint (−78), so the
// estimate never assumes a sex the user did not state.
const SEX_CONSTANT: Record<ProfileGender, number> = {
  male: 5,
  female: -161,
  other: -78,
};
const NEUTRAL_CONSTANT = -78;

export function estimateBmr(input: {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  gender: ProfileGender | null | undefined;
}): number {
  const constant = input.gender
    ? SEX_CONSTANT[input.gender]
    : NEUTRAL_CONSTANT;
  return Math.round(
    10 * input.weightKg + 6.25 * input.heightCm - 5 * input.ageYears + constant,
  );
}
