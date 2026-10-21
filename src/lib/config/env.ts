import {
  APP_ENV,
  META_APP_ID,
  SUPABASE_ANON_KEY,
  SUPABASE_PASSWORD_RESET_URL,
  SUPABASE_URL,
} from '@env';

type AppEnvironment = 'development' | 'staging' | 'production' | 'test';

function normalizeEnvironment(value?: string): AppEnvironment {
  if (value === 'staging' || value === 'production' || value === 'test') {
    return value;
  }

  return 'development';
}

function hasValue(value?: string): boolean {
  return Boolean(value && value.trim().length > 0);
}

export const env = {
  appEnv: normalizeEnvironment(APP_ENV),
  supabase: {
    url: SUPABASE_URL ?? '',
    anonKey: SUPABASE_ANON_KEY ?? '',
    passwordResetUrl: SUPABASE_PASSWORD_RESET_URL ?? '',
    isConfigured: hasValue(SUPABASE_URL) && hasValue(SUPABASE_ANON_KEY),
  },
  // Instagram Stories (handoff v2.16 §26). Empty: Stories is not offered.
  metaAppId: hasValue(META_APP_ID) ? (META_APP_ID as string).trim() : '',
};
