import type {
  OnboardingData,
  OnboardingGoal,
  ProfileGender,
  TrainingLevel,
} from '@app/types/auth';

// Onboarding v2 (Auth.dc.html · STEPS): 8 questions + "sexo" (D-78, not in
// the handoff) = 9 questions in 3 blocks.
// Saved to `profiles`: name, birth_date, gender, weight, height, goal,
// training_level, training_days_per_week, available_equipment and
// preferred_session_minutes.
// Avatar is not asked (user decision 2026-09-30); gender is asked again.

export const BLOCKS = ['Tú', 'Tu objetivo', 'Tu semana'] as const;

export type StepKind =
  | 'name'
  | 'birthDate'
  | 'gender'
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
  // Display headline (Anton, caps), one entry per line as in the design.
  title: string[];
  subtitle: string;
};

export const STEPS: StepDefinition[] = [
  {
    kind: 'name',
    block: 0,
    question: '¿Cómo te llamas?',
    title: ['¿CÓMO TE LLAMAS?'],
    subtitle: 'Empecemos por lo básico.',
  },
  {
    kind: 'birthDate',
    block: 0,
    question: '¿Cuándo naciste?',
    title: ['¿CUÁNDO NACISTE?'],
    subtitle: 'Ajustamos intensidad y recuperación a tu edad.',
  },
  {
    kind: 'gender',
    block: 0,
    question: '¿Cuál es tu sexo?',
    title: ['¿CUÁL ES TU SEXO?'],
    subtitle: 'Lo usamos para afinar tus estimaciones.',
  },
  {
    kind: 'body',
    block: 0,
    question: 'Tu peso y altura',
    title: ['TU PESO Y ALTURA'],
    subtitle: 'Para calcular cargas y calorías con precisión.',
  },
  {
    kind: 'goal',
    block: 1,
    question: '¿Qué quieres conseguir?',
    title: ['¿QUÉ QUIERES', 'CONSEGUIR?'],
    subtitle: 'Elige uno. Podrás cambiarlo cuando quieras.',
  },
  {
    kind: 'level',
    block: 1,
    question: '¿Cuál es tu nivel?',
    title: ['¿CUÁL ES TU NIVEL?'],
    subtitle: 'Sé honesto: ELLIE ajusta el plan desde aquí.',
  },
  {
    kind: 'days',
    block: 2,
    question: '¿Cuántos días quieres entrenar?',
    title: ['¿CUÁNTOS DÍAS', 'QUIERES ENTRENAR?'],
    subtitle: 'La constancia gana a la intensidad.',
  },
  {
    kind: 'equipment',
    block: 2,
    question: '¿Con qué equipamiento cuentas?',
    title: ['¿CON QUÉ', 'EQUIPAMIENTO', 'CUENTAS?'],
    subtitle: 'Tus rutinas se arman con lo que tienes.',
  },
  {
    kind: 'duration',
    block: 2,
    question: '¿Cuánto dura tu sesión ideal?',
    title: ['¿CUÁNTO DURA', 'TU SESIÓN IDEAL?'],
    subtitle: 'Elige lo que de verdad puedes sostener.',
  },
];

export type GoalOption = {
  label: string;
  subtitle: string;
  // Value / label pair of the "Plan listo" stat (GANAR / MÚSCULO).
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
    short: ['Rendir', 'al máximo'],
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
    value: 'principiante',
  },
  {
    label: 'Intermedio',
    subtitle: 'Entreno con regularidad',
    value: 'intermedio',
  },
  { label: 'Avanzado', subtitle: 'Programo y sigo cargas', value: 'avanzado' },
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
  gender: ProfileGender | null;
  weight: number;
  height: number;
  goal: number | null;
  level: number | null;
  days: number;
  // L…D chosen on the "días" step. TODO(onboarding-weekdays): local only,
  // there is no profiles column for the concrete days yet; only `days`
  // (training_days_per_week) is saved.
  weekDays: boolean[];
  equipment: string[];
  duration: number | null;
};

export function initialAnswers(name = ''): OnboardingAnswers {
  return {
    name,
    birthDate: null,
    gender: null,
    weight: 70,
    height: 170,
    goal: null,
    level: null,
    days: 3,
    weekDays: weekPattern(3),
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
    case 'gender':
      return answers.gender !== null;
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

// The stepper sets the suggested pattern; a chip toggles one day and the
// count follows (never below one day).
export function toggleWeekDay(week: boolean[], index: number): boolean[] {
  const next = week.map((active, day) => (day === index ? !active : active));
  return next.some(Boolean) ? next : week;
}

export function countWeekDays(week: boolean[]): number {
  return week.filter(Boolean).length;
}

// Note under the week, by rest days (7 − training days).
export function daysLine(days: number): string {
  const rest = 7 - Math.min(DAYS_RANGE.max, Math.max(DAYS_RANGE.min, days));
  if (rest === 0) {
    return 'Sin días de descanso. ELLIE ajusta la carga.';
  }
  if (rest === 1) {
    return 'Con un día de descanso activo. ELLIE ajusta la carga.';
  }
  return `Con ${rest} días de descanso. ELLIE ajusta la carga.`;
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

// Avatar is not asked (null). Gender goes through genderToDb at the write.
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
      gender: answers.gender,
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
