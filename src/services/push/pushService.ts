import { getSupabaseClient } from '@app/services/supabase/client';

// Push notifications (docs/backend/PUSH_SHAPES.md): the RPCs the app calls
// with the user's JWT. `send-push` is never called from here.

export type ApnsEnv = 'sandbox' | 'production';

export type PushErrorCode =
  | 'unauthorized'
  | 'invalid_token'
  | 'invalid_env'
  | 'invalid_platform'
  | 'invalid_hours'
  | 'offline'
  | 'unknown';

export class PushError extends Error {
  code: PushErrorCode;
  constructor(code: PushErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'PushError';
    this.code = code;
  }
}

export type QuietHours = { enabled: boolean; start: number; end: number };

// profiles.notification_prefs.push (+ the local reminder flags). Missing keys
// are the defaults of the contract: old profiles need no migration.
export type PushPrefs = {
  social: boolean;
  challenges: boolean;
  quietHours: QuietHours;
};

export const DEFAULT_PUSH_PREFS: PushPrefs = {
  social: true,
  challenges: true,
  quietHours: { enabled: true, start: 22, end: 8 },
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const hour = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 23 ? value : fallback;

export function parsePushPrefs(notificationPrefs: unknown): PushPrefs {
  const push = asRecord(asRecord(notificationPrefs)?.push);
  const quiet = asRecord(push?.quiet_hours);
  const bool = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback);
  return {
    social: bool(push?.social, DEFAULT_PUSH_PREFS.social),
    challenges: bool(push?.challenges, DEFAULT_PUSH_PREFS.challenges),
    quietHours: {
      enabled: bool(quiet?.enabled, DEFAULT_PUSH_PREFS.quietHours.enabled),
      start: hour(quiet?.start, DEFAULT_PUSH_PREFS.quietHours.start),
      end: hour(quiet?.end, DEFAULT_PUSH_PREFS.quietHours.end),
    },
  };
}

export type PushPrefsPatch = {
  social?: boolean;
  challenges?: boolean;
  quietEnabled?: boolean;
  quietStart?: number;
  quietEnd?: number;
};

// set_push_prefs only changes what is sent: the payload has just the fields
// that changed (never the whole JSON).
export function setPrefsArgs(patch: PushPrefsPatch): Record<string, boolean | number> {
  const args: Record<string, boolean | number> = {};
  if (patch.social !== undefined) {
    args._social = patch.social;
  }
  if (patch.challenges !== undefined) {
    args._challenges = patch.challenges;
  }
  if (patch.quietEnabled !== undefined) {
    args._quiet_enabled = patch.quietEnabled;
  }
  if (patch.quietStart !== undefined) {
    args._quiet_start = patch.quietStart;
  }
  if (patch.quietEnd !== undefined) {
    args._quiet_end = patch.quietEnd;
  }
  return args;
}

// The patch with only the fields that differ from the current prefs.
export function diffPrefs(current: PushPrefs, next: PushPrefs): PushPrefsPatch {
  const patch: PushPrefsPatch = {};
  if (current.social !== next.social) {
    patch.social = next.social;
  }
  if (current.challenges !== next.challenges) {
    patch.challenges = next.challenges;
  }
  if (current.quietHours.enabled !== next.quietHours.enabled) {
    patch.quietEnabled = next.quietHours.enabled;
  }
  if (current.quietHours.start !== next.quietHours.start) {
    patch.quietStart = next.quietHours.start;
  }
  if (current.quietHours.end !== next.quietHours.end) {
    patch.quietEnd = next.quietHours.end;
  }
  return patch;
}

export type PushRpc = (name: string, args: Record<string, unknown>) => Promise<unknown>;

async function supabaseRpc(name: string, args: Record<string, unknown>): Promise<unknown> {
  const client = getSupabaseClient() as unknown as {
    rpc: (rpc: string, params: object) => Promise<{ data: unknown; error: { message?: string } | null }>;
  } | null;
  if (!client) {
    throw new PushError('unknown', 'Supabase no está configurado.');
  }
  const { data, error } = await client.rpc(name, args);
  if (error) {
    throw new PushError('offline', error.message);
  }
  return data;
}

const ERROR_CODES: readonly PushErrorCode[] = [
  'unauthorized',
  'invalid_token',
  'invalid_env',
  'invalid_platform',
  'invalid_hours',
];

function expectOk(body: unknown): Record<string, unknown> {
  const record = asRecord(body);
  if (record?.ok === true) {
    return record;
  }
  const code = ERROR_CODES.find(item => item === record?.error);
  throw new PushError(code ?? 'unknown');
}

export type RegisterTokenInput = {
  token: string;
  env: ApnsEnv;
  appVersion?: string | null;
  locale?: 'es' | 'en' | null;
};

export function createPushService(rpc: PushRpc = supabaseRpc) {
  return {
    async registerToken(input: RegisterTokenInput): Promise<string | null> {
      const record = expectOk(
        await rpc('register_push_token', {
          _token: input.token,
          _apns_env: input.env,
          _app_version: input.appVersion ?? null,
          _locale: input.locale ?? null,
          _platform: 'ios',
        }),
      );
      return typeof record.id === 'string' ? record.id : null;
    },

    async unregisterToken(token: string): Promise<void> {
      expectOk(await rpc('unregister_push_token', { _token: token }));
    },

    async setPrefs(patch: PushPrefsPatch): Promise<PushPrefs> {
      const args = setPrefsArgs(patch);
      const record = expectOk(await rpc('set_push_prefs', args));
      return parsePushPrefs(record.notification_prefs);
    },

    // `null` marks every notification as read. `unread` is the count the
    // icon badge shows.
    async markRead(ids: readonly string[] | null): Promise<{ marked: number; unread: number }> {
      const record = expectOk(await rpc('mark_notifications_read', { _ids: ids ? [...ids] : null }));
      return {
        marked: typeof record.marked === 'number' ? record.marked : 0,
        unread: typeof record.unread === 'number' ? Math.max(0, record.unread) : 0,
      };
    },
  };
}

export const pushService = createPushService();
