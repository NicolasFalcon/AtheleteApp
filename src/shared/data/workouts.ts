import {
  ROUTINE_CATEGORY_VALUES,
  type RoutineCategory,
} from '@app/shared/domain/types';

// Routines are read through the RPCs of docs/backend/ROUTINES_SHAPES.md
// (services/routines/routinesService.ts maps them).

// Unknown or missing values are null: the routine goes to "Todas" only.
export function parseRoutineCategory(
  value: string | null | undefined,
): RoutineCategory | null {
  return (ROUTINE_CATEGORY_VALUES as readonly string[]).includes(value ?? '')
    ? (value as RoutineCategory)
    : null;
}
