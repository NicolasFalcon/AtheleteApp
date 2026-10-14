import type { Json } from '@app/types/supabase';

export type LibraryExercise = {
  id: string;
  name: string;
  slug: string;
  equipment: string;
  bodyPart: string;
  level: string;
  thumbnailUrl: string;
  videoUrl?: string | null;
  orientation?: 'portrait' | 'landscape' | null;
  howToPerform: string[];
  coachingCues: string[];
  commonMistakes: string[];
  musclesWorked: {
    primary: string[];
    secondary: string[];
  };
  // exercises.recommended_sets_reps as stored (JSON by goal, free-text
  // values). Read it with recommendationFor / parseSetsReps (setsReps.ts).
  recommendedSetsReps: Json | null;
  usedInRoutines: string[];
  category: string;
  shortDescription: string | null;
  longDescription: string | null;
  benefits: string[];
  tags: string[];
  movementPatterns: string[];
  trackingMetrics: string[];
  isUnilateral: boolean;
  prEligible: boolean;
};

const muscleGroupToBodyPart: Record<string, string> = {
  chest: 'chest',
  back: 'back',
  legs: 'legs',
  calves: 'legs',
  glutes: 'glutes',
  shoulders: 'shoulders',
  traps: 'shoulders',
  biceps: 'arms',
  triceps: 'arms',
  forearms: 'arms',
  core: 'core',
  lower_back: 'core',
  full_body: 'fullbody',
  mobility: 'mobility',
  cardio: 'cardio',
  quadriceps: 'legs',
  hamstrings: 'legs',
  adductors: 'legs',
  tibialis: 'legs',
  'lower-back': 'core',
  trapezius: 'shoulders',
  neck: 'shoulders',
};

const equipmentToFilter: Record<string, string> = {
  bodyweight: 'bodyweight',
  dumbbells: 'dumbbells',
  barbell: 'barbell',
  machine: 'machines',
  cable: 'cable',
  kettlebell: 'kettlebells',
  resistance_band: 'bands',
  trx: 'trx',
  medicine_ball: 'medicine_ball',
  smith_machine: 'smith_machine',
  dumbbell: 'dumbbells',
  'cable-machine': 'cable',
  band: 'bands',
};

export const equipmentLabels: Record<string, string> = {
  bodyweight: 'Peso corporal',
  dumbbells: 'Mancuernas',
  barbell: 'Barra',
  machines: 'Máquinas',
  cable: 'Cable',
  kettlebells: 'Kettlebells',
  bands: 'Bandas',
  trx: 'TRX',
  medicine_ball: 'Balón medicinal',
  smith_machine: 'Smith Machine',
};

export const bodyPartLabels: Record<string, string> = {
  chest: 'Pecho',
  back: 'Espalda',
  legs: 'Piernas',
  shoulders: 'Hombros',
  arms: 'Brazos',
  core: 'Core',
  glutes: 'Glúteos',
  fullbody: 'Cuerpo completo',
  mobility: 'Movilidad',
  cardio: 'Cardio',
};

export const levelLabels: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
};

export function mapDbExerciseRow(row: any): LibraryExercise {
  const primaryMuscles = row.primary_muscles || [];
  const equipment = Array.isArray(row.equipment)
    ? row.equipment[0] || 'bodyweight'
    : row.equipment || 'bodyweight';
  const primaryMuscleSlug = row.muscle_group || row.primary_muscle_slug || '';

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    equipment: equipmentToFilter[equipment] || equipment,
    bodyPart:
      muscleGroupToBodyPart[primaryMuscleSlug] || primaryMuscleSlug || 'fullbody',
    level: row.difficulty,
    thumbnailUrl: row.thumbnail_url || '',
    videoUrl: row.video_url || null,
    orientation:
      (row.video_orientation as 'portrait' | 'landscape' | null) || 'landscape',
    howToPerform: row.how_to_steps || [],
    coachingCues: row.technique_cues || [],
    commonMistakes: row.common_mistakes || [],
    musclesWorked: {
      primary: primaryMuscles,
      secondary: row.secondary_muscles || [],
    },
    recommendedSetsReps: (row.recommended_sets_reps ?? null) as Json | null,
    usedInRoutines: [],
    category: row.category || 'strength',
    shortDescription: row.short_description || null,
    longDescription: row.long_description || null,
    benefits: row.benefits || [],
    tags: row.tags || [],
    movementPatterns: row.movement_patterns || [],
    trackingMetrics: row.tracking_metrics || [],
    isUnilateral: Boolean(row.is_unilateral),
    prEligible: Boolean(row.pr_eligible),
  };
}

export function findExerciseByName(
  exercises: LibraryExercise[],
  name: string,
): LibraryExercise | undefined {
  const normalizedName = name.toLowerCase();

  return exercises.find(
    exercise =>
      exercise.name.toLowerCase().includes(normalizedName) ||
      normalizedName.includes(exercise.name.toLowerCase()),
  );
}
