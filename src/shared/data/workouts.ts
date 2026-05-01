import {getFeaturedRoutineMetadata} from '@app/shared/domain/featured-routines';
import type {
  Workout,
  WorkoutExercise,
} from '@app/shared/domain/types';

export function mapTemplateExerciseRowToExercise(exerciseRow: any): WorkoutExercise {
  return {
    id: exerciseRow.id,
    exerciseId: exerciseRow.exercise_id || null,
    name: exerciseRow.name,
    sets: exerciseRow.sets ?? undefined,
    reps: exerciseRow.reps ?? undefined,
    duration: exerciseRow.duration ?? undefined,
    restTime: exerciseRow.rest_time || 60,
    notes: exerciseRow.notes ?? undefined,
  };
}

export function mapTemplateRowToWorkout(
  templateRow: any,
  exercisesByTemplate: Record<string, WorkoutExercise[]>,
): Workout {
  const featuredMetadata = getFeaturedRoutineMetadata(templateRow.source);
  const sourceType =
    featuredMetadata?.sourceType ||
    (templateRow.created_by_ai || templateRow.source === 'ellie'
      ? 'ellie'
      : templateRow.created_by
        ? 'user'
        : 'library');
  const collectionType =
    featuredMetadata?.collectionType ||
    (templateRow.created_by_ai || templateRow.source === 'ellie'
      ? 'ellie_generated'
      : templateRow.created_by
        ? 'user_created'
        : 'standard_library');

  return {
    sourceType,
    collectionType,
    collectionTitle: featuredMetadata?.collectionTitle,
    collectionBadge: featuredMetadata?.collectionBadge,
    inspirationStyle: featuredMetadata?.inspirationStyle,
    isFeatured: featuredMetadata?.isFeatured || false,
    id: templateRow.id,
    title: templateRow.title,
    type: templateRow.type as Workout['type'],
    duration: templateRow.duration,
    difficulty: templateRow.difficulty as Workout['difficulty'],
    calories: templateRow.calories,
    targetMuscles: templateRow.target_muscles || [],
    exercises: exercisesByTemplate[templateRow.id] || [],
    isPremium: templateRow.is_premium || false,
    description: templateRow.description || undefined,
    imageUrl: templateRow.image_url || undefined,
    tags: templateRow.tags || [],
    createdBy: templateRow.created_by,
    createdByAi: templateRow.created_by_ai || false,
    isPublic: templateRow.is_public || false,
    source: templateRow.source || undefined,
  };
}

export function dedupeFeaturedTemplates(templates: any[]) {
  const seenFeaturedSources = new Set<string>();

  return templates.filter(template => {
    if (!getFeaturedRoutineMetadata(template.source) || !template.source) {
      return true;
    }

    if (seenFeaturedSources.has(template.source)) {
      return false;
    }

    seenFeaturedSources.add(template.source);
    return true;
  });
}
