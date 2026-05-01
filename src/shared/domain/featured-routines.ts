import type { Workout } from '@app/shared/domain/types';

export const FEATURED_SOURCE_PREFIX = 'featured_editorial:';
export const FEATURED_COLLECTION_TITLE = 'Estilos icónicos';
export const FEATURED_COLLECTION_BADGE = 'Colección';

export type FeaturedRoutineExercise = {
  name: string;
  sets?: number;
  reps?: number;
  duration?: number;
  restTime: number;
  notes?: string;
};

export type FeaturedRoutineDefinition = {
  slug: string;
  title: string;
  description: string;
  inspirationStyle: string;
  type: Workout['type'];
  difficulty: Workout['difficulty'];
  duration: number;
  calories: number;
  targetMuscles: string[];
  tags: string[];
  exercises: FeaturedRoutineExercise[];
};

export const featuredRoutineDefinitions: FeaturedRoutineDefinition[] = [
  {
    slug: 'classic-physique-inspired',
    title: 'Físico clásico',
    description:
      'Bloque editorial con énfasis en simetría, torso dominante y acabado estético.',
    inspirationStyle: 'Estética clásica',
    type: 'strength',
    difficulty: 'intermediate',
    duration: 62,
    calories: 430,
    targetMuscles: ['chest', 'back', 'shoulders', 'arms'],
    tags: ['editorial', 'physique', 'estética'],
    exercises: [
      {
        name: 'Pull-ups',
        sets: 4,
        reps: 8,
        restTime: 90,
        notes: 'Controla la bajada para mantener tensión en los dorsales.',
      },
      {
        name: 'Dumbbell Bench Press',
        sets: 4,
        reps: 10,
        restTime: 75,
        notes: 'Haz una pausa breve abajo para sesgar más el pecho superior.',
      },
      {name: 'Lat Pulldown', sets: 3, reps: 12, restTime: 60},
      {name: 'Overhead Press', sets: 3, reps: 8, restTime: 90},
      {
        name: 'Dumbbell Lateral Raise',
        sets: 4,
        reps: 15,
        restTime: 45,
        notes: 'Busca forma y control, no impulso.',
      },
      {name: 'Dumbbell Biceps Curl', sets: 3, reps: 12, restTime: 45},
      {name: 'Tricep Dips', sets: 3, reps: 12, restTime: 60},
    ],
  },
  {
    slug: 'science-based-upper-lower',
    title: 'Torso/Pierna con enfoque científico',
    description:
      'División torso/pierna eficiente y medible, pensada para progresar con volumen equilibrado.',
    inspirationStyle: 'Progresión basada en ciencia',
    type: 'fullbody',
    difficulty: 'beginner',
    duration: 56,
    calories: 380,
    targetMuscles: ['legs', 'chest', 'back', 'shoulders', 'core'],
    tags: ['editorial', 'science-based', 'upper-lower'],
    exercises: [
      {
        name: 'Barbell Squat',
        sets: 4,
        reps: 6,
        restTime: 120,
        notes: 'Trabaja con un RPE medio-alto sin perder consistencia técnica.',
      },
      {name: 'Romanian Deadlift', sets: 3, reps: 8, restTime: 105},
      {name: 'Dumbbell Bench Press', sets: 3, reps: 8, restTime: 75},
      {name: 'Lat Pulldown', sets: 3, reps: 10, restTime: 75},
      {name: 'Overhead Press', sets: 2, reps: 10, restTime: 75},
      {name: 'Plank', sets: 3, duration: 45, restTime: 30},
    ],
  },
  {
    slug: 'mass-builder-split',
    title: 'Volumen muscular',
    description:
      'Sesión de hipertrofia pesada, enfocada en construir masa con básicos y accesorios.',
    inspirationStyle: 'Hipertrofia de volumen medio-alto',
    type: 'strength',
    difficulty: 'advanced',
    duration: 68,
    calories: 470,
    targetMuscles: ['legs', 'chest', 'back', 'arms'],
    tags: ['editorial', 'mass', 'hypertrophy'],
    exercises: [
      {name: 'Barbell Squat', sets: 4, reps: 8, restTime: 120},
      {name: 'Leg Press', sets: 4, reps: 12, restTime: 90},
      {name: 'Romanian Deadlift', sets: 3, reps: 10, restTime: 90},
      {name: 'Dumbbell Bench Press', sets: 4, reps: 8, restTime: 75},
      {name: 'Lat Pulldown', sets: 4, reps: 10, restTime: 75},
      {name: 'Dumbbell Biceps Curl', sets: 3, reps: 12, restTime: 45},
      {name: 'Tricep Dips', sets: 3, reps: 10, restTime: 60},
    ],
  },
  {
    slug: 'old-school-bodybuilding',
    title: 'Culturismo de la vieja escuela',
    description:
      'Rutina inspirada en el enfoque clásico de bombeo, densidad y alto volumen.',
    inspirationStyle: 'Bombeo de la vieja escuela',
    type: 'strength',
    difficulty: 'intermediate',
    duration: 64,
    calories: 445,
    targetMuscles: ['chest', 'back', 'shoulders', 'arms'],
    tags: ['editorial', 'old-school', 'pump'],
    exercises: [
      {name: 'Dumbbell Bench Press', sets: 5, reps: 10, restTime: 60},
      {name: 'Pull-ups', sets: 4, reps: 8, restTime: 75},
      {name: 'Lat Pulldown', sets: 4, reps: 12, restTime: 60},
      {name: 'Overhead Press', sets: 4, reps: 10, restTime: 75},
      {name: 'Dumbbell Lateral Raise', sets: 4, reps: 15, restTime: 45},
      {name: 'Dumbbell Biceps Curl', sets: 4, reps: 12, restTime: 45},
      {
        name: 'Tricep Dips',
        sets: 4,
        reps: 12,
        restTime: 45,
        notes: 'Mantén descansos cortos para maximizar la congestión.',
      },
    ],
  },
  {
    slug: 'modern-social-media-split',
    title: 'Hipertrofia moderna',
    description:
      'Rutina visual y dinámica: deltoides, torso y core con ritmo alto y acabado atlético.',
    inspirationStyle: 'Volumen visual contemporáneo',
    type: 'hiit',
    difficulty: 'intermediate',
    duration: 48,
    calories: 410,
    targetMuscles: ['shoulders', 'arms', 'core', 'fullbody'],
    tags: ['editorial', 'modern', 'pump'],
    exercises: [
      {name: 'Dumbbell Lateral Raise', sets: 4, reps: 15, restTime: 30},
      {name: 'Overhead Press', sets: 4, reps: 8, restTime: 60},
      {name: 'Tricep Dips', sets: 3, reps: 12, restTime: 45},
      {name: 'Dumbbell Biceps Curl', sets: 3, reps: 12, restTime: 45},
      {name: 'Mountain Climbers', sets: 4, duration: 30, restTime: 20},
      {name: 'Burpees', sets: 3, duration: 30, restTime: 30},
      {name: 'Plank', sets: 3, duration: 45, restTime: 30},
    ],
  },
];

export function getFeaturedSource(slug: string) {
  return `${FEATURED_SOURCE_PREFIX}${slug}`;
}

export function getFeaturedRoutineDefinitionBySource(source?: string | null) {
  if (!source?.startsWith(FEATURED_SOURCE_PREFIX)) {
    return null;
  }

  const slug = source.slice(FEATURED_SOURCE_PREFIX.length);
  return (
    featuredRoutineDefinitions.find(routine => routine.slug === slug) || null
  );
}

export function getFeaturedRoutineMetadata(source?: string | null) {
  const routine = getFeaturedRoutineDefinitionBySource(source);

  if (!routine) {
    return null;
  }

  return {
    sourceType: 'featured_editorial' as const,
    collectionType: 'featured_styles' as const,
    collectionTitle: FEATURED_COLLECTION_TITLE,
    collectionBadge: FEATURED_COLLECTION_BADGE,
    inspirationStyle: routine.inspirationStyle,
    isFeatured: true,
  };
}
