import {
  ModerationError,
  MODERATION_ERROR_COPY,
  actionLabel,
  allowedActions,
  isValidAction,
  moderationFailure,
  openQueue,
  parseModerationTarget,
  validActionsFor,
  type ModerationAction,
  type ModerationQueueRow,
  type ModerationTarget,
} from '../src/features/social/moderationModel';

const row = (extra: Partial<ModerationQueueRow>): ModerationQueueRow => ({
  target_type: 'post',
  target_id: 't1',
  author_id: 'u1',
  author_username: 'carlos',
  body: 'texto',
  photo_path: null,
  post_id: 't1',
  post_type: 'photo',
  open_reports: 2,
  reasons: ['spam', 'spam'],
  first_reported_at: '2026-10-07T10:00:00Z',
  last_reported_at: '2026-10-07T11:00:00Z',
  hidden_at: null,
  removed_at: null,
  author_prior_removals: 1,
  ...extra,
});

describe('valid moderation actions by kind of content', () => {
  const ALL: ModerationAction[] = ['restore', 'remove', 'dismiss'];

  it('post and comment: restore or remove; never dismiss', () => {
    (['post', 'comment'] as ModerationTarget[]).forEach(target => {
      expect(validActionsFor(target)).toEqual(['restore', 'remove']);
      expect(isValidAction(target, 'restore')).toBe(true);
      expect(isValidAction(target, 'remove')).toBe(true);
      // dismiss → invalid_action_for_content on the server
      expect(isValidAction(target, 'dismiss')).toBe(false);
    });
  });

  it('user: dismiss only', () => {
    expect(validActionsFor('user')).toEqual(['dismiss']);
    expect(ALL.filter(action => isValidAction('user', action))).toEqual(['dismiss']);
    // remove → invalid_action_for_user on the server
    expect(isValidAction('user', 'remove')).toBe(false);
  });

  it('the screen offers exactly those, and only to a moderator', () => {
    expect(allowedActions(row({}), 'moderator')).toEqual(['restore', 'remove']);
    expect(allowedActions(row({ target_type: 'comment' }), 'admin')).toEqual(['restore', 'remove']);
    expect(allowedActions(row({ target_type: 'user' }), 'moderator')).toEqual(['dismiss']);
    expect(allowedActions(row({}), null)).toEqual([]);
    expect(allowedActions(row({ removed_at: '2026-10-07T12:00:00Z' }), 'moderator')).toEqual([]);
  });

  it('reads the target type defensively', () => {
    expect(parseModerationTarget('comment')).toBe('comment');
    expect(parseModerationTarget('user')).toBe('user');
    expect(parseModerationTarget(null)).toBe('post');
    expect(parseModerationTarget('other')).toBe('post');
  });

  it('labels restore as keeping the content when it is only reported', () => {
    expect(actionLabel('restore', { hidden_at: '2026-10-07T10:00:00Z' })).toBe('Restaurar');
    expect(actionLabel('restore', { hidden_at: null })).toBe('Mantener y cerrar reportes');
    expect(actionLabel('remove', { hidden_at: null })).toBe('Retirar');
  });

  it('keeps the order of the view and drops removed rows', () => {
    const rows = [row({ target_id: 'b' }), row({ target_id: 'x', removed_at: '2026-10-07T12:00:00Z' }), row({ target_id: 'a' })];
    expect(openQueue(rows).map(item => item.target_id)).toEqual(['b', 'a']);
  });
});

describe('errors of moderate_content', () => {
  it('is fine on {ok:true}', () => {
    expect(moderationFailure({ ok: true })).toBeNull();
  });

  it('maps the refusals of the server', () => {
    expect(moderationFailure({ ok: false, error: 'invalid_arguments' })).toBe('invalid_arguments');
    expect(moderationFailure({ ok: false, error: 'invalid_action_for_content' })).toBe('invalid_action');
    expect(moderationFailure({ ok: false, error: 'invalid_action_for_user' })).toBe('invalid_action');
    expect(moderationFailure({ ok: false, error: 'new_thing' })).toBe('unknown');
    expect(moderationFailure(null)).toBe('unknown');
  });

  it('sends not_moderator to "No tienes acceso"', () => {
    expect(moderationFailure(null, { message: 'not_moderator' })).toBe('not_moderator');
    expect(moderationFailure(null, { message: 'x', details: 'not_moderator' })).toBe('not_moderator');
    expect(MODERATION_ERROR_COPY.not_moderator).toBe('No tienes acceso');
    expect(new ModerationError('not_moderator').kind).toBe('not_moderator');
    expect(moderationFailure(null, { message: 'network down' })).toBe('unknown');
  });

  it('has copy for every kind', () => {
    (['not_moderator', 'invalid_arguments', 'invalid_action', 'unknown'] as const).forEach(kind => {
      expect(MODERATION_ERROR_COPY[kind].length).toBeGreaterThan(0);
    });
  });
});
