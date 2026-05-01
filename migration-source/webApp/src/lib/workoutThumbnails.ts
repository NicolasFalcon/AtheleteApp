/**
 * Workout thumbnail mapping for ELLIE-generated workouts.
 * Assigns a cover image based on workout type, target muscles, or title keywords.
 */

import thumbLegs from '@/assets/thumbnails/workout-legs.jpg';
import thumbBack from '@/assets/thumbnails/workout-back.jpg';
import thumbChest from '@/assets/thumbnails/workout-chest.jpg';
import thumbShoulders from '@/assets/thumbnails/workout-shoulders.jpg';
import thumbCardio from '@/assets/thumbnails/workout-cardio.jpg';
import thumbMobility from '@/assets/thumbnails/workout-mobility.jpg';
import thumbFullbody from '@/assets/thumbnails/workout-fullbody.jpg';
import thumbArms from '@/assets/thumbnails/workout-arms.jpg';
import thumbCore from '@/assets/thumbnails/workout-core.jpg';

export const DEFAULT_WORKOUT_THUMBNAIL = thumbFullbody.src;

const muscleKeywords: [string[], string][] = [
  [['chest', 'pecho', 'push', 'bench', 'press banca'], thumbChest.src],
  [['back', 'espalda', 'pull', 'dorsal', 'lat', 'row'], thumbBack.src],
  [['leg', 'pierna', 'quad', 'cuádricep', 'hamstring', 'squat', 'sentadilla', 'glut'], thumbLegs.src],
  [['shoulder', 'hombro', 'deltoid', 'press militar'], thumbShoulders.src],
  [['arm', 'brazo', 'bicep', 'bícep', 'tricep', 'trícep', 'curl'], thumbArms.src],
  [['core', 'abs', 'abdomen', 'plank', 'crunch'], thumbCore.src],
  [['cardio', 'hiit', 'conditioning', 'burpee', 'jump', 'sprint'], thumbCardio.src],
  [['mobility', 'movilidad', 'stretch', 'recovery', 'recuperación', 'yoga', 'flexibility'], thumbMobility.src],
  [['full', 'cuerpo completo', 'fullbody', 'total'], thumbFullbody.src],
];

const typeMap: Record<string, string> = {
  strength: thumbFullbody.src,
  cardio: thumbCardio.src,
  fullbody: thumbFullbody.src,
  mobility: thumbMobility.src,
  hiit: thumbCardio.src,
};

export function getWorkoutThumbnail(
  type?: string,
  targetMuscles?: string[],
  title?: string
): string {
  const searchText = [
    title || '',
    ...(targetMuscles || []),
  ].join(' ').toLowerCase();

  // Check muscle keywords first (more specific)
  for (const [keywords, thumb] of muscleKeywords) {
    if (keywords.some(kw => searchText.includes(kw))) {
      return thumb;
    }
  }

  // Fall back to type
  if (type && typeMap[type]) {
    return typeMap[type];
  }

  // Default
  return DEFAULT_WORKOUT_THUMBNAIL;
}

export function resolveWorkoutThumbnailSrc(params: {
  src?: string | null;
  type?: string;
  targetMuscles?: string[];
  title?: string;
}): string {
  const candidate = params.src?.trim();
  if (candidate) {
    return candidate;
  }

  return getWorkoutThumbnail(params.type, params.targetMuscles, params.title);
}
