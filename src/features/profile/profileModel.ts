import {
  DAYS_RANGE,
  DURATIONS,
  GOALS,
  HEIGHT_RANGE,
  LEVELS,
  WEIGHT_RANGE,
} from '@app/features/onboarding/onboardingModel';
import type {
  OnboardingGoal,
  ProfileRecord,
  TrainingLevel,
} from '@app/types/auth';

// Pure model of Perfil / Editar perfil. The options, labels and ranges are the
// onboarding's (one source); the CHECK constraints of `profiles` live here as
// validations so a value that the database would reject never leaves the app.

export const NAME_MAX = 60;
// profiles.preferred_session_minutes CHECK: 5–240.
export const MINUTES_RANGE = { min: 5, max: 240 } as const;
export const MINUTES_STEP = 5;
export const WEIGHT_STEP = 0.5;
export const BIRTH_YEAR_MIN = 1920;

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MONTHS_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// ── Labels ──────────────────────────────────────────────────────────────────
// 'improve_health' is a valid stored goal that the v2 onboarding no longer
// offers: it is shown (and kept) but not offered as a new choice.
export function goalLabel(goal: OnboardingGoal | null): string {
  if (goal === 'improve_health') {
    return 'Mejorar salud';
  }
  return GOALS.find(option => option.value === goal)?.label ?? 'Sin objetivo';
}

export function goalOptions(current: OnboardingGoal | null) {
  const options = GOALS.map(option => ({ value: option.value, label: option.label }));
  return current === 'improve_health'
    ? [...options, { value: 'improve_health' as const, label: 'Mejorar salud' }]
    : options;
}

export function levelLabel(level: TrainingLevel | null): string {
  return LEVELS.find(option => option.value === level)?.label ?? 'Sin nivel';
}

// "6 días/sem · 45 min" (Mi plan · Entrenamiento).
export function trainingLine(days: number | null, minutes: number | null): string {
  const parts = [
    days ? `${days} ${days === 1 ? 'día' : 'días'}/sem` : null,
    minutes ? `${minutes} min` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Sin configurar';
}

// "Ganar músculo · 6 días por semana".
export function heroLine(goal: OnboardingGoal | null, days: number | null): string {
  const parts = [
    goal ? goalLabel(goal) : null,
    days ? `${days} ${days === 1 ? 'día' : 'días'} por semana` : null,
  ].filter(Boolean);
  return parts.join(' · ');
}

// ── Units and dates ─────────────────────────────────────────────────────────
const decimal = (value: number) =>
  String(Math.round(value * 10) / 10).replace('.', ',');

export const formatWeight = (kg: number) => `${decimal(kg)} kg`;
export const formatHeight = (cm: number) => `${Math.round(cm)} cm`;

// "4.860": thousands with a dot, as the rest of the app.
export const formatThousands = (value: number) =>
  String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export function toDateKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export const fromDateKey = (value: string | null): Date | null =>
  value ? new Date(`${value}T12:00:00`) : null;

// "30 ago 1989" (Editar perfil · Fecha de nacimiento).
export function formatBirthDate(value: string | null): string {
  const date = fromDateKey(value);
  if (!date || Number.isNaN(date.getTime())) {
    return 'Sin fecha';
  }
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

// "ene 2026" → "Atleta desde enero 2026".
export function memberSince(iso: string | null | undefined): string | null {
  if (!iso) {
    return null;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return `Atleta desde ${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`;
}

// ── Editing ─────────────────────────────────────────────────────────────────
export type EditDraft = {
  name: string;
  birthDate: string | null;
  weight: number;
  height: number;
  goal: OnboardingGoal | null;
  level: TrainingLevel | null;
  days: number;
  minutes: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function draftFromProfile(profile: ProfileRecord): EditDraft {
  return {
    name: profile.name ?? '',
    birthDate: profile.birthDate,
    weight: profile.weight ?? 70,
    height: profile.height ?? 170,
    goal: profile.goal,
    level: profile.trainingLevel,
    days: profile.trainingDaysPerWeek ?? 3,
    minutes: profile.preferredSessionMinutes ?? DURATIONS[2].value,
  };
}

// A profile that never finished the onboarding has no goal / date / body.
export function hasOnboardingData(profile: ProfileRecord): boolean {
  return Boolean(
    profile.goal && profile.birthDate && profile.weight && profile.height,
  );
}

export type DraftErrors = Partial<Record<keyof EditDraft, string>>;

export function validateDraft(draft: EditDraft, now = new Date()): DraftErrors {
  const errors: DraftErrors = {};
  const name = draft.name.trim();
  if (!name) {
    errors.name = 'Escribe tu nombre.';
  } else if (name.length > NAME_MAX) {
    errors.name = `Máximo ${NAME_MAX} caracteres.`;
  }
  const birth = fromDateKey(draft.birthDate);
  if (!birth || Number.isNaN(birth.getTime())) {
    errors.birthDate = 'Elige tu fecha de nacimiento.';
  } else if (birth > now || birth.getFullYear() < BIRTH_YEAR_MIN) {
    errors.birthDate = 'Revisa la fecha de nacimiento.';
  }
  if (!(draft.weight >= WEIGHT_RANGE.min && draft.weight <= WEIGHT_RANGE.max)) {
    errors.weight = `Entre ${WEIGHT_RANGE.min} y ${WEIGHT_RANGE.max} kg.`;
  }
  if (!(draft.height >= HEIGHT_RANGE.min && draft.height <= HEIGHT_RANGE.max)) {
    errors.height = `Entre ${HEIGHT_RANGE.min} y ${HEIGHT_RANGE.max} cm.`;
  }
  if (draft.goal === null) {
    errors.goal = 'Elige un objetivo.';
  }
  if (draft.level === null) {
    errors.level = 'Elige tu nivel.';
  }
  if (!Number.isInteger(draft.days) || draft.days < DAYS_RANGE.min || draft.days > DAYS_RANGE.max) {
    errors.days = `Entre ${DAYS_RANGE.min} y ${DAYS_RANGE.max} días.`;
  }
  if (
    !Number.isInteger(draft.minutes) ||
    draft.minutes < MINUTES_RANGE.min ||
    draft.minutes > MINUTES_RANGE.max
  ) {
    errors.minutes = `Entre ${MINUTES_RANGE.min} y ${MINUTES_RANGE.max} minutos.`;
  }
  return errors;
}

export const isValid = (errors: DraftErrors) => Object.keys(errors).length === 0;

export function isDirty(draft: EditDraft, saved: EditDraft): boolean {
  return (Object.keys(draft) as (keyof EditDraft)[]).some(key =>
    key === 'name' ? draft.name.trim() !== saved.name.trim() : draft[key] !== saved[key],
  );
}

export const stepWeight = (weight: number, direction: 1 | -1) =>
  clamp(Math.round((weight + direction * WEIGHT_STEP) * 10) / 10, WEIGHT_RANGE.min, WEIGHT_RANGE.max);
export const stepHeight = (height: number, direction: 1 | -1) =>
  clamp(height + direction, HEIGHT_RANGE.min, HEIGHT_RANGE.max);
export const stepDays = (days: number, direction: 1 | -1) =>
  clamp(days + direction, DAYS_RANGE.min, DAYS_RANGE.max);
export const stepMinutes = (minutes: number, direction: 1 | -1) =>
  clamp(minutes + direction * MINUTES_STEP, MINUTES_RANGE.min, MINUTES_RANGE.max);

export type ProfilePatch = {
  name?: string;
  birthDate?: string | null;
  weight?: number;
  height?: number;
  goal?: OnboardingGoal | null;
  trainingLevel?: TrainingLevel | null;
  trainingDaysPerWeek?: number;
  preferredSessionMinutes?: number;
};

// Only what changed is written.
export function toPatch(draft: EditDraft, saved: EditDraft): ProfilePatch {
  const patch: ProfilePatch = {};
  if (draft.name.trim() !== saved.name.trim()) {
    patch.name = draft.name.trim();
  }
  if (draft.birthDate !== saved.birthDate) {
    patch.birthDate = draft.birthDate;
  }
  if (draft.weight !== saved.weight) {
    patch.weight = draft.weight;
  }
  if (draft.height !== saved.height) {
    patch.height = draft.height;
  }
  if (draft.goal !== saved.goal) {
    patch.goal = draft.goal;
  }
  if (draft.level !== saved.level) {
    patch.trainingLevel = draft.level;
  }
  if (draft.days !== saved.days) {
    patch.trainingDaysPerWeek = draft.days;
  }
  if (draft.minutes !== saved.minutes) {
    patch.preferredSessionMinutes = draft.minutes;
  }
  return patch;
}

// ── Trajectory ("Tu trayectoria") ───────────────────────────────────────────
export type TimelineEntry = {
  id: string;
  at: string; // ISO
  title: string;
  subtitle: string;
  // Today: the Ember dot.
  fresh: boolean;
};

export function timelineDate(iso: string, now: Date): string {
  const date = new Date(iso);
  const same =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  return same ? 'hoy' : `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

// Milestones: badges earned, personal records and the first session, newest
// first, at most `limit`.
export function buildTimeline(input: {
  badges: { id: string; title: string; subtitle: string; earnedAt?: string }[];
  records: { id: string; at: string; title: string; subtitle: string }[];
  firstSession?: { at: string; title: string } | null;
  now: Date;
  limit?: number;
}): TimelineEntry[] {
  const entries: Omit<TimelineEntry, 'fresh'>[] = [
    ...input.badges
      .filter(badge => badge.earnedAt)
      .map(badge => ({
        id: `badge-${badge.id}`,
        at: badge.earnedAt as string,
        title: badge.title,
        subtitle: badge.subtitle,
      })),
    ...input.records.map(record => ({ ...record, id: `pr-${record.id}` })),
    ...(input.firstSession
      ? [
          {
            id: 'first-session',
            at: input.firstSession.at,
            title: 'Primera sesión',
            subtitle: input.firstSession.title,
          },
        ]
      : []),
  ];
  return entries
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, input.limit ?? 5)
    .map(entry => ({
      ...entry,
      fresh: timelineDate(entry.at, input.now) === 'hoy',
    }));
}
