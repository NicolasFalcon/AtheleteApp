import {
  FEATURED_COLLECTION_BADGE,
  FEATURED_COLLECTION_TITLE,
  featuredRoutineDefinitions,
  getFeaturedRoutineDefinitionBySource,
  getFeaturedRoutineMetadata,
  getFeaturedSource,
} from '@athelete/domain/featured-routines';
import { Workout } from '@/lib/types';
import { getWorkoutThumbnail } from '@/lib/workoutThumbnails';

export {
  FEATURED_COLLECTION_BADGE,
  FEATURED_COLLECTION_TITLE,
  featuredRoutineDefinitions,
  getFeaturedRoutineDefinitionBySource,
  getFeaturedRoutineMetadata,
  getFeaturedSource,
};

export function buildFeaturedRoutineTemplatePayload(
  definition: (typeof featuredRoutineDefinitions)[number],
) {
  const source = getFeaturedSource(definition.slug);

  return {
    title: definition.title,
    description: definition.description,
    type: definition.type,
    difficulty: definition.difficulty,
    duration: definition.duration,
    calories: definition.calories,
    target_muscles: definition.targetMuscles,
    image_url: getWorkoutThumbnail(definition.type, definition.targetMuscles, definition.title),
    tags: [...definition.tags, definition.inspirationStyle, FEATURED_COLLECTION_TITLE],
    source,
    created_by_ai: false,
    is_public: false,
  };
}

export function buildFeaturedRoutineWorkout(
  definition: (typeof featuredRoutineDefinitions)[number],
): Omit<Workout, 'id'> {
  const source = getFeaturedSource(definition.slug);
  const metadata = getFeaturedRoutineMetadata(source);

  return {
    title: definition.title,
    description: definition.description,
    type: definition.type,
    difficulty: definition.difficulty,
    duration: definition.duration,
    calories: definition.calories,
    targetMuscles: definition.targetMuscles,
    exercises: definition.exercises.map((exercise, index) => ({
      id: `featured-${definition.slug}-${index}`,
      name: exercise.name,
      sets: exercise.sets,
      reps: exercise.reps,
      duration: exercise.duration,
      restTime: exercise.restTime,
      notes: exercise.notes,
    })),
    isPremium: false,
    imageUrl: getWorkoutThumbnail(definition.type, definition.targetMuscles, definition.title),
    tags: [...definition.tags, definition.inspirationStyle, FEATURED_COLLECTION_TITLE],
    createdByAi: false,
    source,
    sourceType: metadata?.sourceType,
    collectionType: metadata?.collectionType,
    collectionTitle: metadata?.collectionTitle,
    collectionBadge: metadata?.collectionBadge,
    inspirationStyle: metadata?.inspirationStyle,
    isFeatured: metadata?.isFeatured,
  };
}
