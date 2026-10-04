import {
  DELETE_ACCOUNT_MESSAGES,
  mapDeleteAccountResponse,
  userScopedKeys,
} from '@app/features/profile/deleteAccountModel';

describe('delete account responses (BT-30)', () => {
  it('200 {ok:true} → deleted', () => {
    expect(mapDeleteAccountResponse({ status: 200, body: { ok: true } })).toEqual({ kind: 'deleted' });
    // Idempotent: a repeated call also answers ok.
    expect(mapDeleteAccountResponse({ status: 200, body: null })).toEqual({ kind: 'deleted' });
    expect(mapDeleteAccountResponse({ status: 200, body: { ok: false } }).kind).toBe('retry');
  });

  it('409 last_admin → message and stay signed in', () => {
    expect(mapDeleteAccountResponse({ status: 409, body: { error: 'last_admin' } })).toEqual({
      kind: 'lastAdmin',
      message: DELETE_ACCOUNT_MESSAGES.lastAdmin,
    });
    // Another 409 is not "last admin".
    expect(mapDeleteAccountResponse({ status: 409, body: { error: 'other' } }).kind).toBe('retry');
  });

  it('401 → unauthorized (sign out)', () => {
    expect(mapDeleteAccountResponse({ status: 401, body: { error: 'unauthorized' } })).toEqual({ kind: 'unauthorized' });
  });

  it('500 and no connection → retry', () => {
    expect(mapDeleteAccountResponse({ status: 500, body: { ok: false, step: 'storage' } })).toEqual({
      kind: 'retry',
      message: DELETE_ACCOUNT_MESSAGES.retry,
    });
    expect(mapDeleteAccountResponse({ status: null, body: null }).kind).toBe('retry');
  });
});

describe('local data of the user', () => {
  it('picks the keys that carry the user id and the old global ones', () => {
    const keys = [
      '@athelete/session-outbox-v1:u1',
      '@athelete/favorites-migrated-v1:u1',
      '@athelete/session-outbox-v1:u2',
      '@athelete/theme-mode',
      'athelete_favorite_workouts',
    ];
    expect(userScopedKeys(keys, 'u1')).toEqual([
      '@athelete/session-outbox-v1:u1',
      '@athelete/favorites-migrated-v1:u1',
      'athelete_favorite_workouts',
    ]);
  });
});
