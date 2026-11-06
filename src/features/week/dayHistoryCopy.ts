import type { EllieLanguage } from '@app/features/ellie/ellieCopy';
import { useProfileLanguage } from '@app/hooks/useProfileLanguage';

// Past days of Tu semana (day summary, sessions of a day, the summary of a
// past session, the missed routine and a closed Core 33 day), by i18n key
// (es/en, profiles.language). "{n}" placeholders as workoutsCopy.
const COPY = {
  'day.viewSummary': { es: 'Ver resumen', en: 'View summary' },
  'day.sessionsTitle': { es: 'Sesiones del día', en: "Day's sessions" },
  'day.summaryTitle': { es: 'Resumen del día', en: 'Day summary' },
  'day.empty': {
    es: 'Sin actividad registrada este día',
    en: 'No activity recorded this day',
  },
  'day.error': {
    es: 'No pudimos cargar este día.',
    en: "We couldn't load this day.",
  },
  'day.core33': { es: 'Core 33 · Día {n}', en: 'Core 33 · Day {n}' },
  'day.core33.done': { es: 'Hecho', en: 'Done' },
  'day.core33.notDone': { es: 'Sin hacer', en: 'Not done' },
  'day.sleep': { es: 'Sueño', en: 'Sleep' },
  'day.sleep.window': { es: '{bed} → {wake}', en: '{bed} → {wake}' },
  'day.nutrition': { es: 'Nutrición', en: 'Nutrition' },
  'day.nutrition.kcal': { es: 'kcal', en: 'kcal' },
  'day.nutrition.protein': { es: 'g proteína', en: 'g protein' },
  'day.hydration': { es: 'Hidratación', en: 'Hydration' },
  'day.session.minutes': { es: '{n} min', en: '{n} min' },
  'summary.history.title': {
    es: 'Entreno completado',
    en: 'Workout completed',
  },
  'summary.exercises': { es: 'Ejercicios', en: 'Exercises' },
  'summary.sets.one': { es: '1 serie', en: '1 set' },
  'summary.sets.other': { es: '{n} series', en: '{n} sets' },
  'summary.exercise.fallback': { es: 'Ejercicio', en: 'Exercise' },
  'summary.records': { es: 'Récords', en: 'Records' },
  'summary.rating': { es: 'Tu valoración', en: 'Your rating' },
  'summary.rating.a11y': { es: '{n} de 5', en: '{n} of 5' },
  'summary.feedback.effort': { es: 'Sensación', en: 'Felt' },
  'summary.feedback.discomfort': { es: 'Molestia', en: 'Discomfort' },
  'summary.feedback.general': { es: 'Durante la sesión', en: 'During the session' },
  'summary.feedback.error': {
    es: 'No pudimos cargar el feedback de la sesión ({code}).',
    en: "We couldn't load the session feedback ({code}).",
  },
  'summary.share': { es: 'Compartir', en: 'Share' },
  'summary.viewRoutine': { es: 'Ver rutina', en: 'View routine' },
  'summary.close': { es: 'Cerrar', en: 'Close' },
  'routine.missed': { es: 'No completada', en: 'Not completed' },
  'routine.missed.text': {
    es: 'Estaba planificada para el {day} y no se hizo.',
    en: 'It was planned for {day} and was not done.',
  },
  'routine.doToday': { es: 'Hacerla hoy', en: 'Do it today' },
  'core33.closedDay': { es: 'Día cerrado', en: 'Day closed' },
  'core33.closedDay.hint': {
    es: 'Este día ya pasó: puedes verlo, pero no marcar ni desmarcar hábitos.',
    en: 'This day is over: you can see it, but not check or uncheck habits.',
  },
  'core33.dayTitle': { es: 'Día {n}', en: 'Day {n}' },
  'week.prev': { es: 'Semana anterior', en: 'Previous week' },
  'week.next': { es: 'Semana siguiente', en: 'Next week' },
  'week.backToCurrent': { es: 'Volver a esta semana', en: 'Back to this week' },
  'week.title': { es: 'Semana {n}', en: 'Week {n}' },
} as const satisfies Record<string, Record<EllieLanguage, string>>;

export type DayHistoryKey = keyof typeof COPY;
export type DayHistoryVars = Record<string, string | number>;

export function dayHistoryText(
  language: EllieLanguage,
  key: DayHistoryKey,
  vars: DayHistoryVars = {},
): string {
  return COPY[key][language].replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export type DayHistoryT = (key: DayHistoryKey, vars?: DayHistoryVars) => string;

export function useDayHistoryText(): {
  t: DayHistoryT;
  language: EllieLanguage;
} {
  const language = useProfileLanguage();
  return { t: (key, vars) => dayHistoryText(language, key, vars), language };
}
