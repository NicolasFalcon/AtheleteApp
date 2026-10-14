import { getSupabaseClient } from '@app/services/supabase/client';
import { mapDbExerciseRow, type LibraryExercise } from '@app/shared';

export type ExerciseLocale = 'es' | 'en';

type TranslationRow = {
  locale: string;
  name: string;
  short_description: string | null;
  long_description: string | null;
  instructions: string[] | null;
  common_mistakes: string[] | null;
  benefits: string[] | null;
  tags: string[] | null;
};

type NamedRelation = {
  slug: string;
  name_en: string;
  name_es: string;
};

type MediaRow = {
  kind: string;
  object_key: string;
  orientation: string | null;
  is_primary: boolean | null;
  sort_order: number | null;
};

type CatalogRow = {
  id: string;
  slug: string;
  difficulty: string | null;
  tracking_metrics: string[] | null;
  is_unilateral: boolean | null;
  pr_eligible: boolean | null;
  exercise_translations: TranslationRow[] | null;
  exercise_muscles:
    | Array<{ role: string; sort_order: number | null; muscles: NamedRelation | null }>
    | null;
  exercise_equipment:
    | Array<{ equipment: NamedRelation | null }>
    | null;
  exercise_movement_patterns:
    | Array<{ movement_patterns: NamedRelation | null }>
    | null;
  exercise_media: MediaRow[] | null;
};

const SELECT = `
  id,
  slug,
  difficulty,
  tracking_metrics,
  is_unilateral,
  pr_eligible,
  exercise_translations(locale,name,short_description,long_description,instructions,common_mistakes,benefits,tags),
  exercise_muscles(role,sort_order,muscles(slug,name_en,name_es)),
  exercise_equipment(equipment(slug,name_en,name_es)),
  exercise_movement_patterns(movement_patterns(slug,name_en,name_es)),
  exercise_media(kind,object_key,orientation,is_primary,sort_order)
`;

const PAGE_SIZE = 500;
const MEDIA_BATCH_SIZE = 100;

function client() {
  const value = getSupabaseClient();
  if (!value) {
    throw new Error('Supabase no está configurado.');
  }
  return value;
}

function localizedName(value: NamedRelation, locale: ExerciseLocale) {
  return locale === 'en' ? value.name_en : value.name_es || value.name_en;
}

function translationFor(row: CatalogRow, locale: ExerciseLocale) {
  const translations = row.exercise_translations || [];
  return (
    translations.find(item => item.locale === locale) ||
    translations.find(item => item.locale === 'en') ||
    translations[0]
  );
}

function primaryMedia(rows: MediaRow[], kind: 'poster' | 'video') {
  return rows
    .filter(item => item.kind === kind && item.object_key)
    .sort(
      (left, right) =>
        Number(Boolean(right.is_primary)) - Number(Boolean(left.is_primary)) ||
        (left.sort_order ?? 0) - (right.sort_order ?? 0),
    )[0];
}

function collectSignedUrls(
  value: unknown,
  result: Record<string, string>,
  contextualKey?: string,
) {
  if (Array.isArray(value)) {
    value.forEach(item => collectSignedUrls(item, result));
    return;
  }
  if (!value || typeof value !== 'object') {
    return;
  }

  const record = value as Record<string, unknown>;
  const key = record.object_key ?? record.objectKey ?? record.key;
  const url = record.signed_url ?? record.signedUrl ?? record.url;
  if (typeof key === 'string' && typeof url === 'string') {
    result[key] = url;
    return;
  }
  if (contextualKey && typeof url === 'string') {
    result[contextualKey] = url;
    return;
  }

  Object.entries(record).forEach(([entryKey, entryValue]) => {
    if (typeof entryValue === 'string' && /^https?:\/\//.test(entryValue)) {
      result[entryKey] = entryValue;
    } else if (typeof entryValue === 'object' && entryValue !== null) {
      collectSignedUrls(entryValue, result, entryKey);
    }
  });
}

export function parseExerciseMediaUrls(data: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  collectSignedUrls(data, result);
  return result;
}

async function signMediaUrls(objectKeys: string[]) {
  const uniqueKeys = [...new Set(objectKeys.filter(Boolean))];
  const batches = Array.from(
    { length: Math.ceil(uniqueKeys.length / MEDIA_BATCH_SIZE) },
    (_, index) =>
      uniqueKeys.slice(
        index * MEDIA_BATCH_SIZE,
        (index + 1) * MEDIA_BATCH_SIZE,
      ),
  );
  const results = await Promise.all(
    batches.map(async keys => {
      const { data, error } = await client().functions.invoke(
        'exercise-media-url',
        { body: { keys } },
      );
      if (error) {
        throw error;
      }
      return parseExerciseMediaUrls(data);
    }),
  );

  const signed = Object.assign({}, ...results) as Record<string, string>;
  const missing = uniqueKeys.filter(key => !signed[key]);
  if (missing.length > 0) {
    throw new Error(
      `exercise-media-url no devolvió ${missing.length} URL(s) firmada(s).`,
    );
  }
  return signed;
}

export function mapCatalogExercise(
  row: CatalogRow,
  signedUrls: Record<string, string>,
  locale: ExerciseLocale,
): LibraryExercise {
  const translation = translationFor(row, locale);
  const muscles = [...(row.exercise_muscles || [])].sort(
    (left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0),
  );
  const primary = muscles.filter(item => item.role === 'primary' && item.muscles);
  const secondary = muscles.filter(item => item.role === 'secondary' && item.muscles);
  const equipment = (row.exercise_equipment || [])
    .map(item => item.equipment)
    .filter((item): item is NamedRelation => Boolean(item));
  const patterns = (row.exercise_movement_patterns || [])
    .map(item => item.movement_patterns)
    .filter((item): item is NamedRelation => Boolean(item));
  const poster = primaryMedia(row.exercise_media || [], 'poster');
  const video = primaryMedia(row.exercise_media || [], 'video');

  return mapDbExerciseRow({
    id: row.id,
    slug: row.slug,
    name: translation?.name || row.slug,
    difficulty: row.difficulty || 'beginner',
    equipment: equipment.map(item => item.slug),
    primary_muscle_slug: primary[0]?.muscles?.slug,
    primary_muscles: primary.map(item => localizedName(item.muscles!, locale)),
    secondary_muscles: secondary.map(item => localizedName(item.muscles!, locale)),
    thumbnail_url: poster ? signedUrls[poster.object_key] || null : null,
    video_url: video ? signedUrls[video.object_key] || null : null,
    video_orientation: video?.orientation || null,
    how_to_steps: translation?.instructions || [],
    technique_cues: [],
    common_mistakes: translation?.common_mistakes || [],
    short_description: translation?.short_description || null,
    long_description: translation?.long_description || null,
    benefits: translation?.benefits || [],
    tags: translation?.tags || [],
    movement_patterns: patterns.map(item => localizedName(item, locale)),
    tracking_metrics: row.tracking_metrics || [],
    is_unilateral: row.is_unilateral,
    pr_eligible: row.pr_eligible,
  });
}

export async function fetchExerciseCatalog(
  locale: ExerciseLocale = 'es',
): Promise<LibraryExercise[]> {
  const rows: CatalogRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await (client().from('exercises') as any)
      .select(SELECT)
      .eq('status', 'active')
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      throw error;
    }
    const page = (data || []) as CatalogRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) {
      break;
    }
  }

  const objectKeys = rows.flatMap(row => {
    const media = row.exercise_media || [];
    return [primaryMedia(media, 'poster'), primaryMedia(media, 'video')]
      .filter((item): item is MediaRow => Boolean(item))
      .map(item => item.object_key);
  });
  const signedUrls = await signMediaUrls(objectKeys);

  return rows
    .map(row => mapCatalogExercise(row, signedUrls, locale))
    .sort((left, right) => left.name.localeCompare(right.name, locale));
}
