import type { EllieLanguage } from '@app/features/ellie/ellieCopy';

// Sueño copy by i18n key (es/en, profiles.language). Same pattern as
// workoutsCopy / routeCopy.
const COPY = {
  'sleep.consistency.label': { es: 'Consistencia', en: 'Consistency' },
  'sleep.consistency.hint': { es: 'Noches dentro de tu horario', en: 'Nights within your schedule' },
  // Anoche · sueño, only when the night has no stages.
  'sleep.stages.empty': {
    es: 'Sin datos de fases: con Apple Watch verás sueño profundo, REM y ligero.',
    en: "No stage data: with Apple Watch you'll see deep, REM and light sleep.",
  },
} as const satisfies Record<string, Record<EllieLanguage, string>>;

export type SleepCopyKey = keyof typeof COPY;

export function sleepText(language: EllieLanguage, key: SleepCopyKey): string {
  return COPY[key][language];
}
