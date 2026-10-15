import type { EllieLanguage } from '@app/features/ellie/ellieCopy';
import type { PushPermission } from '@app/features/push/pushPermission';

type Pair = { es: string; en: string };
const T = (pair: Pair, language: EllieLanguage) => pair[language];

export const PROMPT_COPY = {
  title: { es: 'Entérate cuando importa', en: 'Know when it matters' },
  text: {
    es: 'Te avisamos cuando un amigo te escribe o te reta, y cuando termina un reto. Sin ruido: puedes elegir qué avisos recibir y en qué horas descansar.',
    en: 'We let you know when a friend writes to you or challenges you, and when a challenge ends. No noise: you choose which alerts you get and when to rest.',
  },
  enable: { es: 'Activar notificaciones', en: 'Turn on notifications' },
  later: { es: 'Ahora no', en: 'Not now' },
} as const;

export const settingsCopy = (language: EllieLanguage) => ({
  title: T({ es: 'Notificaciones', en: 'Notifications' }, language),
  system: T({ es: 'Permiso del sistema', en: 'System permission' }, language),
  social: T({ es: 'Amigos y publicaciones', en: 'Friends and posts' }, language),
  socialSub: T(
    { es: 'Solicitudes, me gusta y comentarios', en: 'Requests, likes and comments' },
    language,
  ),
  challenges: T({ es: 'Retos', en: 'Challenges' }, language),
  challengesSub: T(
    { es: 'Invitaciones, inicio y final de retos', en: 'Invitations, start and end of challenges' },
    language,
  ),
  quiet: T({ es: 'Horas de silencio', en: 'Quiet hours' }, language),
  quietSub: T(
    { es: 'Los avisos esperan a que termine el silencio', en: 'Alerts wait until the quiet time is over' },
    language,
  ),
  from: T({ es: 'Desde', en: 'From' }, language),
  until: T({ es: 'Hasta', en: 'Until' }, language),
  saveError: T({ es: 'No pudimos guardar el cambio', en: "We couldn't save the change" }, language),
  moderation: T(
    {
      es: 'Los avisos de moderación sobre tu contenido siempre se envían.',
      en: 'Moderation notices about your content are always sent.',
    },
    language,
  ),
});

export function permissionLine(permission: PushPermission, language: EllieLanguage): string {
  switch (permission) {
    case 'granted':
      return T({ es: 'Activadas', en: 'On' }, language);
    case 'denied':
      return T({ es: 'Desactivadas en Ajustes', en: 'Off in Settings' }, language);
    default:
      return T({ es: 'Sin activar', en: 'Not turned on' }, language);
  }
}

export function permissionAction(permission: PushPermission, language: EllieLanguage): string | null {
  switch (permission) {
    case 'granted':
      return null;
    case 'denied':
      return T({ es: 'Abrir Ajustes', en: 'Open Settings' }, language);
    default:
      return T({ es: 'Activar', en: 'Turn on' }, language);
  }
}

export const hourLabel = (hour: number): string => `${String(hour).padStart(2, '0')}:00`;
