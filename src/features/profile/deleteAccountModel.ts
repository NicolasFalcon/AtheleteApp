// Eliminar cuenta (BT-30): what the Edge Function `delete-account` answers and
// what the screen does about it. Pure.

export type DeleteAccountResponse = {
  // HTTP status; null when there was no answer (no connection).
  status: number | null;
  body: unknown;
};

export type DeleteAccountOutcome =
  // Deleted: clear the local data and sign out.
  | { kind: 'deleted' }
  // The only administrator account cannot be deleted: stay signed in.
  | { kind: 'lastAdmin'; message: string }
  // The session is not valid any more: sign out.
  | { kind: 'unauthorized' }
  // Server error or no connection: offer "Reintentar".
  | { kind: 'retry'; message: string };

export const DELETE_ACCOUNT_MESSAGES = {
  lastAdmin:
    'No se puede eliminar la única cuenta administradora. Nombra a otra persona administradora y vuelve a intentarlo.',
  retry:
    'No pudimos eliminar tu cuenta. No se borró nada; inténtalo de nuevo en unos segundos.',
} as const;

const field = (body: unknown, key: string): unknown =>
  body && typeof body === 'object' ? (body as Record<string, unknown>)[key] : undefined;

export function mapDeleteAccountResponse(
  response: DeleteAccountResponse,
): DeleteAccountOutcome {
  const { status, body } = response;
  if (status === 200 && field(body, 'ok') !== false) {
    return { kind: 'deleted' };
  }
  if (status === 409 && (field(body, 'error') === 'last_admin' || field(body, 'code') === 'last_admin')) {
    return { kind: 'lastAdmin', message: DELETE_ACCOUNT_MESSAGES.lastAdmin };
  }
  if (status === 401) {
    return { kind: 'unauthorized' };
  }
  return { kind: 'retry', message: DELETE_ACCOUNT_MESSAGES.retry };
}

// Keys of AsyncStorage that belong to the user (their id is part of the key:
// offline queue, migration marks, preferences) plus the old global ones.
export const LEGACY_GLOBAL_KEYS = [
  'athelete_favorite_workouts',
  'athelete_favorite_exercises',
];

export function userScopedKeys(keys: readonly string[], userId: string): string[] {
  return keys.filter(
    key => key.includes(userId) || LEGACY_GLOBAL_KEYS.includes(key),
  );
}
