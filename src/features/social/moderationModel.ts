import type { Tables } from '@app/types/supabase';

// Pure model of the moderation panel (tanda C). Backend: `app_moderators`,
// the `moderation_queue` view and `moderate_content` (SOCIAL_SCHEMA_PROPOSAL
// §4.13). The panel exists only for moderators: the UI asks `is_moderator()`
// and RLS enforces it; nothing here grants access.

export type ModerationQueueRow = Tables<'moderation_queue'>;
export type ModerationActionRow = Tables<'moderation_actions'>;

export type ModeratorRole = 'moderator' | 'admin';
export type ModerationTarget = 'post' | 'comment' | 'user';
export type ModerationAction = 'restore' | 'remove' | 'dismiss';

export function parseModeratorRole(value: string | null | undefined): ModeratorRole | null {
  return value === 'moderator' || value === 'admin' ? value : null;
}

export type ModeratorPermissions = {
  canSeePanel: boolean;
  canModerate: boolean;
  // Only an admin manages other moderators (`set_moderator`).
  canManageModerators: boolean;
};

// No role, no panel: a normal user gets every permission false.
export function moderatorPermissions(role: ModeratorRole | null): ModeratorPermissions {
  return {
    canSeePanel: role !== null,
    canModerate: role !== null,
    canManageModerators: role === 'admin',
  };
}

export type QueueState = 'hidden' | 'removed' | 'open';

export function queueState(
  item: Pick<ModerationQueueRow, 'hidden_at' | 'removed_at'>,
): QueueState {
  if (item.removed_at) {
    return 'removed';
  }
  return item.hidden_at ? 'hidden' : 'open';
}

// The view `moderation_queue` already comes ordered (not hidden first, then
// more reports): the app keeps that order and only drops what is already
// removed.
export function openQueue(items: ModerationQueueRow[]): ModerationQueueRow[] {
  return items.filter(item => queueState(item) !== 'removed');
}

// The order of the view, for the sample data (never applied to real rows):
// not hidden first, more open reports first, the one that waited longest.
export function serverQueueOrder(items: ModerationQueueRow[]): ModerationQueueRow[] {
  return [...items].sort((a, b) => {
    const hidden = Number(Boolean(a.hidden_at)) - Number(Boolean(b.hidden_at));
    if (hidden !== 0) {
      return hidden;
    }
    const reports = (b.open_reports ?? 0) - (a.open_reports ?? 0);
    if (reports !== 0) {
      return reports;
    }
    return (a.first_reported_at ?? '').localeCompare(b.first_reported_at ?? '');
  });
}

// What `moderate_content` accepts per kind of content: a post or a comment can
// be restored (also when it is only reported: the reports close as dismissed)
// or removed; a user report can only be dismissed. Anything else is
// invalid_action_for_content / invalid_action_for_user on the server.
export function validActionsFor(target: ModerationTarget): ModerationAction[] {
  return target === 'user' ? ['dismiss'] : ['restore', 'remove'];
}

export function isValidAction(target: ModerationTarget, action: ModerationAction): boolean {
  return validActionsFor(target).includes(action);
}

export function parseModerationTarget(value: string | null | undefined): ModerationTarget {
  return value === 'comment' || value === 'user' ? value : 'post';
}

// What the screen offers for a queue row: the actions valid for its type, and
// nothing for what is already removed or for a non-moderator.
export function allowedActions(
  item: Pick<ModerationQueueRow, 'target_type' | 'hidden_at' | 'removed_at'>,
  role: ModeratorRole | null,
): ModerationAction[] {
  if (!moderatorPermissions(role).canModerate || item.removed_at) {
    return [];
  }
  return validActionsFor(parseModerationTarget(item.target_type));
}

// "Restaurar" brings back what is hidden; on content that is only reported it
// keeps it and closes the reports.
export function actionLabel(
  action: ModerationAction,
  item: Pick<ModerationQueueRow, 'hidden_at'>,
): string {
  if (action === 'restore' && !item.hidden_at) {
    return 'Mantener y cerrar reportes';
  }
  return ACTION_LABEL[action];
}

// ── Errors of moderate_content ─────────────────────────────────────────────
export type ModerationErrorKind =
  | 'not_moderator'
  | 'invalid_arguments'
  | 'invalid_action'
  | 'unknown';

export class ModerationError extends Error {
  constructor(public kind: ModerationErrorKind) {
    super(`Moderación: ${kind}`);
    this.name = 'ModerationError';
  }
}

function kindFromCode(code: unknown): ModerationErrorKind | null {
  if (typeof code !== 'string') {
    return null;
  }
  if (code === 'not_moderator' || code === 'invalid_arguments') {
    return code;
  }
  return code.startsWith('invalid_action_for_') ? 'invalid_action' : null;
}

// The RPC answers {ok:true}, {ok:false, error} or raises not_moderator
// (P0001 / HTTP 400, the code in `message`). null = it worked.
export function moderationFailure(
  data: unknown,
  error?: { message?: string; details?: string | null; hint?: string | null } | null,
): ModerationErrorKind | null {
  if (error) {
    const text = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`;
    if (text.includes('not_moderator')) {
      return 'not_moderator';
    }
    if (text.includes('invalid_arguments')) {
      return 'invalid_arguments';
    }
    return text.includes('invalid_action_for_') ? 'invalid_action' : 'unknown';
  }
  const body = (data ?? null) as { ok?: unknown; error?: unknown } | null;
  if (body?.ok === true) {
    return null;
  }
  return kindFromCode(body?.error) ?? 'unknown';
}

export const MODERATION_ERROR_COPY: Record<ModerationErrorKind, string> = {
  not_moderator: 'No tienes acceso',
  invalid_arguments: 'Los datos de la acción no son válidos',
  invalid_action: 'Esa acción no se puede aplicar a este tipo de contenido',
  unknown: 'No se pudo aplicar la acción',
};

export const NOTE_MAX = 500;

export function validateNote(
  note: string,
): { ok: true; note: string | null } | { ok: false } {
  const clean = note.trim();
  return clean.length > NOTE_MAX ? { ok: false } : { ok: true, note: clean || null };
}

export const ACTION_LABEL: Record<ModerationAction, string> = {
  restore: 'Restaurar',
  remove: 'Retirar',
  dismiss: 'Descartar reportes',
};

export const ACTION_DONE: Record<ModerationAction, string> = {
  restore: 'Contenido restaurado',
  remove: 'Contenido retirado',
  dismiss: 'Reportes descartados',
};

export const REASON_LABEL: Record<string, string> = {
  spam: 'Spam',
  harassment: 'Acoso',
  nudity: 'Desnudos',
  violence: 'Violencia',
  self_harm: 'Autolesiones',
  other: 'Otro',
};

export const TARGET_LABEL: Record<ModerationTarget, string> = {
  post: 'Publicación',
  comment: 'Comentario',
  user: 'Usuario',
};
