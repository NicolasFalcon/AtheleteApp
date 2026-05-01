const thumbLegs = require('@app/assets/thumbnails/workout-legs.jpg');
const thumbBack = require('@app/assets/thumbnails/workout-back.jpg');
const thumbChest = require('@app/assets/thumbnails/workout-chest.jpg');
const thumbShoulders = require('@app/assets/thumbnails/workout-shoulders.jpg');
const thumbCardio = require('@app/assets/thumbnails/workout-cardio.jpg');
const thumbMobility = require('@app/assets/thumbnails/workout-mobility.jpg');
const thumbFullbody = require('@app/assets/thumbnails/workout-fullbody.jpg');
const thumbArms = require('@app/assets/thumbnails/workout-arms.jpg');
const thumbCore = require('@app/assets/thumbnails/workout-core.jpg');

export const DEFAULT_WORKOUT_THUMBNAIL = thumbFullbody;

const muscleKeywords: Array<[string[], number]> = [
  [['chest', 'pecho', 'push', 'bench', 'press banca'], thumbChest],
  [['back', 'espalda', 'pull', 'dorsal', 'lat', 'row'], thumbBack],
  [
    ['leg', 'pierna', 'quad', 'cuádricep', 'hamstring', 'squat', 'sentadilla', 'glut'],
    thumbLegs,
  ],
  [['shoulder', 'hombro', 'deltoid', 'press militar'], thumbShoulders],
  [['arm', 'brazo', 'bicep', 'bícep', 'tricep', 'trícep', 'curl'], thumbArms],
  [['core', 'abs', 'abdomen', 'plank', 'crunch'], thumbCore],
  [['cardio', 'hiit', 'conditioning', 'burpee', 'jump', 'sprint'], thumbCardio],
  [['mobility', 'movilidad', 'stretch', 'recovery', 'recuperación', 'yoga'], thumbMobility],
  [['full', 'cuerpo completo', 'fullbody', 'total'], thumbFullbody],
];

const typeMap: Record<string, number> = {
  strength: thumbFullbody,
  cardio: thumbCardio,
  fullbody: thumbFullbody,
  mobility: thumbMobility,
  hiit: thumbCardio,
};

export function getWorkoutThumbnail(
  type?: string,
  targetMuscles?: string[],
  title?: string,
) {
  const searchText = [title || '', ...(targetMuscles || [])]
    .join(' ')
    .toLowerCase();

  for (const [keywords, thumb] of muscleKeywords) {
    if (keywords.some(keyword => searchText.includes(keyword))) {
      return thumb;
    }
  }

  if (type && typeMap[type]) {
    return typeMap[type];
  }

  return DEFAULT_WORKOUT_THUMBNAIL;
}

export function resolveWorkoutThumbnailSource(params: {
  imageUrl?: string | null;
  type?: string;
  targetMuscles?: string[];
  title?: string;
}) {
  if (params.imageUrl && params.imageUrl.trim().length > 0) {
    return {uri: params.imageUrl};
  }

  return getWorkoutThumbnail(params.type, params.targetMuscles, params.title);
}
