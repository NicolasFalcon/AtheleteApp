import type { EllieLanguage } from '@app/features/ellie/ellieCopy';
import { ProposalError } from '@app/services/ellie/ellieProposals';
import { dayNumber, weekdayIndex } from '@app/features/week/weekModel';

// "Agregar a semana" and the ELLIE cards of prop-2 (routine_library,
// week_plan_added), by i18n key in Spanish and English. Same shape as
// workoutsCopy.
const COPY = {
  'addToWeek.action': { es: 'Agregar a semana', en: 'Add to week' },
  'addToWeek.title': { es: 'Agregar a semana', en: 'Add to week' },
  'addToWeek.subtitle': { es: 'Elige el día de {name}', en: 'Pick the day for {name}' },
  'addToWeek.thisWeek': { es: 'Esta semana', en: 'This week' },
  'addToWeek.nextWeek': { es: 'Próxima semana', en: 'Next week' },
  'addToWeek.today': { es: 'Hoy', en: 'Today' },
  'addToWeek.free': { es: 'Libre', en: 'Free' },
  'addToWeek.loading': { es: 'Cargando tu semana…', en: 'Loading your week…' },
  'addToWeek.adding': { es: 'Agregando…', en: 'Adding…' },
  'addToWeek.replace.title': {
    es: 'El {day} ya tiene {name}. ¿Reemplazarla?',
    en: '{day} already has {name}. Replace it?',
  },
  'addToWeek.replace.confirm': { es: 'Reemplazar', en: 'Replace' },
  'addToWeek.replace.cancel': { es: 'Cancelar', en: 'Cancel' },
  'addToWeek.added': { es: 'Agregada al {day} {n}', en: 'Added to {day} {n}' },
  'addToWeek.viewWeek': { es: 'Ver semana', en: 'View week' },
  'addToWeek.error.past_day': { es: 'Ese día ya pasó.', en: 'That day has already passed.' },
  'addToWeek.error.proposal_not_open': {
    es: 'Esta propuesta ya no está disponible.',
    en: 'This proposal is no longer available.',
  },
  'addToWeek.error.routine_not_found': {
    es: 'No encontramos esa rutina.',
    en: "We couldn't find that routine.",
  },
  'addToWeek.error.offline': {
    es: 'Sin conexión. Revisa tu red e inténtalo de nuevo.',
    en: 'No connection. Check your network and try again.',
  },
  'addToWeek.error.generic': {
    es: 'No se pudo agregar a la semana. Intenta de nuevo.',
    en: "Couldn't add it to your week. Try again.",
  },
  'library.badge.official': { es: 'BIBLIOTECA', en: 'LIBRARY' },
  'library.badge.user': { es: 'TU RUTINA', en: 'YOUR ROUTINE' },
  'library.start': { es: 'Empezar', en: 'Start' },
  'library.view': { es: 'Ver rutina', en: 'View routine' },
  'library.adjust': { es: 'Ajustarla', en: 'Adjust it' },
  'library.warmup': { es: 'Calentamiento', en: 'Warm-up' },
  'library.cooldown': { es: 'Vuelta a la calma', en: 'Cool-down' },
  'library.more': { es: '+{n} más', en: '+{n} more' },
  'library.exercises.one': { es: '{n} ejercicio', en: '{n} exercise' },
  'library.exercises.other': { es: '{n} ejercicios', en: '{n} exercises' },
  'library.error.start': {
    es: 'No se pudo empezar. Intenta de nuevo.',
    en: "Couldn't start it. Try again.",
  },
  'weekAdded.title': { es: 'Agregada al {day} {n}', en: 'Added to {day} {n}' },
  'weekAdded.replaced': { es: 'Reemplazó la rutina anterior', en: 'Replaced the previous routine' },
  'weekAdded.replacedState': { es: 'Reemplazada', en: 'Replaced' },
  'weekAdded.removed': { es: 'Quitada del {day}', en: 'Removed from {day}' },
  'weekAdded.viewWeek': { es: 'Ver semana', en: 'View week' },
  'weekAdded.undo': { es: 'Deshacer', en: 'Undo' },
  'weekAdded.undoing': { es: 'Quitando…', en: 'Removing…' },
  'weekAdded.error.past_day': { es: 'Ese día ya pasó.', en: 'That day has already passed.' },
  'weekAdded.error.generic': {
    es: 'No se pudo deshacer. Intenta de nuevo.',
    en: "Couldn't undo it. Try again.",
  },
} as const satisfies Record<string, Record<EllieLanguage, string>>;

export type AddToWeekCopyKey = keyof typeof COPY;

// "{n}" placeholders are replaced with `vars.n`.
export function addToWeekText(
  language: EllieLanguage,
  key: AddToWeekCopyKey,
  vars: Record<string, string | number> = {},
): string {
  return COPY[key][language].replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

const DAYS: Record<EllieLanguage, string[]> = {
  es: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'],
  en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
};

// "miércoles" / "Wednesday" of a local YYYY-MM-DD date.
export function weekdayName(language: EllieLanguage, date: string): string {
  return DAYS[language][weekdayIndex(date)];
}

// "Miércoles 11" / "Wednesday 11" (the list's rows).
export function weekdayLabel(language: EllieLanguage, date: string): string {
  const name = weekdayName(language, date);
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${dayNumber(date)}`;
}

// "Agregada al miércoles 11" / "Added to Wednesday 11".
export function addedLine(language: EllieLanguage, date: string): string {
  return addToWeekText(language, 'addToWeek.added', {
    day: weekdayName(language, date),
    n: dayNumber(date),
  });
}

// An error of plan_routine_for_day with its own message; anything else gets
// the generic one.
export function addToWeekError(language: EllieLanguage, error: unknown): string {
  if (error instanceof ProposalError) {
    switch (error.code) {
      case 'past_day':
        return addToWeekText(language, 'addToWeek.error.past_day');
      case 'proposal_not_open':
        return addToWeekText(language, 'addToWeek.error.proposal_not_open');
      case 'routine_not_found':
        return addToWeekText(language, 'addToWeek.error.routine_not_found');
      case 'offline':
        return addToWeekText(language, 'addToWeek.error.offline');
      default:
        break;
    }
  }
  return addToWeekText(language, 'addToWeek.error.generic');
}
