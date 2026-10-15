import type { EllieLanguage } from '@app/features/ellie/ellieCopy';
import type { EllieErrorCode } from '@app/services/ellie/ellieService';

// What the person sees when a photo cannot be analysed (design §23.5 for
// meals, §10 for machines), es / en. Safe wording only.
export type VisionContext = 'meal' | 'machine';

export type VisionAction =
  | 'other_photo'
  | 'quick_kcal'
  | 'retry'
  | 'dismiss'
  | 'login'
  | 'manual'
  | 'ask_ellie';

export type VisionFailureCopy = {
  title: string;
  text: string;
  // The first one is the primary button, the second the secondary.
  actions: [VisionAction, VisionAction?];
};

export type VisionFailureInput = { code: EllieErrorCode; used?: number; limit?: number };

const T = (es: string, en: string, language: EllieLanguage) => (language === 'es' ? es : en);

export function visionFailureCopy(
  input: VisionFailureInput,
  context: VisionContext,
  language: EllieLanguage,
): VisionFailureCopy {
  const meal = context === 'meal';
  const limit = input.limit;
  switch (input.code) {
    case 'not_food':
      return {
        title: T('Esto no parece comida', "This doesn't look like food", language),
        text: T(
          'No encuentro alimentos en la foto. Prueba con el plato completo, desde arriba y con buena luz.',
          "I can't find any food in the photo. Try the whole plate, from above and in good light.",
          language,
        ),
        actions: ['other_photo', 'quick_kcal'],
      };
    case 'low_confidence':
      return {
        title: T('No reconozco la máquina', "I don't recognise the machine", language),
        text: T(
          'Prueba desde un ángulo más abierto y con buena luz, con toda la máquina en el encuadre.',
          'Try a wider angle and good light, with the whole machine in the frame.',
          language,
        ),
        actions: ['other_photo', 'manual'],
      };
    case 'offline':
      return {
        title: T(
          meal ? 'No puedo analizar la foto ahora' : 'No puedo escanear ahora',
          meal ? "I can't analyse the photo right now" : "I can't scan right now",
          language,
        ),
        text: T(
          meal
            ? 'Necesito conexión para reconocer el plato. Registra solo las kcal y, cuando vuelvas a tener red, me lo pasas.'
            : 'Necesito conexión para reconocer la máquina. Inténtalo cuando vuelvas a tener red.',
          meal
            ? 'I need a connection to recognise the dish. Log just the kcal and, once you are back online, send it to me.'
            : 'I need a connection to recognise the machine. Try again once you are back online.',
          language,
        ),
        actions: meal ? ['quick_kcal', 'retry'] : ['retry', 'manual'],
      };
    case 'daily_image_limit':
    case 'daily_machine_limit':
    case 'daily_limit':
      return {
        title: limit
          ? T(
              meal ? `Has usado los ${limit} análisis de hoy` : `Has usado los ${limit} escaneos de hoy`,
              meal ? `You've used today's ${limit} analyses` : `You've used today's ${limit} scans`,
              language,
            )
          : T('Has llegado al límite de hoy', "You've reached today's limit", language),
        text: T(
          meal
            ? 'Se renuevan mañana a las 00:00. Mientras tanto, registra solo las kcal.'
            : 'Se renuevan mañana a las 00:00. Mientras tanto, elige la máquina a mano.',
          meal
            ? 'They renew tomorrow at 00:00. Meanwhile, log just the kcal.'
            : 'They renew tomorrow at 00:00. Meanwhile, pick the machine by hand.',
          language,
        ),
        actions: meal ? ['quick_kcal', 'dismiss'] : ['manual', 'dismiss'],
      };
    case 'vision_attempts_limit':
      return {
        title: T('Llegaste al tope de fotos de hoy', "You've reached today's photo limit", language),
        text: T(
          meal
            ? 'Se renueva mañana a las 00:00. Mientras tanto, registra solo las kcal.'
            : 'Se renueva mañana a las 00:00. Mientras tanto, elige la máquina a mano.',
          meal
            ? 'It renews tomorrow at 00:00. Meanwhile, log just the kcal.'
            : 'It renews tomorrow at 00:00. Meanwhile, pick the machine by hand.',
          language,
        ),
        actions: meal ? ['quick_kcal', 'dismiss'] : ['manual', 'dismiss'],
      };
    case 'rate_limited':
      return {
        title: T('ELLIE está muy solicitada', 'ELLIE is very busy', language),
        text: T(
          'Hay mucha gente usándola ahora mismo. Espera un momento e inténtalo otra vez.',
          'Lots of people are using her right now. Wait a moment and try again.',
          language,
        ),
        actions: meal ? ['retry', 'quick_kcal'] : ['retry', 'manual'],
      };
    case 'ai_credits_exhausted':
      return {
        title: T('El análisis no está disponible', 'Analysis is not available', language),
        text: T(
          'Ahora mismo no puedo analizar fotos. Inténtalo más tarde.',
          "I can't analyse photos right now. Please try again later.",
          language,
        ),
        actions: meal ? ['quick_kcal', 'dismiss'] : ['manual', 'dismiss'],
      };
    case 'unauthorized':
      return {
        title: T('Tu sesión caducó', 'Your session expired', language),
        text: T('Inicia sesión de nuevo para seguir.', 'Sign in again to continue.', language),
        actions: ['login'],
      };
    case 'invalid_input':
    case 'image_forbidden':
    case 'image_not_found':
    case 'image_too_large':
    case 'image_type':
      return {
        title: T('No pude usar esa foto', "I couldn't use that photo", language),
        text: T(
          'Prueba con otra foto, en formato normal y de menos de 5 MB.',
          'Try another photo, in a normal format and under 5 MB.',
          language,
        ),
        actions: ['other_photo', meal ? 'quick_kcal' : 'manual'],
      };
    default:
      // ai_unavailable, ai_forbidden, duplicate_in_progress, internal…
      return {
        title: T(
          meal ? 'No pude analizar la foto' : 'No pude escanear la máquina',
          meal ? "I couldn't analyse the photo" : "I couldn't scan the machine",
          language,
        ),
        text: T(
          'Algo falló de nuestro lado. Tu foto sigue aquí; inténtalo otra vez.',
          'Something went wrong on our side. Your photo is still here; try again.',
          language,
        ),
        actions: ['retry', meal ? 'quick_kcal' : 'manual'],
      };
  }
}

// "Quedan 2 análisis con foto hoy": only when 3 or fewer are left.
export const LOW_QUOTA_AT = 3;

export function remainingAnalyses(used: number, limit: number): number | null {
  if (limit <= 0) {
    return null;
  }
  const left = Math.max(0, limit - used);
  return left <= LOW_QUOTA_AT ? left : null;
}

export function lowQuotaNotice(left: number, language: EllieLanguage, short = false): string {
  if (language === 'es') {
    return short
      ? `Quedan ${left} análisis hoy`
      : `Quedan ${left} análisis con foto hoy`;
  }
  return short ? `${left} analyses left today` : `${left} photo analyses left today`;
}
