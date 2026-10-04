import type { HabitCategory } from '@app/shared';

// The five challenges of the design (Core33.dc.html · CH). There is no
// catalogue in the backend (BT-01): they live here, and the chosen one is
// stored in the participation's `habits` json with ids `core33:<id>:<n>`.

export type Core33ChallengeId =
  | 'fuerza'
  | 'movimiento'
  | 'recuperacion'
  | 'disciplina'
  | 'nutricion';

export type Core33Challenge = {
  id: Core33ChallengeId;
  category: string; // "Fuerza"
  name: string;
  intent: string;
  goal: string;
  level: 1 | 2 | 3;
  levelLabel: string;
  // Accent of the category label on a dark card.
  accent: string;
  // Cards without a photo draw this figure instead (Recupera mejor, Come con
  // intención).
  signature?: { text: string; color: string; background: string };
  // The goal of the profile that makes it "Encaja con tu objetivo".
  fitsGoals: string[];
  habits: { pillar: string; text: string }[];
};

export const CORE33_CHALLENGES: Core33Challenge[] = [
  {
    id: 'fuerza',
    category: 'Fuerza',
    name: 'Construye fuerza',
    intent: 'Más fuerte cada semana, con técnica y sin prisa.',
    goal: 'Que tu cuerpo aprenda a producir más fuerza semana a semana: carga progresiva, proteína suficiente y descanso de verdad.',
    level: 2,
    levelLabel: 'Intermedio',
    accent: '#FF8A5C',
    fitsGoals: ['gain_muscle', 'performance'],
    habits: [
      { pillar: 'Entreno', text: 'Fuerza o 20 min de técnica' },
      { pillar: 'Proteína', text: '120 g repartidos en el día' },
      { pillar: 'Descanso', text: 'Dormir 7 horas' },
    ],
  },
  {
    id: 'movimiento',
    category: 'Movimiento',
    name: 'Muévete cada día',
    intent: 'Que moverte deje de ser una decisión.',
    goal: 'Sumar movimiento sin depender de la motivación: más pasos, articulaciones que se mueven bien y menos horas seguidas sentado.',
    level: 1,
    levelLabel: 'Suave',
    accent: '#D8D6D1',
    fitsGoals: ['improve_health', 'maintain'],
    habits: [
      { pillar: 'Pasos', text: '8.000 pasos' },
      { pillar: 'Movilidad', text: '10 minutos' },
      { pillar: 'Pausas', text: 'De pie cada hora' },
    ],
  },
  {
    id: 'recuperacion',
    category: 'Recuperación',
    name: 'Recupera mejor',
    intent: 'Entrenar es la mitad. La otra mitad pasa cuando descansas.',
    goal: 'Llegar fresco a cada sesión: dormir más y mejor, bajar pulsaciones al final del día y soltar la tensión acumulada.',
    level: 1,
    levelLabel: 'Suave',
    accent: '#A9B4C0',
    signature: { text: '7:30', color: '#8FB0D1', background: '#1A2129' },
    fitsGoals: [],
    habits: [
      { pillar: 'Sueño', text: '7 h 30 min' },
      { pillar: 'Respiración', text: '5 min antes de dormir' },
      { pillar: 'Movilidad', text: '10 min suaves' },
    ],
  },
  {
    id: 'disciplina',
    category: 'Disciplina',
    name: 'Palabra cumplida',
    intent: 'Haz lo que dijiste que harías. Todos los días.',
    goal: 'Una rutina que no se negocia: la misma hora al despertar, un entreno sin excusas y noches sin pantalla.',
    level: 3,
    levelLabel: 'Exigente',
    accent: '#D8D6D1',
    fitsGoals: [],
    habits: [
      { pillar: 'Mañana', text: 'Despertar a las 06:30' },
      { pillar: 'Entreno', text: '30 minutos, sin negociar' },
      { pillar: 'Noche', text: 'Sin pantallas desde las 22:00' },
    ],
  },
  {
    id: 'nutricion',
    category: 'Nutrición',
    name: 'Come con intención',
    intent: 'Comer para rendir, sin contar cada caloría.',
    goal: 'Que cada comida trabaje a tu favor: proteína en todas, agua suficiente y verdura de verdad.',
    level: 2,
    levelLabel: 'Moderado',
    accent: '#D8D6D1',
    signature: { text: '3·14·2', color: '#FFFFFF', background: '#141312' },
    fitsGoals: ['lose_weight'],
    habits: [
      { pillar: 'Proteína', text: 'En cada comida' },
      { pillar: 'Agua', text: '14 vasos' },
      { pillar: 'Verdura', text: 'Dos raciones' },
    ],
  },
];

export const findChallenge = (id: string | null | undefined) =>
  CORE33_CHALLENGES.find(challenge => challenge.id === id) ?? null;

// Habit pillars of the participation row, by position (the `category` the
// rest of the app reads: Inicio rings, Progreso, ELLIE).
const CATEGORIES: HabitCategory[] = ['training', 'health', 'mind'];
const CATEGORY_LABELS: Record<string, string> = {
  training: 'Entrenamiento',
  health: 'Salud',
  mind: 'Mentalidad',
};

export const challengeIdPrefix = (id: string) => `core33:${id}:`;

// The `habits` json written when the challenge starts.
export function habitsForChallenge(challenge: Core33Challenge) {
  return challenge.habits.map((habit, index) => ({
    id: `${challengeIdPrefix(challenge.id)}${index}`,
    category: CATEGORIES[index] ?? 'training',
    name: habit.text,
  }));
}

// Which catalogue challenge a participation belongs to (null: one started
// before the catalogue, with habits chosen from the old presets).
export function challengeOfHabits(
  habits: { id: string }[],
): Core33Challenge | null {
  const match = habits[0]?.id.match(/^core33:([a-z]+):\d+$/);
  return match ? findChallenge(match[1]) : null;
}

// "Entreno", "Proteína"… for habit `index`; the generic pillar of its
// category for old participations.
export function pillarOf(
  habits: { id: string; category: string }[],
  index: number,
): string {
  const challenge = challengeOfHabits(habits);
  return (
    challenge?.habits[index]?.pillar ??
    CATEGORY_LABELS[habits[index]?.category] ??
    'Hábito'
  );
}

// "Encaja con tu objetivo": the first challenge of the user's goal, else the
// first of the list.
export function recommendedChallenge(goal: string | null | undefined) {
  return (
    CORE33_CHALLENGES.find(challenge =>
      goal ? challenge.fitsGoals.includes(goal) : false,
    ) ?? CORE33_CHALLENGES[0]
  );
}
