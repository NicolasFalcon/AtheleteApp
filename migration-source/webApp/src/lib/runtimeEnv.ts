const runtimeEnv =
  typeof process !== "undefined" && process.env
    ? process.env
    : ({} as Record<string, string | undefined>);

const DEFAULT_APP_URL = "https://athelete.app";

export function getPublicEnv(name: string): string | undefined {
  if (name.startsWith("NEXT_PUBLIC_") || name.startsWith("VITE_")) {
    // For public env vars, use process.env directly, as Next.js replaces them on client
    return process.env[name];
  }
  return runtimeEnv[name];
}

export function getAppUrl(): string {
  const value = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL;
  return value.replace(/\/+$/, "");
}

export function getSupabaseUrl(): string {
  const value =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;

  if (!value) {
    throw new Error(
      "Missing Supabase URL configuration. Set NEXT_PUBLIC_SUPABASE_URL in the deployed environment and redeploy.",
    );
  }

  return value;
}

export function getSupabasePublishableKey(): string {
  const value =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!value) {
    throw new Error(
      "Missing Supabase anon/publishable key configuration. Set NEXT_PUBLIC_SUPABASE_ANON_KEY in the deployed environment and redeploy.",
    );
  }

  return value;
}

export function isDevRuntime(): boolean {
  return process.env.NODE_ENV !== "production";
}
