import { catalogPerf } from '@app/lib/perf/catalogPerf';
import { getSupabaseClient } from '@app/services/supabase/client';
import {
  equipmentToFilter,
  muscleGroupToBodyPart,
  type LibraryExercise,
} from '@app/shared/data/exercises';

// Exercise catalog (docs/backend/ROUTINES_SHAPES.md · Catálogo): the version,
// one page of the list (server filters and search) and one exercise. Never
// the whole catalog at once.

export type CatalogLocale = 'es' | 'en';

export class CatalogError extends Error {
  code: 'unauthorized' | 'exercise_not_found' | 'invalid_input' | 'offline' | 'unknown';
  constructor(code: CatalogError['code'], message?: string) {
    super(message ?? code);
    this.name = 'CatalogError';
    this.code = code;
  }
}

export type CatalogVersion = { version: string; exercises: number };

export type ExerciseQuery = {
  muscle?: string | null;
  // Any of these muscles (`_muscles`, max 20).
  muscles?: string[] | null;
  // Any of these equipments (`_equipments`, max 10).
  equipments?: string[] | null;
  equipment?: string | null;
  pattern?: string | null;
  difficulty?: string | null;
  q?: string | null;
  locale: CatalogLocale;
  cursor?: string | null;
  limit?: number;
};

export type ExercisePage = {
  locale: CatalogLocale;
  items: LibraryExercise[];
  nextCursor: string | null;
};

// muscles.slug names (the 16 of the catalog), for the muscle line of a row
// when list_exercises gives the slug.
const MUSCLE_NAMES: Record<string, { es: string; en: string }> = {
  calves: { es: 'Gemelos', en: 'Calves' },
  back: { es: 'Espalda', en: 'Back' },
  hamstrings: { es: 'Isquiotibiales', en: 'Hamstrings' },
  glutes: { es: 'Glúteos', en: 'Glutes' },
  tibialis: { es: 'Tibial', en: 'Tibialis' },
  'lower-back': { es: 'Espalda baja', en: 'Lower back' },
  neck: { es: 'Cuello', en: 'Neck' },
  trapezius: { es: 'Trapecios', en: 'Trapezius' },
  shoulders: { es: 'Hombros', en: 'Shoulders' },
  adductors: { es: 'Aductores', en: 'Adductors' },
  biceps: { es: 'Bíceps', en: 'Biceps' },
  triceps: { es: 'Tríceps', en: 'Triceps' },
  core: { es: 'Core', en: 'Core' },
  quadriceps: { es: 'Cuádriceps', en: 'Quadriceps' },
  forearms: { es: 'Antebrazos', en: 'Forearms' },
  chest: { es: 'Pecho', en: 'Chest' },
};

// Name of a muscles.slug (the slug itself when it is not one of the 16).
export function muscleLabel(slug: string | null, locale: CatalogLocale = 'es'): string | null {
  if (!slug) {
    return null;
  }
  return MUSCLE_NAMES[slug]?.[locale] ?? slug;
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
const str = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;
const num = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;
const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];

// The equipment the filters know (dumbbells, cable…); a bench alone is not a
// filter, so the first known one wins.
function mainEquipment(slugs: string[]): string {
  const known = slugs.find(slug => equipmentToFilter[slug] && slug !== 'bench');
  const slug = known ?? slugs[0] ?? 'bodyweight';
  return equipmentToFilter[slug] ?? slug;
}

function emptyExercise(id: string, name: string): LibraryExercise {
  return {
    id,
    name,
    slug: '',
    equipment: 'bodyweight',
    bodyPart: 'fullbody',
    level: 'beginner',
    thumbnailUrl: '',
    videoUrl: null,
    orientation: 'landscape',
    howToPerform: [],
    coachingCues: [],
    commonMistakes: [],
    musclesWorked: { primary: [], secondary: [] },
    recommendedSetsReps: null,
    usedInRoutines: [],
    category: 'strength',
    shortDescription: null,
    longDescription: null,
    benefits: [],
    tags: [],
    movementPatterns: [],
    trackingMetrics: [],
    isUnilateral: false,
    prEligible: false,
    thumbKey: null,
    posterKey: null,
    videoKey: null,
    aliases: [],
  };
}

// A row of list_exercises. `primary_muscle` may come as a slug or as a name.
export function mapExerciseListItem(raw: unknown, locale: CatalogLocale): LibraryExercise {
  const row = asRecord(raw) ?? {};
  const base = emptyExercise(str(row.id) ?? '', str(row.name) ?? '');
  const primary = str(row.primary_muscle);
  const knownSlug = primary && MUSCLE_NAMES[primary] ? primary : null;
  return {
    ...base,
    slug: str(row.slug) ?? '',
    level: str(row.difficulty) ?? 'beginner',
    equipment: mainEquipment(strings(row.equipment)),
    bodyPart: knownSlug ? muscleGroupToBodyPart[knownSlug] ?? 'fullbody' : 'fullbody',
    musclesWorked: {
      primary: knownSlug ? [MUSCLE_NAMES[knownSlug][locale]] : primary ? [primary] : [],
      secondary: [],
    },
    thumbKey: str(row.thumb_key),
  };
}

type MediaItem = { kind: string; key: string; width: number | null; height: number | null };

function mediaOf(value: unknown): MediaItem[] {
  return Array.isArray(value)
    ? value.flatMap(item => {
        const row = asRecord(item);
        const key = str(row?.key);
        return row && key
          ? [{ kind: str(row.kind) ?? '', key, width: num(row.width), height: num(row.height) }]
          : [];
      })
    : [];
}

// get_exercise → the detail model (MoveKit, technique, muscles).
export function mapExerciseDetail(raw: unknown): LibraryExercise {
  const row = asRecord(raw) ?? {};
  const locale: CatalogLocale = row.locale === 'en' ? 'en' : 'es';
  const muscles = Array.isArray(row.muscles)
    ? row.muscles.flatMap(item => {
        const muscle = asRecord(item);
        const slug = str(muscle?.slug);
        return muscle && slug
          ? [{ slug, role: str(muscle.role), name: str(muscle.name) ?? MUSCLE_NAMES[slug]?.[locale] ?? slug }]
          : [];
      })
    : [];
  const primary = muscles.filter(item => item.role === 'primary');
  const secondary = muscles.filter(item => item.role !== 'primary');
  const equipment = Array.isArray(row.equipment)
    ? row.equipment.flatMap(item => {
        const slug = str(asRecord(item)?.slug);
        return slug ? [slug] : [];
      })
    : [];
  const media = mediaOf(row.media);
  const video = media.find(item => item.kind === 'video') ?? null;
  const poster = media.find(item => item.kind === 'poster') ?? null;
  const thumb = media.find(item => item.kind === 'thumb') ?? null;
  const firstPrimary = primary[0]?.slug ?? muscles[0]?.slug ?? '';
  const base = emptyExercise(str(row.id) ?? '', str(row.name) ?? str(row.slug) ?? '');

  return {
    ...base,
    slug: str(row.slug) ?? '',
    level: str(row.difficulty) ?? 'beginner',
    equipment: mainEquipment(equipment),
    bodyPart: muscleGroupToBodyPart[firstPrimary] ?? 'fullbody',
    orientation:
      video && video.width && video.height && video.height > video.width
        ? 'portrait'
        : 'landscape',
    howToPerform: strings(row.instructions),
    commonMistakes: strings(row.common_mistakes),
    musclesWorked: {
      primary: primary.map(item => item.name),
      secondary: secondary.map(item => item.name),
    },
    shortDescription: str(row.short_description),
    longDescription: str(row.long_description),
    benefits: strings(row.benefits),
    tags: strings(row.tags),
    movementPatterns: strings(row.patterns),
    trackingMetrics: strings(row.tracking_metrics),
    isUnilateral: row.is_unilateral === true,
    prEligible: row.pr_eligible === true,
    thumbKey: thumb?.key ?? null,
    posterKey: poster?.key ?? null,
    videoKey: video?.key ?? null,
    aliases: strings(row.aliases),
  };
}

export type CatalogRpc = (name: string, args: Record<string, unknown>) => Promise<unknown>;

async function supabaseRpc(name: string, args: Record<string, unknown>): Promise<unknown> {
  const client = getSupabaseClient() as unknown as {
    rpc: (rpc: string, params: object) => Promise<{ data: unknown; error: { message?: string; code?: string } | null }>;
  } | null;
  if (!client) {
    throw new CatalogError('unknown', 'Supabase no está configurado.');
  }
  const startedAt = Date.now();
  const { data, error } = await client.rpc(name, args);
  if (error) {
    throw new CatalogError(error.code === '42501' ? 'unauthorized' : 'offline', error.message);
  }
  catalogPerf.answer(name, startedAt, data);
  return data;
}

function expectOk(body: unknown): Record<string, unknown> {
  const record = asRecord(body);
  if (record?.ok === true) {
    return record;
  }
  const error = record?.error;
  throw new CatalogError(
    error === 'unauthorized' || error === 'exercise_not_found' || error === 'invalid_input'
      ? error
      : 'unknown',
  );
}

export function createCatalogService(rpc: CatalogRpc = supabaseRpc) {
  return {
    async catalogVersion(): Promise<CatalogVersion> {
      const record = expectOk(await rpc('catalog_version', {}));
      return { version: str(record.version) ?? '', exercises: num(record.exercises) ?? 0 };
    },

    async listExercises(query: ExerciseQuery): Promise<ExercisePage> {
      const record = expectOk(
        await rpc('list_exercises', {
          _muscle: query.muscle ?? null,
          _equipment: query.equipment ?? null,
          _pattern: query.pattern ?? null,
          _difficulty: query.difficulty ?? null,
          _q: query.q?.trim() ? query.q.trim() : null,
          _locale: query.locale,
          _cursor: query.cursor ?? null,
          _limit: Math.min(100, query.limit ?? 30),
          _muscles: query.muscles && query.muscles.length > 0 ? query.muscles.slice(0, 20) : null,
          _equipments:
            query.equipments && query.equipments.length > 0 ? query.equipments.slice(0, 10) : null,
        }),
      );
      const locale: CatalogLocale = record.locale === 'en' ? 'en' : query.locale;
      return {
        locale,
        items: Array.isArray(record.items)
          ? record.items.map(item => mapExerciseListItem(item, locale))
          : [],
        nextCursor: str(record.next_cursor),
      };
    },

    async getExercise(id: string, locale: CatalogLocale): Promise<LibraryExercise> {
      const record = expectOk(await rpc('get_exercise', { _id: id, _locale: locale }));
      return mapExerciseDetail(record.exercise);
    },
  };
}

export const catalogService = createCatalogService();
