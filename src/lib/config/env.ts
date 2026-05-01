import {
  APP_ENV,
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
};
