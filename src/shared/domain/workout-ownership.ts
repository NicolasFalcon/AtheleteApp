import type { Workout } from '@app/shared/domain/types';

export type WorkoutAccessKind = 'library' | 'personal' | 'ellie';

export type WorkoutAccess = {
  kind: WorkoutAccessKind;
  isOwnedByCurrentUser: boolean;
  canEdit: boolean;
  canDelete: boolean;
  label: string;
  description: string;
};

export function getWorkoutAccess(
  workout: Workout,
  currentUserId?: string | null,
): WorkoutAccess {
  // Routines read through the RPCs carry is_mine / can_edit (the server
  // decides; only the owner edits or deletes, never an archived routine).
  if (workout.isMine !== undefined) {
    if (!workout.isMine) {
      return {
        kind: 'library',
        isOwnedByCurrentUser: false,
        canEdit: false,
        canDelete: false,
        label: 'Biblioteca',
        description: 'Plantilla global de solo lectura.',
      };
    }
    const canEdit = Boolean(workout.canEdit) && !workout.archived;
    const ellie = workout.origin === 'ellie';
    return {
      kind: ellie ? 'ellie' : 'personal',
      isOwnedByCurrentUser: true,
      canEdit,
      canDelete: canEdit,
      label: ellie ? 'ELLIE' : 'Tuya',
      description: ellie
        ? 'Rutina generada para ti. Puedes editarla o eliminarla.'
        : 'Rutina creada por ti. Puedes editarla o eliminarla.',
    };
  }

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
