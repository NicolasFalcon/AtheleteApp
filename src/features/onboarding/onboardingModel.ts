import type {
  OnboardingData,
  OnboardingGoal,
  TrainingLevel,
} from '@app/types/auth';

// Onboarding v2 (Auth.dc.html · STEPS): 8 questions in 3 blocks.
// Saved to `profiles`: name, birth_date, weight, height, goal,
// training_level, training_days_per_week, available_equipment and
// preferred_session_minutes.
// Not asked any more (user decision 2026-09-30): gender and avatar.

export const BLOCKS = ['Tú', 'Tu objetivo', 'Tu semana'] as const;

export type StepKind =
  | 'name'
  | 'birthDate'
  | 'body'
  | 'goal'
  | 'level'
  | 'days'
  | 'equipment'
  | 'duration';

export type StepDefinition = {
  kind: StepKind;
  block: 0 | 1 | 2;
  question: string;
};

export const STEPS: StepDefinition[] = [
  { kind: 'name', block: 0, question: '¿Cómo te llamas?' },
  { kind: 'birthDate', block: 0, question: '¿Cuándo naciste?' },
  { kind: 'body', block: 0, question: 'Tu peso y altura' },
  { kind: 'goal', block: 1, question: '¿Qué quieres conseguir?' },
  { kind: 'level', block: 1, question: '¿Cuál es tu nivel?' },
  { kind: 'days', block: 2, question: '¿Cuántos días quieres entrenar?' },
  { kind: 'equipment', block: 2, question: '¿Con qué equipamiento cuentas?' },
  { kind: 'duration', block: 2, question: '¿Cuánto dura tu sesión ideal?' },
];

export type GoalOption = {
  label: string;
  subtitle: string;
  // Short pair for the ELLIE welcome summary ("Ganar" / "músculo").
  short: [string, string];
  value: OnboardingGoal;
};

export const GOALS: GoalOption[] = [
  {
    label: 'Ganar músculo',
    subtitle: 'Más fuerza y volumen',
    short: ['Ganar', 'músculo'],
    value: 'gain_muscle',
  },
  {
    label: 'Perder grasa',
    subtitle: 'Una composición más ligera',
    short: ['Perder', 'grasa'],
    value: 'lose_weight',
  },
  {
    label: 'Mantenerme',
    subtitle: 'Constancia y salud',
    short: ['Mantener', 'forma'],
    value: 'maintain',
  },
  {
    label: 'Rendimiento',
    subtitle: 'Correr, saltar, competir',
    short: ['Rendir', 'más'],
    value: 'performance',
  },
];

export const LEVELS: ReadonlyArray<{
  label: string;
  subtitle: string;
  value: TrainingLevel;
}> = [
  {
    label: 'Principiante',
    subtitle: 'Empiezo o vuelvo tras un tiempo',
    value: 'beginner',
  },
  {
    label: 'Intermedio',
    subtitle: 'Entreno con regularidad',
    value: 'intermediate',
  },
  { label: 'Avanzado', subtitle: 'Programo y sigo cargas', value: 'advanced' },
];

// `value` is stored in profiles.preferred_session_minutes (5–240); "60+"
// is saved as 60.
export const DURATIONS = [
  {
    minutes: '20',
    value: 20,
    label: '20 minutos',
    subtitle: 'Corta e intensa',
  },
  {
    minutes: '35',
    value: 35,
    label: '35 minutos',
    subtitle: 'Lo justo para progresar',
  },
  {
    minutes: '45',
    value: 45,
    label: '45 minutos',
    subtitle: 'Recomendada para tu objetivo',
  },
  {
    minutes: '60+',
    value: 60,
    label: '60 minutos o más',
    subtitle: 'Con calentamiento completo',
  },
] as const;

export const RECOMMENDED_DURATION = 2;

// Stored as-is in available_equipment (ELLIE reads these labels).
export const EQUIPMENT = [
  'Peso corporal',
  'Mancuernas',
  'Barra',
  'Máquinas',
  'Cable',
  'Bandas',
] as const;

export const WEIGHT_RANGE = { min: 30, max: 200 } as const;
export const HEIGHT_RANGE = { min: 120, max: 220 } as const;
export const DAYS_RANGE = { min: 1, max: 7 } as const;

export type OnboardingAnswers = {
  name: string;
  birthDate: string | null; // YYYY-MM-DD
  weight: number;
  height: number;
  goal: number | null;
  level: number | null;
  days: number;
  equipment: string[];
  duration: number | null;
};

export function initialAnswers(name = ''): OnboardingAnswers {
  return {
    name,
    birthDate: null,
    weight: 70,
    height: 170,
    goal: null,
    level: null,
    days: 3,
    equipment: [],
    duration: null,
  };
}

export function canContinue(
  kind: StepKind,
  answers: OnboardingAnswers,
): boolean {
  switch (kind) {
    case 'name':
      return answers.name.trim().length > 0;
    case 'birthDate':
      return Boolean(answers.birthDate);
    case 'body':
      return answers.weight > 0 && answers.height > 0;
    case 'goal':
      return answers.goal !== null;
    case 'level':
      return answers.level !== null;
    case 'days':
      return answers.days >= DAYS_RANGE.min && answers.days <= DAYS_RANGE.max;
    case 'equipment':
      return answers.equipment.length > 0;
    case 'duration':
      return answers.duration !== null;
  }
}

// Training days drawn on the week (L…D) for each frequency, as the HTML.
const WEEK_PATTERNS: number[][] = [
  [3],
  [1, 4],
  [0, 2, 4],
  [0, 1, 3, 4],
  [0, 1, 2, 3, 4],
  [0, 1, 2, 3, 4, 5],
  [0, 1, 2, 3, 4, 5, 6],
];

export function weekPattern(days: number): boolean[] {
  const clamped = Math.min(DAYS_RANGE.max, Math.max(DAYS_RANGE.min, days));
  const active = WEEK_PATTERNS[clamped - 1];
  return Array.from({ length: 7 }, (_, index) => active.includes(index));
}

export function daysLine(days: number): string {
  if (days >= 6) {
    return 'Con un día de descanso activo. ELLIE ajusta la carga.';
  }
  if (days <= 2) {
    return 'Poco a poco. Podrás subirlo cuando quieras.';
  }
  return 'Un buen ritmo para progresar sin sobrecarga.';
}

export function toggleEquipment(current: string[], item: string): string[] {
  return current.includes(item)
    ? current.filter(value => value !== item)
    : [...current, item];
}

export type OnboardingPayload = {
  name: string;
  data: OnboardingData;
};

// Gender and avatar are no longer asked (null).
export function toOnboardingPayload(
  answers: OnboardingAnswers,
): OnboardingPayload {
  if (answers.goal === null || !answers.birthDate) {
    throw new Error('Faltan respuestas del onboarding.');
  }

  return {
    name: answers.name.trim(),
    data: {
      avatarKey: null,
      profilePhotoUrl: null,
      goal: GOALS[answers.goal].value,
      birthDate: answers.birthDate,
      gender: null,
      weight: answers.weight,
      height: answers.height,
      trainingDaysPerWeek: answers.days,
      availableEquipment: answers.equipment,
      ...(answers.level !== null
        ? { trainingLevel: LEVELS[answers.level].value }
        : {}),
      ...(answers.duration !== null
        ? { preferredSessionMinutes: DURATIONS[answers.duration].value }
        : {}),
    },
  };
}
