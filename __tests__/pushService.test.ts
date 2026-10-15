import { createPushRegistration, signOutAfterUnregister } from '../src/features/push/pushRegistration';
import { applyPatch, inQuietHours, mergePatches, stepHour } from '../src/features/push/pushPrefsModel';
import { permissionOf, shouldPrompt } from '../src/features/push/pushPermission';
import { mergeNotificationPrefs } from '../src/services/supabase/profile';
import {
  createPushService,
  DEFAULT_PUSH_PREFS,
  diffPrefs,
  parsePushPrefs,
  PushError,
  setPrefsArgs,
} from '../src/services/push/pushService';

describe('register / unregister the token', () => {
  it('register_push_token is called with the env, locale and platform ios', async () => {
    const rpc = jest.fn(async () => ({ ok: true, id: 't1' }));
    const service = createPushService(rpc);
    await service.registerToken({ token: 'ab'.repeat(32), env: 'sandbox', locale: 'es' });
    expect(rpc).toHaveBeenCalledWith('register_push_token', {
      _token: 'ab'.repeat(32), _apns_env: 'sandbox', _app_version: null, _locale: 'es', _platform: 'ios',
    });
  });

  it('maps the errors of the contract', async () => {
    const service = createPushService(async () => ({ ok: false, error: 'invalid_token' }));
    await expect(service.registerToken({ token: 'x', env: 'sandbox' })).rejects.toMatchObject({ code: 'invalid_token' });
    await expect(createPushService(async () => ({ ok: false, error: 'weird' })).unregisterToken('x')).rejects.toBeInstanceOf(PushError);
  });

  it('registers at launch and with each new token', async () => {
    const register = jest.fn(async () => ({}));
    const registration = createPushRegistration({
      getToken: async () => 'tok-1', register, unregister: async () => undefined,
      env: 'production', appVersion: null, getLocale: () => 'en',
    });
    expect(await registration.sync()).toBe(true);
    expect(await registration.sync('tok-2')).toBe(true);
    expect(register.mock.calls.map(call => (call as unknown[])[0])).toEqual([
      { token: 'tok-1', env: 'production', appVersion: null, locale: 'en' },
      { token: 'tok-2', env: 'production', appVersion: null, locale: 'en' },
    ]);
  });

  it('without a token (no permission) it registers nothing and does not fail', async () => {
    const register = jest.fn();
    const registration = createPushRegistration({
      getToken: async () => null, register, unregister: async () => undefined,
      env: 'sandbox', appVersion: null, getLocale: () => null,
    });
    expect(await registration.sync()).toBe(false);
    expect(register).not.toHaveBeenCalled();
  });

  it('unregister_push_token goes BEFORE the session closes, and a failure does not block it', async () => {
    const order: string[] = [];
    const registration = createPushRegistration({
      getToken: async () => 'tok-1',
      register: async () => ({}),
      unregister: async token => {
        order.push(`unregister:${token}`);
        throw new Error('offline');
      },
      env: 'sandbox', appVersion: null, getLocale: () => null,
    });
    await registration.sync();
    const result = await signOutAfterUnregister(
      () => registration.unregister(),
      async () => {
        order.push('signOut');
        return { error: null };
      },
    );
    expect(order).toEqual(['unregister:tok-1', 'signOut']);
    expect(result).toEqual({ error: null });
  });
});

describe('set_push_prefs: only what changes', () => {
  it('sends only the fields of the patch', () => {
    expect(setPrefsArgs({ social: false })).toEqual({ _social: false });
    expect(setPrefsArgs({ quietStart: 23, quietEnd: 7 })).toEqual({ _quiet_start: 23, _quiet_end: 7 });
    expect(setPrefsArgs({ quietEnabled: true, challenges: true })).toEqual({ _challenges: true, _quiet_enabled: true });
  });

  it('the diff between the current prefs and the new ones is the patch', () => {
    const next = applyPatch(DEFAULT_PUSH_PREFS, { social: false, quietEnd: 9 });
    expect(diffPrefs(DEFAULT_PUSH_PREFS, next)).toEqual({ social: false, quietEnd: 9 });
    expect(diffPrefs(DEFAULT_PUSH_PREFS, DEFAULT_PUSH_PREFS)).toEqual({});
  });

  it('a burst of changes goes as one call with the last value of each field', async () => {
    const rpc = jest.fn(async () => ({ ok: true, notification_prefs: { push: { social: false, quiet_hours: { enabled: true, start: 23, end: 8 } } } }));
    const patch = mergePatches(mergePatches({ quietStart: 23 }, { quietStart: 0 }), { social: false });
    const saved = await createPushService(rpc).setPrefs(patch);
    expect(rpc).toHaveBeenCalledWith('set_push_prefs', { _quiet_start: 0, _social: false });
    expect(saved.quietHours.start).toBe(23);
    expect(saved.social).toBe(false);
  });

  it('invalid_hours comes back as an error', async () => {
    const service = createPushService(async () => ({ ok: false, error: 'invalid_hours' }));
    await expect(service.setPrefs({ quietStart: 5 })).rejects.toMatchObject({ code: 'invalid_hours' });
  });

  it('missing keys are the defaults of the contract', () => {
    expect(parsePushPrefs({ workouts: true })).toEqual(DEFAULT_PUSH_PREFS);
    expect(parsePushPrefs(null)).toEqual(DEFAULT_PUSH_PREFS);
    expect(parsePushPrefs({ push: { social: false, quiet_hours: { start: 30 } } }).quietHours).toEqual({ enabled: true, start: 22, end: 8 });
  });

  it('saving the three switches of Ajustes keeps the push key', () => {
    const merged = mergeNotificationPrefs(
      { workouts: true, hydration: true, updates: false, push: { social: false } },
      { workouts: false, hydration: true, updates: false },
    );
    expect(merged).toEqual({ workouts: false, hydration: true, updates: false, push: { social: false } });
    expect(mergeNotificationPrefs(null, { workouts: true, hydration: true, updates: false })).toEqual({
      workouts: true, hydration: true, updates: false,
    });
  });
});

describe('mark_notifications_read', () => {
  it('null marks all, and unread is the badge', async () => {
    const rpc = jest.fn(async () => ({ ok: true, marked: 3, unread: 0 }));
    const service = createPushService(rpc);
    expect(await service.markRead(null)).toEqual({ marked: 3, unread: 0 });
    expect(rpc).toHaveBeenCalledWith('mark_notifications_read', { _ids: null });
    await service.markRead(['a', 'b']);
    expect(rpc).toHaveBeenLastCalledWith('mark_notifications_read', { _ids: ['a', 'b'] });
  });
});

describe('permission and quiet hours', () => {
  it('reads the system status', () => {
    expect(permissionOf({ status: 'granted', granted: true })).toBe('granted');
    expect(permissionOf({ status: 'undetermined', granted: false, ios: { status: 0 } })).toBe('undetermined');
    expect(permissionOf({ status: 'denied', granted: false, ios: { status: 1 } })).toBe('denied');
    expect(permissionOf({ granted: false, ios: { status: 3 } })).toBe('granted');
  });

  it('the pre-permission screen only comes up once, never after a denial, never before onboarding ends', () => {
    const base = { permission: 'undetermined', alreadyAsked: false, onboardingCompleted: true } as const;
    expect(shouldPrompt(base)).toBe(true);
    expect(shouldPrompt({ ...base, alreadyAsked: true })).toBe(false);
    expect(shouldPrompt({ ...base, permission: 'denied' })).toBe(false);
    expect(shouldPrompt({ ...base, permission: 'granted' })).toBe(false);
    expect(shouldPrompt({ ...base, onboardingCompleted: false })).toBe(false);
  });

  it('quiet hours that cross midnight, and the hour stepper', () => {
    const quiet = { enabled: true, start: 22, end: 8 };
    expect([23, 0, 7, 8, 12, 21, 22].map(hour => inQuietHours(quiet, hour))).toEqual([true, true, true, false, false, false, true]);
    expect(inQuietHours({ ...quiet, enabled: false }, 23)).toBe(false);
    expect(stepHour(23, 1)).toBe(0);
    expect(stepHour(0, -1)).toBe(23);
  });
});
