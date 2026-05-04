import {getSupabaseClient} from '@app/services/supabase/client';
import type {Workout} from '@app/shared';
import {getWorkoutAccess} from '@app/shared';
import {
  dedupeFeaturedTemplates,
  mapTemplateExerciseRowToExercise,
  mapTemplateRowToWorkout,
} from '@app/shared/data/workouts';

type RoutineDraft = Omit<Workout, 'id'>;

function getClient() {
  const client = getSupabaseClient();

  if (!client) {
    throw new Error('Supabase no está configurado.');
  }

  return client;
}

function buildTemplatePayload(
  userId: string,
  workout: RoutineDraft,
  mode: 'create' | 'update',
) {
  return {
    title: workout.title,
    type: workout.type,
    duration: workout.duration,
    difficulty: workout.difficulty,
    calories: workout.calories,
    target_muscles: workout.targetMuscles,
    description: workout.description || null,
    is_premium: workout.isPremium || false,
    image_url: workout.imageUrl || null,
    tags: workout.tags || [],
    ...(mode === 'create'
      ? {
          created_by: userId,
          created_by_ai: workout.createdByAi || false,
          is_public: workout.isPublic || false,
          source: workout.source || 'custom',
        }
      : null),
  };
}

function buildExercisePayload(templateId: string, workout: RoutineDraft) {
  return workout.exercises.map((exercise, index) => ({
    template_id: templateId,
    exercise_id: exercise.exerciseId || null,
    name: exercise.name,
    sets: exercise.sets ?? null,
    reps: exercise.reps ?? null,
    duration: exercise.duration ?? null,
    rest_time: exercise.restTime ?? 60,
    notes: exercise.notes || null,
    sort_order: index,
  }));
}

export async function fetchRoutineById(workoutId: string): Promise<Workout | null> {
  const client = getClient();
  const {data: template, error: templateError} = await client
    .from('workout_templates')
    .select('*')
    .eq('id', workoutId)
    .single();

  if (templateError || !template) {
    return null;
  }

  const {data: exerciseRows, error: exerciseError} = await client
    .from('template_exercises')
    .select('*')
    .eq('template_id', workoutId)
    .order('sort_order');

  if (exerciseError) {
    throw exerciseError;
  }

  return mapTemplateRowToWorkout(template, {
    [workoutId]: (exerciseRows || []).map(mapTemplateExerciseRowToExercise),
  });
}

export async function fetchEditableWorkouts(userId: string): Promise<Workout[]> {
  const client = getClient();
  const {data: templates, error: templateError} = await client
    .from('workout_templates')
    .select('*')
    .eq('created_by', userId)
    .eq('is_public', false)
    .order('created_at', {ascending: false});

  if (templateError) {
    throw templateError;
  }

  const templateRows = dedupeFeaturedTemplates((templates || []) as any[]);

  if (templateRows.length === 0) {
    return [];
  }

  const templateIds = templateRows.map(template => template.id);
  const {data: exerciseRows, error: exerciseError} = await client
    .from('template_exercises')
    .select('*')
    .in('template_id', templateIds)
    .order('sort_order');

  if (exerciseError) {
    throw exerciseError;
  }

  const typedExerciseRows = (exerciseRows || []) as any[];

  const exercisesByTemplate = typedExerciseRows.reduce<
    Record<string, Workout['exercises']>
  >((accumulator, exercise) => {
    if (!accumulator[exercise.template_id]) {
      accumulator[exercise.template_id] = [];
    }

    accumulator[exercise.template_id].push(
      mapTemplateExerciseRowToExercise(exercise),
    );

    return accumulator;
  }, {});

  return templateRows
    .map(template => mapTemplateRowToWorkout(template, exercisesByTemplate))
    .filter(workout => getWorkoutAccess(workout, userId).canEdit);
}

export async function createRoutine(
  userId: string,
  workout: RoutineDraft,
): Promise<Workout> {
  const client = getClient();
  const {data: template, error: templateError} = await (client
    .from('workout_templates') as any)
    .insert(buildTemplatePayload(userId, workout, 'create'))
    .select()
    .single();

  if (templateError || !template) {
    throw new Error(
      templateError?.message || 'No pudimos guardar la rutina.',
    );
  }

  if (workout.exercises.length > 0) {
    const {error: exerciseError} = await (client
      .from('template_exercises') as any)
      .insert(buildExercisePayload(template.id, workout));

    if (exerciseError) {
      await client.from('workout_templates').delete().eq('id', template.id);
      throw new Error(exerciseError.message);
    }
  }

  return (
    (await fetchRoutineById(String(template.id))) ||
    mapTemplateRowToWorkout(template, {
      [template.id]: workout.exercises,
    })
  );
}

export async function updateRoutine(
  userId: string,
  workoutId: string,
  workout: RoutineDraft,
): Promise<Workout> {
  const currentWorkout = await fetchRoutineById(workoutId);

  if (!currentWorkout || !getWorkoutAccess(currentWorkout, userId).canEdit) {
    throw new Error('No tienes permisos para editar esta rutina.');
  }

  const client = getClient();
  const {data: updatedTemplate, error: updateError} = await (client
    .from('workout_templates') as any)
    .update(buildTemplatePayload(userId, workout, 'update'))
    .eq('id', workoutId)
    .eq('created_by', userId)
    .select()
    .single();

  if (updateError || !updatedTemplate) {
    throw new Error(
      updateError?.message || 'No pudimos guardar los cambios.',
    );
  }

  const {error: deleteExercisesError} = await client
    .from('template_exercises')
    .delete()
    .eq('template_id', workoutId);

  if (deleteExercisesError) {
    throw deleteExercisesError;
  }

  if (workout.exercises.length > 0) {
    const {error: exerciseError} = await (client
      .from('template_exercises') as any)
      .insert(buildExercisePayload(workoutId, workout));

    if (exerciseError) {
      throw new Error(exerciseError.message);
    }
  }

  return (
    (await fetchRoutineById(workoutId)) ||
    mapTemplateRowToWorkout(updatedTemplate, {
      [workoutId]: workout.exercises,
    })
  );
}

export async function deleteRoutine(
  userId: string,
  workoutId: string,
): Promise<void> {
  const currentWorkout = await fetchRoutineById(workoutId);

  if (!currentWorkout || !getWorkoutAccess(currentWorkout, userId).canDelete) {
    throw new Error('No tienes permisos para eliminar esta rutina.');
  }

  const client = getClient();
  const {error: sessionError} = await (client as any)
    .from('workout_sessions')
    .update({
      workout_id: null,
      workout_title: currentWorkout.title,
    })
    .eq('user_id', userId)
    .eq('workout_id', workoutId);

  if (sessionError) {
    throw sessionError;
  }

  const {error: deleteExercisesError} = await client
    .from('template_exercises')
    .delete()
    .eq('template_id', workoutId);

  if (deleteExercisesError) {
    throw deleteExercisesError;
  }

  const {error: deleteTemplateError} = await client
    .from('workout_templates')
    .delete()
    .eq('id', workoutId)
    .eq('created_by', userId);

  if (deleteTemplateError) {
    throw deleteTemplateError;
  }
}

export async function appendExerciseToRoutine(params: {
  userId: string;
  workoutId: string;
  exerciseId: string;
  exerciseName: string;
}): Promise<void> {
  const currentWorkout = await fetchRoutineById(params.workoutId);

  if (
    !currentWorkout ||
    !getWorkoutAccess(currentWorkout, params.userId).canEdit
  ) {
    throw new Error('No tienes permisos para editar esta rutina.');
  }

  const client = getClient();
  const nextOrder = currentWorkout.exercises.length;
  const {error} = await (client.from('template_exercises') as any).insert({
    template_id: params.workoutId,
    exercise_id: params.exerciseId,
    name: params.exerciseName,
    sets: 3,
    reps: 10,
    duration: null,
    rest_time: 60,
    notes: null,
    sort_order: nextOrder,
  });

  if (error) {
    throw new Error(error.message);
  }
}
