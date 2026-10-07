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

// Hidden first (they are off for everyone), then by number of open reports and
// by who has waited longest. Already removed content leaves the queue.
export function sortQueue(items: ModerationQueueRow[]): ModerationQueueRow[] {
  return items
    .filter(item => queueState(item) !== 'removed')
    .sort((a, b) => {
      const hidden = Number(Boolean(b.hidden_at)) - Number(Boolean(a.hidden_at));
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

// restore: only what is hidden; remove: posts and comments (never a user);
// dismiss: always (a user report can only be dismissed).
export function allowedActions(
  item: Pick<ModerationQueueRow, 'target_type' | 'hidden_at' | 'removed_at'>,
  role: ModeratorRole | null,
): ModerationAction[] {
  if (!moderatorPermissions(role).canModerate || item.removed_at) {
    return [];
  }
  const actions: ModerationAction[] = [];
  if (item.hidden_at && item.target_type !== 'user') {
    actions.push('restore');
  }
  if (item.target_type === 'post' || item.target_type === 'comment') {
    actions.push('remove');
  }
  actions.push('dismiss');
  return actions;
}

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
