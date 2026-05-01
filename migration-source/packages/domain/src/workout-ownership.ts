import { Workout } from './types';

export type WorkoutAccessKind = 'library' | 'personal' | 'ellie';

export interface WorkoutAccess {
  kind: WorkoutAccessKind;
  isOwnedByCurrentUser: boolean;
  canEdit: boolean;
  canDelete: boolean;
  label: string;
  description: string;
}

export interface WorkoutDetailOwnershipPresentation {
  label?: string;
  description?: string;
}

export function getWorkoutAccess(workout: Workout, currentUserId?: string | null): WorkoutAccess {
  if (workout.sourceType === 'featured_editorial') {
    return {
      kind: 'library',
      isOwnedByCurrentUser: false,
      canEdit: false,
      canDelete: false,
      label: 'Biblioteca',
      description: 'Rutina editorial protegida dentro de la biblioteca.',
    };
  }

  const isOwnedByCurrentUser =
    Boolean(currentUserId) &&
    workout.createdBy === currentUserId &&
    workout.isPublic !== true;

  if (!isOwnedByCurrentUser) {
    return {
      kind: 'library',
      isOwnedByCurrentUser: false,
      canEdit: false,
      canDelete: false,
      label: 'Biblioteca',
      description: 'Plantilla global de solo lectura.',
    };
  }

  if (workout.createdByAi || workout.source === 'ellie') {
    return {
      kind: 'ellie',
      isOwnedByCurrentUser: true,
      canEdit: true,
      canDelete: true,
      label: 'ELLIE',
      description: 'Rutina generada para ti. Puedes editarla o eliminarla.',
    };
  }

  return {
    kind: 'personal',
    isOwnedByCurrentUser: true,
    canEdit: true,
    canDelete: true,
    label: 'Tuya',
    description: 'Rutina creada por ti. Puedes editarla o eliminarla.',
  };
}

export function canManageWorkout(workout: Workout, currentUserId?: string | null): boolean {
  const access = getWorkoutAccess(workout, currentUserId);
  return access.canEdit && access.canDelete;
}

export function getWorkoutDetailOwnershipPresentation(
  workout: Workout,
  currentUserId?: string | null,
): WorkoutDetailOwnershipPresentation {
  const access = getWorkoutAccess(workout, currentUserId);
  const isEditable = access.canEdit || access.canDelete;

  if (isEditable) {
    return { label: access.label, description: access.description };
  }

  if (workout.sourceType === 'featured_editorial' || workout.isFeatured) {
    return {};
  }

  if (access.kind === 'library') {
    return { label: access.label };
  }

  return {};
}
