import type { EllieLanguage } from '@app/features/ellie/ellieCopy';
import { coachText, type CoachT } from '@app/features/coach/coachCopy';
import { addDays, weekdayIndex } from '@app/features/week/weekModel';
import { CoachError, type MacroTargets } from '@app/services/coach/coachService';

// Pure rules of ATHELETE Coach (handoff v2.20 §30): dates and days as the
// screens write them, the macro arithmetic of "Asignar nutrición", the
// invitation code and the error copy. Dates are local `YYYY-MM-DD`.

// ── Days ────────────────────────────────────────────────────────────────────
// ISO weekdays 1 (Monday) … 7 (Sunday).
export const ISO_DAYS = [1, 2, 3, 4, 5, 6, 7] as const;

const LETTERS: Record<EllieLanguage, string[]> = {
  es: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
  en: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
};
const SHORT: Record<EllieLanguage, string[]> = {
  es: ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
};
const MONTHS: Record<EllieLanguage, string[]> = {
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

export function dayLetter(language: EllieLanguage, isoDay: number): string {
  return LETTERS[language][isoDay - 1] ?? '';
}

export function dayShort(language: EllieLanguage, isoDay: number): string {
  return SHORT[language][isoDay - 1] ?? '';
}

// "lun · mar · mié · sáb".
export function daysLine(language: EllieLanguage, days: number[]): string {
  return [...days].sort((a, b) => a - b).map(day => dayShort(language, day)).join(' · ');
}

export function capitalize(text: string): string {
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}

// ISO weekday of a local date.
export function isoWeekday(date: string): number {
  return weekdayIndex(date) + 1;
}

// "2 nov" · "Nov 2".
export function shortDate(language: EllieLanguage, date: string | null | undefined): string {
  if (!date) {
    return '';
  }
  const [, m, d] = date.slice(0, 10).split('-').map(Number);
  const month = MONTHS[language][(m ?? 1) - 1] ?? '';
  return language === 'en' ? `${month} ${d}` : `${d} ${month}`;
}

// "Lun 9 nov" · "Mon Nov 9".
export function weekdayDate(language: EllieLanguage, date: string): string {
  return `${capitalize(dayShort(language, isoWeekday(date)))} ${shortDate(language, date)}`;
}

// Start options of "Asignar rutina · Programa": today, next Monday and the
// Monday after it (today Monday → next Monday is in 7 days).
export function startDateOptions(today: string): string[] {
  const toMonday = 8 - isoWeekday(today);
  const nextMonday = addDays(today, toMonday);
  return [today, nextMonday, addDays(nextMonday, 7)];
}

// "hoy" / "hace 2 días" from an ISO timestamp or date.
export function relativeDays(language: EllieLanguage, at: string | null, now: Date = new Date()): string {
  if (!at) {
    return '';
  }
  const then = new Date(at.length <= 10 ? `${at}T12:00:00` : at);
  const days = Math.max(0, Math.floor((now.getTime() - then.getTime()) / 86400000));
  if (language === 'en') {
    return days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
  }
  return days === 0 ? 'hoy' : days === 1 ? 'ayer' : `hace ${days} días`;
}

// "Hoy" / "Ayer" / "2 nov" for the last session.
export function sessionWhen(language: EllieLanguage, date: string | null, today: string): string {
  if (!date) {
    return '';
  }
  if (date === today) {
    return language === 'en' ? 'Today' : 'Hoy';
  }
  if (addDays(date, 1) === today) {
    return language === 'en' ? 'Yesterday' : 'Ayer';
  }
  return shortDate(language, date);
}

// ── Labels ──────────────────────────────────────────────────────────────────
const LEVELS: Record<string, Record<EllieLanguage, string>> = {
  principiante: { es: 'Principiante', en: 'Beginner' },
  beginner: { es: 'Principiante', en: 'Beginner' },
  intermedio: { es: 'Intermedia', en: 'Intermediate' },
  intermediate: { es: 'Intermedia', en: 'Intermediate' },
  avanzado: { es: 'Avanzada', en: 'Advanced' },
  advanced: { es: 'Avanzada', en: 'Advanced' },
};
const GOALS: Record<string, Record<EllieLanguage, string>> = {
  lose_weight: { es: 'Perder grasa', en: 'Lose fat' },
  gain_muscle: { es: 'Ganar músculo', en: 'Build muscle' },
  maintain: { es: 'Mantenerme', en: 'Maintain' },
  improve_health: { es: 'Salud general', en: 'General health' },
  performance: { es: 'Rendimiento', en: 'Performance' },
};

export function profileLine(language: EllieLanguage, level: string | null, goal: string | null): string {
  return [level ? LEVELS[level]?.[language] ?? level : null, goal ? GOALS[goal]?.[language] ?? goal : null]
    .filter(Boolean)
    .join(' · ');
}

// sfb-1 body_zone (the app writes 'hombro' | 'rodilla' | 'espalda' | 'codo'
// | 'otra'; the contract example shows 'knee'): both spellings.
const ZONES: Record<string, Record<EllieLanguage, string>> = {
  hombro: { es: 'Hombro', en: 'Shoulder' },
  shoulder: { es: 'Hombro', en: 'Shoulder' },
  rodilla: { es: 'Rodilla', en: 'Knee' },
  knee: { es: 'Rodilla', en: 'Knee' },
  espalda: { es: 'Espalda', en: 'Back' },
  back: { es: 'Espalda', en: 'Back' },
  lumbar: { es: 'Lumbar', en: 'Lower back' },
  lower_back: { es: 'Lumbar', en: 'Lower back' },
  codo: { es: 'Codo', en: 'Elbow' },
  elbow: { es: 'Codo', en: 'Elbow' },
  otra: { es: 'Otra zona', en: 'Other area' },
  other: { es: 'Otra zona', en: 'Other area' },
};

export function zoneLabel(language: EllieLanguage, zone: string): string {
  return ZONES[zone.toLowerCase()]?.[language] ?? capitalize(zone.replace(/_/g, ' '));
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function plural(t: CoachT, one: Parameters<CoachT>[0], other: Parameters<CoachT>[0], n: number): string {
  return t(n === 1 ? one : other, { n });
}

export function formatKcal(language: EllieLanguage, kcal: number): string {
  return Math.round(kcal).toLocaleString(language === 'en' ? 'en-US' : 'es-ES');
}

// ── Macros ──────────────────────────────────────────────────────────────────
export const KCAL_MIN = 1200;
export const KCAL_MAX = 6000;
export const KCAL_STEP = 50;
export const MACRO_STEPS = { protein: 5, carbs: 10, fat: 5 } as const;
// "Cuadran" when the macros are within ±50 kcal of the target.
export const FIT_MARGIN = 50;

export const DEFAULT_TARGETS: MacroTargets = { kcal: 2200, protein: 150, carbs: 240, fat: 70 };

export function macroKcal(t: Pick<MacroTargets, 'protein' | 'carbs' | 'fat'>): number {
  return t.protein * 4 + t.carbs * 4 + t.fat * 9;
}

export type MacroFit = { sum: number; diff: number; fits: boolean };

// diff > 0: kcal still to split; diff < 0: the macros go over.
export function macroFit(t: MacroTargets): MacroFit {
  const sum = macroKcal(t);
  const diff = t.kcal - sum;
  return { sum, diff, fits: Math.abs(diff) <= FIT_MARGIN };
}

// Share of the target of each macro (rounded %).
export function macroPct(t: MacroTargets, key: 'protein' | 'carbs' | 'fat'): number {
  if (t.kcal <= 0) {
    return 0;
  }
  const kcal = key === 'fat' ? t.fat * 9 : t[key] * 4;
  return Math.round((kcal / t.kcal) * 100);
}

export function clampKcal(kcal: number): number {
  return Math.min(KCAL_MAX, Math.max(KCAL_MIN, Math.round(kcal / KCAL_STEP) * KCAL_STEP));
}

// ── Invitation code ─────────────────────────────────────────────────────────
// Accepts the code ("ath-7k2q", "7K2Q") or a whole link
// (athelete://coach/join?code=ATH-7K2Q) and returns "ATH-7K2Q".
export function normalizeInviteCode(input: string): string {
  const trimmed = input.trim();
  const fromLink = /[?&]code=([^&#\s]+)/i.exec(trimmed);
  const raw = (fromLink ? decodeURIComponent(fromLink[1]) : trimmed).toUpperCase().replace(/\s+/g, '');
  if (/^[A-Z0-9]{4,8}$/.test(raw) && !raw.startsWith('ATH')) {
    return `ATH-${raw}`;
  }
  if (/^ATH[A-Z0-9]{4,8}$/.test(raw)) {
    return `ATH-${raw.slice(3)}`;
  }
  return raw;
}

// "Continuar" is active with 7+ characters.
export function inviteCodeReady(input: string): boolean {
  return normalizeInviteCode(input).length >= 7;
}

// athelete://coach/join?code=ATH-7K2Q → "ATH-7K2Q".
export function parseCoachJoinLink(url: string): string | null {
  if (!/^athelete:\/\/coach\/join\b/i.test(url)) {
    return null;
  }
  const match = /[?&]code=([^&#]+)/i.exec(url);
  return match ? normalizeInviteCode(decodeURIComponent(match[1])) : null;
}

// ── Errors ──────────────────────────────────────────────────────────────────
// Copy of a coach error. `name`: the other person (already_linked: the
// current coach; nutrition_not_shared: the student).
export function coachErrorMessage(error: unknown, language: EllieLanguage, name?: string | null): string {
  if (!(error instanceof CoachError)) {
    return coachText(language, 'coach.error.unknown');
  }
  switch (error.code) {
    case 'not_coach':
    case 'not_found':
    case 'invalid_code':
    case 'own_code':
    case 'coach_full':
    case 'link_not_active':
    case 'invalid_targets':
    case 'invalid_input':
    case 'too_many_attempts':
    case 'offline':
      return coachText(language, `coach.error.${error.code}`);
    case 'kcal_out_of_range':
      return coachText(language, 'coach.error.kcal');
    case 'macros_mismatch':
      return coachText(language, 'coach.error.macros');
    case 'below_safety_min':
      return coachText(language, 'coach.error.safety');
    case 'already_linked':
      return name
        ? coachText(language, 'coach.error.already_linked', { name })
        : coachText(language, 'coach.error.already_linked.noName');
    case 'nutrition_not_shared':
      return coachText(language, 'coach.error.nutrition_not_shared', { name: name ?? '' }).trim();
    default:
      return coachText(language, 'coach.error.unknown');
  }
}
