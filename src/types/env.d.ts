declare module '@env' {
  export const APP_ENV: 'development' | 'staging' | 'production';
  export const SUPABASE_URL: string;
  export const SUPABASE_ANON_KEY: string;
  export const SUPABASE_PASSWORD_RESET_URL: string;
  // Meta's public App ID (Instagram Stories sharing).
  export const META_APP_ID: string | undefined;
}
