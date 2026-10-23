import type { Session } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { appleFullName, isSocialCancel } from '@app/features/auth/socialSignIn';
import { getSupabaseClient } from '@app/services/supabase/client';

// Iniciar sesión / crear cuenta con Apple (docs/backend/AUTH_SHAPES.md).
// 1. A random nonce: Apple gets its SHA-256, Supabase the original.
// 2. signInWithIdToken({ provider: 'apple', token, nonce }).
// 3. The name, only the first time and only if profiles.name is empty.
// 4. apple-token-exchange with the authorization code, in the background
//    (fire-and-forget: it never blocks nor shows anything).

export type AppleSignInResult =
  | { status: 'cancelled' }
  | { status: 'signedIn'; session: Session; nameSaved: boolean };

export function appleSignInAvailable(): Promise<boolean> {
  return AppleAuthentication.isAvailableAsync().catch(() => false);
}

function randomNonce(): string {
  return Array.from(Crypto.getRandomBytes(32), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function signInWithApple(): Promise<AppleSignInResult> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase no está configurado.');
  }

  const nonce = randomNonce();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (error) {
    if (isSocialCancel(error)) {
      return { status: 'cancelled' };
    }
    throw error;
  }

  if (!credential.identityToken) {
    throw new Error('Apple no devolvió un identity token.');
  }

  const { data, error } = await client.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce,
  });
  if (error || !data.session) {
    throw error ?? new Error('No se pudo iniciar la sesión.');
  }
  const session = data.session;

  // In the background: the refresh token for the revocation on delete.
  if (credential.authorizationCode) {
    exchangeAppleCode(credential.authorizationCode);
  }

  // Apple sends the name only the first time: keep it if the profile has none.
  let nameSaved = false;
  const name = appleFullName(credential.fullName);
  if (name) {
    try {
      const { data: profile } = await client
        .from('profiles')
        .select('name')
        .eq('id', session.user.id)
        .maybeSingle();
      const current = (profile as { name?: string | null } | null)?.name?.trim() ?? '';
      if (!current) {
        const { error: updateError } = await (client.from('profiles') as any)
          .update({ name })
          .eq('id', session.user.id);
        nameSaved = !updateError;
      }
    } catch (nameError) {
      if (__DEV__) {
        console.warn('[apple] No se pudo guardar el nombre:', nameError);
      }
    }
  }

  return { status: 'signedIn', session, nameSaved };
}

// POST /functions/v1/apple-token-exchange (AUTH_SHAPES): never awaited by
// the sign-in; a failure is only logged in development.
function exchangeAppleCode(authorizationCode: string) {
  const client = getSupabaseClient();
  if (!client) {
    return;
  }
  client.functions
    .invoke('apple-token-exchange', { method: 'POST', body: { authorization_code: authorizationCode } })
    .then(({ data, error }) => {
      if (__DEV__ && (error || (data as { ok?: boolean } | null)?.ok === false)) {
        console.warn('[apple] apple-token-exchange:', error?.message ?? JSON.stringify(data));
      }
    })
    .catch(error => {
      if (__DEV__) {
        console.warn('[apple] apple-token-exchange falló:', error);
      }
    });
}
