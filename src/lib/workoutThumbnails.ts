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

// Only an official or editorial routine with a photo of its own keeps it
// (§28.16); every other routine shows the app's cover (focus word over the
// brand background, RoutineCover). The one rule for every screen.
export function routineKeepsPhoto(routine: {
  origin?: string | null;
  imageUrl?: string | null;
}): boolean {
  return (
    (routine.origin === 'official' || routine.origin === 'editorial') &&
    Boolean(routine.imageUrl?.trim())
  );
}

// The picture of a routine when it keeps its photo. Without `origin` (or for
// any routine that is not official / editorial) the `imageUrl` is ignored and
// the stock thumbnail comes back: screens draw the cover instead (see
// routineKeepsPhoto) and use this only as the fallback of a failed photo.
export function resolveWorkoutThumbnailSource(params: {
  imageUrl?: string | null;
  origin?: string | null;
  type?: string;
  targetMuscles?: string[];
  title?: string;
}) {
  if (params.imageUrl && routineKeepsPhoto(params)) {
    return {uri: params.imageUrl};
  }

  return getWorkoutThumbnail(params.type, params.targetMuscles, params.title);
}
