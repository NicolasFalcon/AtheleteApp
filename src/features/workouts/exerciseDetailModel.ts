import type { ExerciseHistorySet } from '@app/services/supabase/session';
import type { CatalogLocale } from '@app/services/catalog/catalogService';
import { formatPRValue, getBestPR } from '@app/shared';
import type { PRType, PersonalRecord } from '@app/shared';

// Exercise Detail (sport redesign): what the screen shows, without UI.

// ── Copy (es / en, the catalog locale) ──────────────────────────────────────
const COPY = {
  es: {
    level: 'Nivel',
    equipment: 'Equipo',
    muscles: 'Músculos',
    history: 'Tu historial',
    times: 'veces',
    lastTime: 'última vez',
    record: 'récord',
    technique: 'Técnica',
    mistakes: 'Errores',
    variants: 'Variantes',
    allSteps: (count: number) => `Ver los ${count} pasos`,
    fewerSteps: 'Ver menos',
    addToRoutine: 'Agregar a rutina',
    back: 'Volver',
    favoriteOn: 'Quitar de favoritos',
    favoriteOff: 'Agregar a favoritos',
    loadError: 'No pudimos cargar el ejercicio.',
    notFound: 'Ejercicio no encontrado',
    notInLibrary: 'No está en la biblioteca actual.',
    seeRecords: (mark: string) => `Tu récord: ${mark}. Ver récords`,
    levels: { beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado' },
    equipments: {
      bodyweight: 'Peso corporal',
      dumbbells: 'Mancuernas',
      barbell: 'Barra',
      cable: 'Cable',
      machines: 'Máquinas',
    },
  },
  en: {
    level: 'Level',
    equipment: 'Equipment',
    muscles: 'Muscles',
    history: 'Your history',
    times: 'times',
    lastTime: 'last time',
    record: 'record',
    technique: 'Technique',
    mistakes: 'Mistakes',
    variants: 'Variations',
    allSteps: (count: number) => `See all ${count} steps`,
    fewerSteps: 'Show less',
    addToRoutine: 'Add to routine',
    back: 'Back',
    favoriteOn: 'Remove from favorites',
    favoriteOff: 'Add to favorites',
    loadError: 'We couldn’t load the exercise.',
    notFound: 'Exercise not found',
    notInLibrary: 'It’s not in the current library.',
    seeRecords: (mark: string) => `Your record: ${mark}. See records`,
    levels: { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' },
    equipments: {
      bodyweight: 'Bodyweight',
      dumbbells: 'Dumbbells',
      barbell: 'Barbell',
      cable: 'Cable',
      machines: 'Machines',
    },
  },
};

export type ExerciseDetailCopy = (typeof COPY)['es'];

export const exerciseDetailCopy = (locale: CatalogLocale): ExerciseDetailCopy => COPY[locale];

const titleCase = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1).replace(/[_-]/g, ' ') : value;

export function levelText(copy: ExerciseDetailCopy, level: string): string {
  return copy.levels[level as keyof ExerciseDetailCopy['levels']] ?? titleCase(level);
}

export function equipmentText(copy: ExerciseDetailCopy, equipment: string): string {
  return copy.equipments[equipment as keyof ExerciseDetailCopy['equipments']] ?? titleCase(equipment);
}

// ── Steps and mistakes ──────────────────────────────────────────────────────
// "Posición larga. Impúlsate…" → a short title (before the first ":" or ".",
// at most 4 words) and the rest. Without one, the whole sentence.
const SHORT_TITLE_WORDS = 4;

export type SplitLine = { title: string | null; body: string };

export function splitShortTitle(text: string): SplitLine {
  const value = text.trim();
  const match = /[:.]/.exec(value);
  if (!match) {
    return { title: null, body: value };
  }
  const head = value.slice(0, match.index).trim();
  const rest = value.slice(match.index + 1).trim();
  const words = head.split(/\s+/).filter(Boolean).length;
  if (!head || !rest || words > SHORT_TITLE_WORDS) {
    return { title: null, body: value };
  }
  return { title: head, body: rest };
}

export const VISIBLE_STEPS = 3;

// ── Tu historial ────────────────────────────────────────────────────────────
export type ExerciseHistorySummary = {
  times: number;
  last: string | null;
  record: string | null;
};

// "3×12" · "60 kg" (with load) · "3×30 s" · "3×400 m".
function lastSessionText(sets: ExerciseHistorySet[]): string | null {
  if (sets.length === 0) {
    return null;
  }
  const max = (values: (number | null)[]) =>
    values.reduce<number | null>((best, value) => (value !== null && (best === null || value > best) ? value : best), null);
  const weight = max(sets.map(set => set.weightKg));
  if (weight !== null && weight > 0) {
    return `${Number(weight.toFixed(1))} kg`;
  }
  const reps = max(sets.map(set => set.reps));
  if (reps !== null) {
    return `${sets.length}×${reps}`;
  }
  const duration = max(sets.map(set => set.durationSec));
  if (duration !== null) {
    return `${sets.length}×${Math.round(duration)} s`;
  }
  const distance = max(sets.map(set => set.distanceM));
  return distance !== null ? `${sets.length}×${Math.round(distance)} m` : `${sets.length}×`;
}

const PR_ORDER: PRType[] = ['max_weight', 'weight_reps', 'max_reps', 'duration', 'distance'];

// The best mark of the first PR type the user has ("60 kg": the reps of a
// weight × reps mark are left for Récords).
export function bestMark(records: PersonalRecord[]): string | null {
  for (const type of PR_ORDER) {
    const best = getBestPR(records, type);
    if (best) {
      return type === 'weight_reps' ? `${best.valueWeight ?? 0} kg` : formatPRValue(best);
    }
  }
  return null;
}

// null when the user has nothing on this exercise (the block is hidden).
export function historySummary(
  sets: ExerciseHistorySet[],
  records: PersonalRecord[],
): ExerciseHistorySummary | null {
  const sessions = new Set(sets.map(set => set.sessionId));
  const record = bestMark(records);
  if (sessions.size === 0 && !record) {
    return null;
  }
  // Newest first: the sets of the newest session.
  const lastSession = sets[0]?.sessionId ?? null;
  return {
    times: sessions.size,
    last: lastSessionText(sets.filter(set => set.sessionId === lastSession)),
    record,
  };
}
