import type { EllieLanguage } from '@app/features/ellie/ellieCopy';
import { formatThousands } from '@app/features/social/postModel';

// Counters of people in challenges by i18n key (es/en, profiles.language),
// with the one / other plural forms: "1 atleta" / "12 atletas". Same "{n}"
// placeholder pattern as workoutsCopy / routeCopy.
const COPY = {
  'athletes.count.one': { es: '{n} atleta', en: '{n} athlete' },
  'athletes.count.other': { es: '{n} atletas', en: '{n} athletes' },
  'athletes.inside.one': { es: '{n} atleta dentro', en: '{n} athlete in' },
  'athletes.inside.other': { es: '{n} atletas dentro', en: '{n} athletes in' },
  'athletes.participating.one': { es: '{n} atleta participando', en: '{n} athlete taking part' },
  'athletes.participating.other': { es: '{n} atletas participando', en: '{n} athletes taking part' },
  'participants.count.one': { es: '{n} participante', en: '{n} participant' },
  'participants.count.other': { es: '{n} participantes', en: '{n} participants' },
} as const satisfies Record<string, Record<EllieLanguage, string>>;

export type CountKind = 'athletes.count' | 'athletes.inside' | 'athletes.participating' | 'participants.count';

// Plural category of a count (es and en share it: only 1 is singular).
export function pluralForm(n: number): 'one' | 'other' {
  return n === 1 ? 'one' : 'other';
}

export function countText(language: EllieLanguage, kind: CountKind, n: number): string {
  return COPY[`${kind}.${pluralForm(n)}`][language].replace('{n}', formatThousands(n));
}
