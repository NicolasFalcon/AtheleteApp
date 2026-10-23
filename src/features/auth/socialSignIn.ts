// Iniciar sesión con Apple (docs/backend/AUTH_SHAPES.md): the pure rules —
// the name Apple gives only the first time, a cancel that is not an error,
// and the v2 texts (es / en) of the rest. Google will add its provider here.

export type SocialProvider = 'apple';
export type SocialLanguage = 'es' | 'en';

// Before sign-in there is no profile: the device's language decides.
export function deviceLanguage(): SocialLanguage {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase().startsWith('en') ? 'en' : 'es';
  } catch {
    return 'es';
  }
}

// "Nicolás Falcón" from ASAuthorization's fullName (null when Apple sends
// nothing: every time after the first one).
export function appleFullName(
  fullName: { givenName?: string | null; middleName?: string | null; familyName?: string | null } | null | undefined,
): string | null {
  if (!fullName) {
    return null;
  }
  const name = [fullName.givenName, fullName.middleName, fullName.familyName]
    .map(part => part?.trim())
    .filter(Boolean)
    .join(' ');
  return name || null;
}

// The person closed the Apple sheet: nothing is shown.
export function isSocialCancel(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return code === 'ERR_REQUEST_CANCELED' || code === 'ERR_CANCELED';
}

export type SocialErrorKind = 'unavailable' | 'network' | 'not_configured' | 'unknown';

export function socialErrorKind(error: unknown): SocialErrorKind {
  const code = (error as { code?: unknown } | null)?.code;
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (code === 'ERR_REQUEST_NOT_HANDLED' || code === 'ERR_UNAVAILABLE' || message.includes('not available')) {
    return 'unavailable';
  }
  if (message.includes('network') || message.includes('fetch failed')) {
    return 'network';
  }
  if (message.includes('supabase no está configurado') || message.includes('provider is not enabled')) {
    return 'not_configured';
  }
  return 'unknown';
}

const COPY: Record<SocialLanguage, { divider: string; errors: Record<SocialErrorKind, string> }> = {
  es: {
    divider: 'o con tu correo',
    errors: {
      unavailable: 'Iniciar sesión con Apple no está disponible en este dispositivo.',
      network: 'No pudimos conectar. Revisa tu conexión e inténtalo otra vez.',
      not_configured: 'Iniciar sesión con Apple no está disponible ahora mismo. Usa tu correo.',
      unknown: 'No pudimos iniciar sesión con Apple. Inténtalo otra vez.',
    },
  },
  en: {
    divider: 'or with your email',
    errors: {
      unavailable: 'Sign in with Apple is not available on this device.',
      network: "We couldn't connect. Check your connection and try again.",
      not_configured: 'Sign in with Apple is not available right now. Use your email.',
      unknown: "We couldn't sign you in with Apple. Try again.",
    },
  },
};

export function socialCopy(language: SocialLanguage) {
  return COPY[language];
}
