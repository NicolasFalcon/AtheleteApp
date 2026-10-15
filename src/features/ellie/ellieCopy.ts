import type { EllieErrorCode } from '@app/services/ellie/ellieService';

// What ELLIE says when something fails (STATE_08), es / en. Safe wording only:
// no codes, no provider names, no internals.
export type EllieLanguage = 'es' | 'en';

export type EllieFailure = {
  code: EllieErrorCode;
  used?: number;
  limit?: number;
};

// How the failure affects the composer and the screen.
//  - 'limit': the day's quota is used up, the composer stays inactive.
//  - 'offline': no connection, the composer stays inactive until retrying.
//  - 'login': the session is gone (back to the sign-in).
//  - 'retry': a plain failure; the message stays with "Reintentar".
export type FailureEffect = 'limit' | 'offline' | 'login' | 'retry';

export function failureEffect(code: EllieErrorCode): FailureEffect {
  switch (code) {
    case 'daily_limit':
    case 'daily_image_limit':
      return 'limit';
    case 'offline':
      return 'offline';
    case 'unauthorized':
      return 'login';
    default:
      return 'retry';
  }
}

// Failures that no retry can fix: the message stays as it is, without
// "Reintentar".
export function isRetryable(code: EllieErrorCode): boolean {
  return !(
    code === 'daily_limit' ||
    code === 'daily_image_limit' ||
    code === 'unauthorized' ||
    code === 'ai_credits_exhausted' ||
    code === 'invalid_input'
  );
}

const SERVER: Record<EllieLanguage, string> = {
  es: 'No pude responderte ahora. Tus datos están a salvo; inténtalo de nuevo en unos segundos.',
  en: "I couldn't answer just now. Your data is safe; please try again in a few seconds.",
};

export function ellieErrorLine(failure: EllieFailure, language: EllieLanguage): string {
  const es = language === 'es';
  const counts =
    failure.used !== undefined && failure.limit !== undefined
      ? { used: failure.used, limit: failure.limit }
      : null;
  switch (failure.code) {
    case 'daily_limit':
      return es
        ? `Hoy llegamos al límite de mensajes${counts ? ` (${counts.used} de ${counts.limit})` : ''}. Se reinicia mañana y seguimos.`
        : `We've reached today's message limit${counts ? ` (${counts.used} of ${counts.limit})` : ''}. It resets tomorrow and we'll pick it up then.`;
    case 'daily_image_limit':
      return es
        ? `Hoy llegamos al límite de fotos que puedo analizar${counts ? ` (${counts.used} de ${counts.limit})` : ''}. Se reinicia mañana.`
        : `We've reached today's photo analysis limit${counts ? ` (${counts.used} of ${counts.limit})` : ''}. It resets tomorrow.`;
    case 'unauthorized':
      return es
        ? 'Tu sesión caducó. Inicia sesión de nuevo para seguir hablando conmigo.'
        : 'Your session expired. Sign in again to keep talking with me.';
    case 'rate_limited':
      return es
        ? 'Hay mucha gente hablando conmigo ahora mismo. Espera un momento y vuelve a intentarlo.'
        : 'Lots of people are talking to me right now. Wait a moment and try again.';
    case 'ai_credits_exhausted':
      return es
        ? 'Ahora mismo no puedo responder. Inténtalo más tarde.'
        : "I can't answer right now. Please try again later.";
    case 'invalid_input':
      return es
        ? 'No pude entender ese mensaje. Escríbelo de nuevo (hasta 4000 caracteres).'
        : "I couldn't make sense of that message. Please write it again (up to 4000 characters).";
    case 'offline':
      return es
        ? 'Ahora mismo no puedo conectarme. Tus datos están a salvo; te respondo en cuanto vuelva la red.'
        : "I can't connect right now. Your data is safe; I'll answer as soon as the connection is back.";
    case 'image_too_large':
    case 'image_type':
    case 'image_forbidden':
    case 'image_not_found':
      return es
        ? 'No pude usar esa foto. Prueba con otra.'
        : "I couldn't use that photo. Try another one.";
    default:
      // ai_unavailable, ai_forbidden, duplicate_in_progress, internal…
      return SERVER[language];
  }
}

export function normalizeLanguage(value: unknown): EllieLanguage {
  return value === 'en' ? 'en' : 'es';
}

// Greeting and quick prompts keep the app's Spanish copy; the language of the
// answers is decided by the server from profiles.language.
