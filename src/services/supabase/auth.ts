import type { AuthError } from '@supabase/supabase-js';
import { env } from '@app/lib/config/env';
import {
  getSupabaseClient,
  isSupabaseConfigured,
} from '@app/services/supabase/client';

type AuthResult = {
  error: AuthError | Error | null;
};

function createConfigurationError(): Error {
  return new Error(
    'Supabase no está configurado. Agrega SUPABASE_URL y SUPABASE_ANON_KEY en tu archivo .env.',
  );
}

function normalizeAuthError(error: AuthError | Error | null): AuthError | Error | null {
  if (!error) {
    return null;
  }

  const message = error.message.toLowerCase();

  if (message.includes('invalid login credentials')) {
    return new Error('Correo o contraseña incorrectos.');
  }

  if (message.includes('email not confirmed')) {
    return new Error(
      'Tu correo aún no está verificado. Revisa tu bandeja de entrada antes de iniciar sesión.',
    );
  }

  if (message.includes('user already registered')) {
    return new Error('Ya existe una cuenta con este correo.');
  }

  if (
    message.includes('password should be at least') ||
    message.includes('password is too short')
  ) {
    return new Error('La contraseña debe tener al menos 6 caracteres.');
  }

  if (
    message.includes('unable to validate email address') ||
    message.includes('invalid email')
  ) {
    return new Error('Ingresa un correo válido.');
  }

  if (message.includes('signup is disabled')) {
    return new Error('El registro está deshabilitado en Supabase.');
  }

  if (
    message.includes('fetch failed') ||
    message.includes('network request failed') ||
    message.includes('network error')
  ) {
    return new Error(
      'No se pudo conectar con Supabase. Revisa tu conexión o la configuración del proyecto.',
    );
  }

  return error;
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<AuthResult> {
  const client = getSupabaseClient();

  if (!client) {
    return {error: createConfigurationError()};
  }

  const {error} = await client.auth.signInWithPassword({email, password});

  return {error: normalizeAuthError(error)};
}

export async function registerWithEmail(
  name: string,
  email: string,
  password: string,
): Promise<AuthResult> {
  const client = getSupabaseClient();

  if (!client) {
    return {error: createConfigurationError()};
  }

  const {error} = await client.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
    },
  });

  return {error: normalizeAuthError(error)};
}

export async function sendPasswordReset(email: string): Promise<AuthResult> {
  const client = getSupabaseClient();

  if (!client) {
    return {error: createConfigurationError()};
  }

  const {error} = await client.auth.resetPasswordForEmail(email, {
    redirectTo: env.supabase.passwordResetUrl || undefined,
  });

  return {error: normalizeAuthError(error)};
}

export async function updatePassword(password: string): Promise<AuthResult> {
  const client = getSupabaseClient();

  if (!client) {
    return {error: createConfigurationError()};
  }

  const {error} = await client.auth.updateUser({password});

  return {error: normalizeAuthError(error)};
}

export async function signOut(): Promise<AuthResult> {
  const client = getSupabaseClient();

  if (!client && !isSupabaseConfigured) {
    return {error: null};
  }

  const {error} = await client!.auth.signOut();

  return {error: normalizeAuthError(error)};
}
